import { Workspace, type WorkspaceRole } from "../models/Workspace.js";
import { Project } from "../models/Project.js";
import { AppError } from "../utils/errors.js";

const rank: Record<WorkspaceRole, number> = { VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4 };

export async function requireWorkspaceRole(userId: string, workspaceId: string, allowed: WorkspaceRole[]) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new AppError(404, "Workspace not found");
  const member = workspace.members.find((m) => m.user.toString() === userId);
  if (!member) throw new AppError(403, "You do not have access to this workspace");
  const permitted = allowed.some((role) => rank[member.role] >= rank[role]);
  if (!permitted) throw new AppError(403, "Insufficient workspace permissions");
  return { workspace, role: member.role };
}
export async function requireProjectAccess(userId: string, projectOrId: any, allowed: WorkspaceRole[]) {
  const project = typeof projectOrId === "string" ? await Project.findById(projectOrId) : projectOrId;
  if (!project) throw new AppError(404, "Project not found");
  const { workspace, role } = await requireWorkspaceRole(userId, project.workspace.toString(), allowed);
  if (rank[role] >= rank.ADMIN) return { project, workspace, role };
  if (project.owner?.toString() === userId) return { project, workspace, role: "ADMIN" as WorkspaceRole };
  const isProjectMember = project.members.some((member: any) => {
    const id = member?._id ?? member;
    return id.toString() === userId;
  });
  if (!isProjectMember) throw new AppError(403, "You are not a member of this project");
  return { project, workspace, role };
}

