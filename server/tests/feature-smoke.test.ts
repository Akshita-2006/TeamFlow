import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import path from "node:path";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { Invite } from "../src/models/Invite.js";
import { Workspace } from "../src/models/Workspace.js";

let mongo: MongoMemoryServer;
const app = createApp();
process.env.NODE_ENV = "test";
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), ".mongodb-binaries");
process.env.MONGOMS_SYSTEM_BINARY ??= "C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe";
config.smtpHost = undefined;
config.smtpUser = undefined;
config.smtpPass = undefined;

async function register(email: string, username: string, name: string) {
  const response = await request(app).post("/api/auth/register").send({ email, username, name, password: "password123" });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, user: response.body.user as any };
}

async function getWorkspace(token: string) {
  const response = await request(app).get("/api/workspaces").set("Authorization", `Bearer ${token}`);
  expect(response.status).toBe(200);
  return response.body.data[0] as any;
}

async function notificationTypes(token: string) {
  const response = await request(app).get("/api/notifications").set("Authorization", `Bearer ${token}`);
  expect(response.status).toBe(200);
  return response.body.data.map((item: any) => item.type);
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe("TeamFlow feature smoke flow", () => {
  it("runs invite, role, project, task, comment and notification flow", async () => {
    const owner = await register("owner@example.com", "owner_user", "Owner");
    const member = await register("member@example.com", "member_user", "Member");
    const viewer = await register("viewer@example.com", "viewer_user", "Viewer");
    const workspace = await getWorkspace(owner.token);

    const addMember = await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: member.user.email, role: "MEMBER" });
    expect(addMember.status).toBe(201);
    expect(await notificationTypes(member.token)).toContain("WORKSPACE_JOINED");
    expect(await notificationTypes(owner.token)).toContain("MEMBER_ADDED");

    const addViewer = await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: viewer.user.email, role: "VIEWER" });
    expect(addViewer.status).toBe(201);
    expect(await notificationTypes(viewer.token)).toContain("WORKSPACE_JOINED");

    const updateViewerRole = await request(app)
      .patch(`/api/workspaces/${workspace._id}/members/${viewer.user.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ role: "VIEWER" });
    expect(updateViewerRole.status).toBe(200);
    expect(await notificationTypes(viewer.token)).toContain("WORKSPACE_ROLE_UPDATED");
    expect(await notificationTypes(owner.token)).toContain("MEMBER_ROLE_UPDATED");

    const inviteNew = await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: "newperson@example.com", role: "MEMBER" });
    expect(inviteNew.status).toBe(202);
    expect(inviteNew.body.devLink).toContain("/accept-invite?token=");
    const inviteToken = new URL(inviteNew.body.devLink).searchParams.get("token");
    expect(inviteToken).toBeTruthy();
    const invite = await Invite.findOne({ email: "newperson@example.com", status: "PENDING" });
    expect(invite).toBeTruthy();

    const inviteToCancel = await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: "cancelled@example.com", role: "MEMBER" });
    expect(inviteToCancel.status).toBe(202);
    const cancelledToken = new URL(inviteToCancel.body.devLink).searchParams.get("token");
    const cancelledInvite = await Invite.findOne({ email: "cancelled@example.com", status: "PENDING" });
    expect(cancelledInvite).toBeTruthy();
    const cancelInvite = await request(app)
      .delete(`/api/workspaces/${workspace._id}/invites/${cancelledInvite?._id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(cancelInvite.status).toBe(200);
    expect(await notificationTypes(owner.token)).toContain("INVITE_CANCELLED");

    const cancelledUser = await register("cancelled@example.com", "cancelled_user", "Cancelled User");
    const acceptCancelled = await request(app)
      .post("/api/workspaces/invites/accept")
      .set("Authorization", `Bearer ${cancelledUser.token}`)
      .send({ token: cancelledToken });
    expect(acceptCancelled.status).toBe(410);
    expect(acceptCancelled.body.error).toContain("cancelled");

    const viewerCreate = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${viewer.token}`)
      .send({ workspace: workspace._id, name: "Viewer should not create" });
    expect(viewerCreate.status).toBe(403);

    const projectResponse = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ workspace: workspace._id, name: "Launch plan", description: "Smoke test project" });
    expect(projectResponse.status).toBe(201);
    const project = projectResponse.body.data;

    const addProjectMember = await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id });
    expect(addProjectMember.status).toBe(201);

    const taskResponse = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ project: project._id, title: "Design landing page", assignee: member.user.id, labels: ["frontend"], estimatedEffort: 2 });
    expect(taskResponse.status).toBe(201);
    const task = taskResponse.body.data;

    expect(await notificationTypes(member.token)).toContain("TASK_ASSIGNED");

    const commentResponse = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ body: "Done with the first pass.", mentions: [owner.user.id] });
    expect(commentResponse.status).toBe(201);
    expect(await notificationTypes(owner.token)).toContain("COMMENT_MENTION");

    const directDone = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ status: "DONE" });
    expect(directDone.status).toBe(400);

    const submissionResponse = await request(app)
      .post(`/api/tasks/${task._id}/submissions`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ note: "First reviewed version.", files: [{ name: "landing-page.tsx", url: "https://example.com/landing-page.tsx", type: "code" }] });
    expect(submissionResponse.status).toBe(201);
    expect(submissionResponse.body.data.status).toBe("PENDING_REVIEW");
    expect(await notificationTypes(owner.token)).toContain("SUBMISSION_READY");

    const approveResponse = await request(app)
      .patch(`/api/tasks/${task._id}/submissions/${submissionResponse.body.data._id}/review`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "APPROVED", reviewNote: "Looks good." });
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data.status).toBe("APPROVED");
    expect(await notificationTypes(member.token)).toContain("SUBMISSION_APPROVED");

    const delivered = await request(app)
      .get(`/api/projects/${project._id}/submissions`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.some((item: any) => item.status === "APPROVED")).toBe(true);

    const unread = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${owner.token}`);
    expect(unread.status).toBe(200);
    expect(unread.body.data.count).toBeGreaterThan(0);

    const acceptedUser = await register("newperson@example.com", "new_person", "New Person");
    const accept = await request(app)
      .post("/api/workspaces/invites/accept")
      .set("Authorization", `Bearer ${acceptedUser.token}`)
      .send({ token: inviteToken });
    expect(accept.status).toBe(200);
    expect(await notificationTypes(acceptedUser.token)).toContain("WORKSPACE_JOINED");
    expect(await notificationTypes(owner.token)).toContain("INVITE_ACCEPTED");
    const pendingAfterAccept = await Invite.find({ workspace: workspace._id, status: "PENDING" });
    expect(pendingAfterAccept).toHaveLength(0);

    const storedWorkspace = await Workspace.findById(workspace._id);
    expect(storedWorkspace?.members.some((item: any) => item.user.toString() === owner.user.id && item.role === "OWNER")).toBe(true);
  }, 15000);
});
