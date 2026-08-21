import React, { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Cloud,
  Code2,
  Crown,
  Eye,
  FileCheck2,
  FolderOpen,
  GitBranch,
  Link2,
  MessageSquare,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
} from "lucide-react";
import { api, socket } from "../lib/api";
import { useAuth } from "../store/auth";

const statuses = ["TODO", "IN PROGRESS", "IN REVIEW", "DONE"];
const projectStatuses = ["PLANNING", "ACTIVE", "ON HOLD", "COMPLETED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
const priorityLabel = (priority: string) =>
  priority[0] + priority.slice(1).toLowerCase();
const idOf = (value: any) => String(value?._id ?? value ?? "");
const submissionLabel = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

export function ProjectBoard() {
  const { projectId } = useParams();
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [selectedTask, setSelectedTask] = useState(null as any);
  const [uploading, setUploading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [selectedFileNames, setSelectedFileNames] = useState([] as string[]);
  const [reviewTarget, setReviewTarget] = useState(null as any);
  const [reviewDecision, setReviewDecision] = useState("");
  const detailsRef = React.useRef(null as HTMLElement | null);
  const auth = useAuth();
  const qc = useQueryClient();
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}`)).data.data.project,
  });
  const workspaceId = project.data?.workspace;
  const workspace = useQuery({
    enabled: !!workspaceId,
    queryKey: ["workspace", workspaceId],
    queryFn: async () =>
      (await api.get(`/workspaces/${workspaceId}`)).data.data,
  });
  const tasks = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () =>
      (await api.get(`/tasks?project=${projectId}`)).data.data,
  });
  const analysis = useQuery({
    queryKey: ["analysis", projectId],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/dependency-analysis`)).data.data,
  });
  const submissions = useQuery({
    queryKey: ["submissions", projectId],
    queryFn: async () =>
      (await api.get(`/projects/${projectId}/submissions`)).data.data,
  });
  const comments = useQuery({
    enabled: !!selectedTask,
    queryKey: ["comments", selectedTask?._id],
    queryFn: async () =>
      (await api.get(`/tasks/${selectedTask._id}/comments`)).data.data,
  });
  const taskSubmissions = useQuery({
    enabled: !!selectedTask,
    queryKey: ["task-submissions", selectedTask?._id],
    queryFn: async () =>
      (await api.get(`/tasks/${selectedTask._id}/submissions`)).data.data,
  });
  const visibleTasks = (tasks.data ?? []).filter((task: any) => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      String(task.labels ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesOwner = !filterOwner || idOf(task.assignee) === filterOwner;
    return matchesSearch && matchesOwner;
  });
  const projectMembers = project.data?.members ?? [];
  const otherProjectMembers = projectMembers.filter(
    (member: any) => idOf(member) !== idOf(auth.user?.id),
  );
  const projectMemberIds = new Set(
    projectMembers.map((member: any) => idOf(member)),
  );
  const workspaceMembers = workspace.data?.members ?? [];
  const availableMembers = workspaceMembers.filter(
    (member: any) => !projectMemberIds.has(idOf(member.user)),
  );
  const currentWorkspaceRole =
    workspace.data?.members?.find(
      (member: any) => idOf(member.user) === idOf(auth.user?.id),
    )?.role ?? "";
  const workspaceOwnerId = idOf(workspace.data?.owner);
  const projectOwnerId = idOf(project.data?.owner);
  const isProjectOwner = projectOwnerId === idOf(auth.user?.id);
  const canEditTaskDetails =
    ["OWNER", "ADMIN"].includes(currentWorkspaceRole) || isProjectOwner;
  const canManageProject = canEditTaskDetails || isProjectOwner;
  const canCreateTask =
    ["OWNER", "ADMIN", "MEMBER"].includes(currentWorkspaceRole) ||
    isProjectOwner;
  const canSelfApproveSubmission = canManageProject;
  const blockedTaskCount = analysis.data?.blockedCount ?? 0;
  const completedTaskCount = (tasks.data ?? []).filter(
    (task: any) => task.status === "DONE",
  ).length;
  const pendingReviewCount = (submissions.data ?? []).filter(
    (item: any) => item.status === "PENDING_REVIEW",
  ).length;
  const approvedSubmissionCount = (submissions.data ?? []).filter(
    (item: any) => item.status === "APPROVED",
  ).length;
  const changeRequestCount = (submissions.data ?? []).filter(
    (item: any) =>
      item.status === "CHANGES_REQUESTED" || item.status === "REJECTED",
  ).length;
  const deliveredFileCount = (submissions.data ?? [])
    .filter((item: any) => item.status === "APPROVED")
    .reduce((sum: number, item: any) => sum + (item.files?.length ?? 0), 0);
  const isViewer = currentWorkspaceRole === "VIEWER";
  const totalTaskCount = tasks.data?.length ?? 0;
  const completionPercent = totalTaskCount
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : 0;
  const projectDeadline = project.data?.deadline
    ? new Date(project.data.deadline)
    : null;
  const projectIsOverdue = Boolean(
    projectDeadline &&
    projectDeadline < new Date() &&
    project.data?.status !== "COMPLETED",
  );
  const deadlineText = projectDeadline
    ? projectDeadline.toLocaleDateString()
    : "No deadline";
  const topBottleneck = analysis.data?.bottlenecks?.[0];
  const taskTitleById = new Map(
    (tasks.data ?? []).map((task: any) => [task._id, task.title]),
  );
  const dependencyEdges = Object.entries(analysis.data?.blockedBy ?? {})
    .flatMap(([taskId, dependencyIds]: any) =>
      (dependencyIds ?? []).map((dependencyId: string) => ({
        from: taskTitleById.get(dependencyId) ?? "Dependency",
        to: taskTitleById.get(taskId) ?? "Task",
      })),
    )
    .slice(0, 5);
  const criticalPath = analysis.data?.criticalPath?.chain ?? [];

  const refreshProject = () => {
    qc.invalidateQueries({ queryKey: ["project", projectId] });
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["analysis", projectId] });
    qc.invalidateQueries({ queryKey: ["workload", projectId] });
    qc.invalidateQueries({ queryKey: ["submissions", projectId] });
    qc.invalidateQueries({ queryKey: ["task-submissions", selectedTask?._id] });
  };

  const createTask = useMutation({
    mutationFn: async (payload: any) =>
      (await api.post("/tasks", payload)).data.data,
    onSuccess: () => {
      setMessage("Task created and assigned.");
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(err.response?.data?.error ?? "Could not create task"),
  });

  const addDependency = useMutation({
    mutationFn: async ({
      taskId,
      dependencyId,
    }: {
      taskId: string;
      dependencyId: string;
    }) =>
      (await api.post(`/tasks/${taskId}/dependencies`, { dependencyId })).data
        .data,
    onSuccess: () => {
      setMessage("Dependency added. Blockers and bottlenecks recalculated.");
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(err.response?.data?.error ?? "Could not add dependency"),
  });

  const addComment = useMutation({
    mutationFn: async ({
      taskId,
      body,
      mentions,
    }: {
      taskId: string;
      body: string;
      mentions?: string[];
    }) =>
      (
        await api.post(`/tasks/${taskId}/comments`, {
          body,
          mentions: mentions ?? [],
        })
      ).data.data,
    onSuccess: () => {
      setMessage("Comment added.");
      qc.invalidateQueries({ queryKey: ["comments", selectedTask?._id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (err: any) =>
      setMessage(err.response?.data?.error ?? "Could not add comment"),
  });

  const createSubmission = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: any }) =>
      (await api.post(`/tasks/${taskId}/submissions`, payload)).data.data,
    onSuccess: (data: any) => {
      setSubmissionError("");
      setMessage(
        data.status === "APPROVED"
          ? "Work added to final delivery."
          : "Work submitted for review.",
      );
      refreshProject();
    },
    onError: (err: any) =>
      setSubmissionError(err.response?.data?.error ?? "Could not submit work"),
  });

  const reviewSubmission = useMutation({
    mutationFn: async ({
      taskId,
      submissionId,
      payload,
    }: {
      taskId: string;
      submissionId: string;
      payload: any;
    }) =>
      (
        await api.patch(
          `/tasks/${taskId}/submissions/${submissionId}/review`,
          payload,
        )
      ).data.data,
    onSuccess: () => {
      setMessage("Review decision saved.");
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(err.response?.data?.error ?? "Could not review submission"),
  });

  const addProjectMember = useMutation({
    mutationFn: async (userId: string) =>
      (await api.post(`/projects/${projectId}/members`, { userId })).data.data,
    onSuccess: () => {
      setMessage("Member added to this project.");
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(err.response?.data?.error ?? "Could not add project member"),
  });

  const removeProjectMember = useMutation({
    mutationFn: async (userId: string) =>
      (await api.delete(`/projects/${projectId}/members/${userId}`)).data.data,
    onSuccess: () => {
      setMessage(
        "Member removed from this project. Their tasks are now unassigned.",
      );
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(
        err.response?.data?.error ?? "Could not remove project member",
      ),
  });

  const transferProjectOwner = useMutation({
    mutationFn: async (userId: string) =>
      (await api.post(`/projects/${projectId}/transfer-owner`, { userId })).data
        .data,
    onSuccess: () => {
      setMessage("Project ownership transferred.");
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(
        err.response?.data?.error ?? "Could not transfer project ownership",
      ),
  });
  const updateProject = useMutation({
    mutationFn: async (payload: any) =>
      (await api.patch(`/projects/${projectId}`, payload)).data.data,
    onSuccess: () => {
      setMessage("Project settings updated.");
      refreshProject();
    },
    onError: (err: any) =>
      setMessage(err.response?.data?.error ?? "Could not update project"),
  });

  useEffect(() => {
    socket.connect();
    socket.emit("project:join", projectId);
    socket.on("task:updated", refreshProject);
    socket.on("task:created", refreshProject);
    socket.on("comment:added", () => {
      if (selectedTask)
        qc.invalidateQueries({ queryKey: ["comments", selectedTask._id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });
    socket.on("submission:created", refreshProject);
    socket.on("submission:reviewed", refreshProject);
    socket.on("task:deleted", refreshProject);
    return () => {
      socket.emit("project:leave", projectId);
      socket.off("task:updated");
      socket.off("task:created");
      socket.off("comment:added");
      socket.off("submission:created");
      socket.off("submission:reviewed");
      socket.off("task:deleted");
    };
  }, [projectId, qc, selectedTask]);

  useEffect(() => {
    if (selectedTask) {
      requestAnimationFrame(() =>
        detailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
  }, [selectedTask?._id]);

  async function move(task: any, status: string) {
    try {
      await api.patch(`/tasks/${task._id}`, { status });
      refreshProject();
    } catch (err: any) {
      setMessage(
        err.response?.data?.error ??
          "Only the assigned task owner can update progress.",
      );
    }
  }

  async function reassign(task: any, assignee: string) {
    try {
      const { data } = await api.patch(`/tasks/${task._id}`, {
        assignee: assignee || undefined,
      });
      if (selectedTask?._id === task._id) setSelectedTask(data.data);
      refreshProject();
    } catch (err: any) {
      setMessage(
        err.response?.data?.error ??
          "Only the workspace owner or admin can edit task details.",
      );
    }
  }

  async function deleteTask(task: any) {
    if (
      !window.confirm(
        `Delete "${task.title}"? This also removes its comments and dependency links.`,
      )
    )
      return;
    await api.delete(`/tasks/${task._id}`);
    if (selectedTask?._id === task._id) setSelectedTask(null);
    setMessage("Task deleted.");
    refreshProject();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    createTask.mutate({
      project: projectId,
      title: raw.title,
      description: raw.description || undefined,
      assignee: raw.assignee || undefined,
      status: raw.status || "TODO",
      priority: raw.priority || "MEDIUM",
      dueDate: raw.dueDate || undefined,
      estimatedEffort: Number(raw.estimatedEffort || 1),
      labels: String(raw.labels || "")
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    });
    event.currentTarget.reset();
  }

  async function updateTaskDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { data } = await api.patch(`/tasks/${selectedTask._id}`, {
        title: raw.title,
        description: raw.description || undefined,
        assignee: raw.assignee || undefined,
        priority: raw.priority || "MEDIUM",
        dueDate: raw.dueDate || undefined,
        estimatedEffort: Number(raw.estimatedEffort || 1),
        labels: String(raw.labels || "")
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        attachments: String(raw.attachments || "")
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean)
          .map((url) => ({ name: url.split("/").pop() || "Attachment", url })),
      });
      setSelectedTask(data.data);
      setMessage("Task details updated.");
      refreshProject();
    } catch (err: any) {
      setMessage(err.response?.data?.error ?? "Could not update task details.");
    }
  }
  function dependencySubmit(event: FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    const dependencyId = String(
      new FormData(event.currentTarget).get("dependencyId") ?? "",
    );
    if (!dependencyId) return;
    addDependency.mutate({ taskId, dependencyId });
    event.currentTarget.reset();
  }

  function commentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const body = String(
      new FormData(event.currentTarget).get("body") ?? "",
    ).trim();
    if (!body) return;
    const mention = String(
      new FormData(event.currentTarget).get("mention") ?? "",
    );
    addComment.mutate({
      taskId: selectedTask._id,
      body,
      mentions: mention ? [mention] : [],
    } as any);
    event.currentTarget.reset();
  }

  function submitWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    setSubmissionError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const pickedFiles = formData
      .getAll("cloudFiles")
      .filter((item): item is File => item instanceof File && item.size > 0);
    const manualFiles = String(formData.get("files") || "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => ({ name: url.split("/").pop() || "Submitted link", url }));
    if (pickedFiles.length === 0 && manualFiles.length === 0) {
      setSubmissionError(
        "Attach at least one file or paste one link before adding this work.",
      );
      return;
    }
    setUploading(true);
    Promise.all(pickedFiles.map(uploadFileToCloud))
      .then((cloudFiles) => {
        const files = [...cloudFiles, ...manualFiles];
        if (files.length === 0)
          throw new Error("Add at least one file or link before submitting.");
        createSubmission.mutate({
          taskId: selectedTask._id,
          payload: { note: formData.get("note") || undefined, files },
        });
        form.reset();
        setSelectedFileNames([]);
      })
      .catch((err: any) =>
        setSubmissionError(
          err.response?.data?.error ?? err.message ?? "Could not upload file.",
        ),
      )
      .finally(() => setUploading(false));
  }

  async function uploadFileToCloud(file: File) {
    const { data } = await api.post("/uploads/presign", {
      projectId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    });
    if (data.data.provider === "supabase") {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const response = await fetch(data.data.uploadUrl, {
        method: "PUT",
        body: form,
      });
      if (!response.ok)
        throw new Error(
          "Supabase upload failed. Check bucket name and storage permissions.",
        );
    } else {
      const response = await fetch(data.data.uploadUrl, {
        method: "PUT",
        body: file,
      });
      if (!response.ok)
        throw new Error("Cloud upload failed. Check storage settings.");
    }
    return { ...data.data.file, size: file.size };
  }

  function startReview(
    submission: any,
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
  ) {
    setReviewTarget(submission);
    setReviewDecision(decision);
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reviewNote = String(
      new FormData(event.currentTarget).get("reviewNote") ?? "",
    );
    reviewSubmission.mutate({
      taskId: idOf(reviewTarget.task),
      submissionId: reviewTarget._id,
      payload: { decision: reviewDecision, reviewNote },
    });
    setReviewTarget(null);
    setReviewDecision("");
  }

  async function openSubmittedFile(file: any) {
    try {
      if (file.key) {
        const { data } = await api.post("/uploads/signed-download", {
          projectId,
          key: file.key,
        });
        window.open(data.data.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (file.url) {
        window.open(file.url, "_blank", "noopener,noreferrer");
        return;
      }
      setMessage(
        "This file does not have an access link. Please upload it again.",
      );
    } catch (err: any) {
      setMessage(
        err.response?.data?.error ??
          "Could not open file. Please check storage access.",
      );
    }
  }

  function transferProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = String(
      new FormData(event.currentTarget).get("userId") ?? "",
    );
    if (!userId) return;
    const member = projectMembers.find(
      (item: any) => String(item._id ?? item) === userId,
    );
    const name = member?.name ?? member?.email ?? "this member";
    if (!window.confirm(`Transfer project ownership to ${name}?`)) return;
    transferProjectOwner.mutate(userId);
    event.currentTarget.reset();
  }

  function projectStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = String(
      new FormData(event.currentTarget).get("status") ?? "",
    );
    if (!status) return;
    updateProject.mutate({ status });
  }

  return (
    <section className="space-y-5">
      <div className="panel overflow-hidden p-0">
        <div className="border-b border-[#ded8c9] bg-[#fffdf8] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-[#d7edf2] text-[#365f66]">
                  <Radio size={14} /> Project hub
                </span>
                <span
                  className={`chip ${projectIsOverdue ? "bg-[#f4e8dc] text-[#765a40]" : "bg-[#edf0df] text-[#596344]"}`}
                >
                  {projectIsOverdue
                    ? "Overdue"
                    : statusLabel(project.data?.status ?? "ACTIVE")}
                </span>
                {isViewer && (
                  <span className="chip bg-[#edf0df] text-[#596344]">
                    <Eye size={14} /> Viewer mode
                  </span>
                )}
              </div>
              <h2 className="mt-3 break-words text-2xl font-black tracking-normal text-[#263333] sm:text-3xl">
                {project.data?.name ?? "Project"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f7b73]">
                Plan tasks, assign owners, collect work, review submissions,
                approve final files and track blockers from this project
                workspace.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
              <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3">
                <p className="text-[11px] font-bold uppercase text-[#6f7b73]">
                  Deadline
                </p>
                <p
                  className={`mt-1 text-lg font-black ${projectIsOverdue ? "text-[#765a40]" : "text-[#263333]"}`}
                >
                  {deadlineText}
                </p>
              </div>
              <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3">
                <p className="text-[11px] font-bold uppercase text-[#6f7b73]">
                  Owner
                </p>
                <p className="mt-1 truncate text-lg font-black text-[#263333]">
                  {project.data?.owner?.name ?? "Owner"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:p-5">
          <ProjectHubStat
            label="Tasks"
            value={totalTaskCount}
            helper={`${completionPercent}% complete`}
          />
          <ProjectHubStat
            label="Members"
            value={projectMembers.length}
            helper="project access"
          />
          <ProjectHubStat
            label="Pending review"
            value={pendingReviewCount}
            helper="needs decision"
          />
          <ProjectHubStat
            label="Delivered"
            value={approvedSubmissionCount}
            helper={`${deliveredFileCount} file/link(s)`}
          />
          <Link
            className="btn-primary h-full min-h-20 justify-center"
            to={`/app/projects/${projectId}/workload`}
          >
            <Users size={18} />
            Workload
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="text-[#6faebe]" />
                <h3 className="font-bold">Team</h3>
              </div>
              <p className="mt-1 text-sm text-[#6f7b73]">
                People who can receive work in this project.
              </p>
            </div>
            {canManageProject && (
              <Link className="btn-ghost shrink-0" to="/app/team">
                <UserPlus size={16} />
                Invite
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {projectMembers.slice(0, 5).map((member: any) => {
              const memberId = String(member._id ?? member);
              const isWorkspaceOwner = memberId === workspaceOwnerId;
              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#fbf7ee] p-3"
                  key={memberId}
                >
                  <Link
                    className="min-w-0"
                    to={`/app/workspaces/${workspaceId}/members/${memberId}`}
                  >
                    <p className="truncate font-bold text-[#263333]">
                      {member.name ?? member.email ?? member}
                    </p>
                    <p className="truncate text-xs text-[#6f7b73]">
                      {isWorkspaceOwner
                        ? "Workspace owner"
                        : (member.email ?? "Project member")}
                    </p>
                  </Link>
                  {!isWorkspaceOwner && canManageProject && (
                    <button
                      className="rounded-md p-2 text-[#765a40] hover:bg-[#f4e8dc]"
                      title="Remove from project"
                      type="button"
                      onClick={() => removeProjectMember.mutate(memberId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
            {projectMembers.length === 0 && (
              <p className="rounded-lg border border-dashed border-[#ded8c9] bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">
                Add members before assigning tasks.
              </p>
            )}
          </div>
          {canManageProject && availableMembers.length > 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-[#ded8c9] bg-[#fffdf8] p-3">
              <p className="mb-2 text-xs font-bold uppercase text-[#6f7b73]">
                Add from workspace
              </p>
              <div className="grid gap-2">
                {availableMembers.slice(0, 3).map((member: any) => {
                  const userId = member.user?._id ?? member.user;
                  return (
                    <button
                      className="flex items-center justify-between gap-2 rounded-md bg-[#fbf7ee] px-3 py-2 text-left text-sm hover:bg-[#eef8fa]"
                      key={userId}
                      type="button"
                      onClick={() => addProjectMember.mutate(userId)}
                    >
                      <span className="truncate font-bold">
                        {member.user?.name ?? member.user?.email ?? userId}
                      </span>
                      <Plus className="shrink-0 text-[#507f8a]" size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="text-[#6faebe]" />
                <h3 className="font-bold">Review queue</h3>
              </div>
              <p className="mt-1 text-sm text-[#6f7b73]">
                Submitted work waiting for approval.
              </p>
            </div>
            <span className="chip shrink-0 bg-[#d7edf2] text-[#365f66]">
              {pendingReviewCount}
            </span>
          </div>
          <div className="space-y-2">
            {(submissions.data ?? [])
              .filter((item: any) => item.status === "PENDING_REVIEW")
              .slice(0, 3)
              .map((item: any) => (
                <div className="rounded-lg bg-[#fbf7ee] p-3" key={item._id}>
                  <p className="truncate font-bold text-[#263333]">
                    {item.task?.title ?? "Submitted task"} v{item.version}
                  </p>
                  <p className="mt-1 text-xs text-[#6f7b73]">
                    {item.submitter?.name ?? "Member"} ·{" "}
                    {item.files?.length ?? 0} file/link(s)
                  </p>
                  {canManageProject && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        className="btn-primary px-2 py-2 text-xs"
                        type="button"
                        onClick={() => startReview(item, "APPROVED")}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-ghost px-2 py-2 text-xs"
                        type="button"
                        onClick={() => startReview(item, "CHANGES_REQUESTED")}
                      >
                        Changes
                      </button>
                      <button
                        className="rounded-md border border-rose-200 px-2 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        type="button"
                        onClick={() => startReview(item, "REJECTED")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            {pendingReviewCount === 0 && (
              <p className="rounded-lg border border-dashed border-[#ded8c9] bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">
                No work is waiting for review.
              </p>
            )}
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="text-[#b9906a]" />
                <h3 className="font-bold">Blocker health</h3>
              </div>
              <p className="mt-1 text-sm text-[#6f7b73]">
                Dependency status for this project.
              </p>
            </div>
            <span className="chip shrink-0 bg-[#edf0df] text-[#596344]">
              {blockedTaskCount} blocked
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Metric
              icon={<AlertTriangle size={18} />}
              label="Blocked"
              value={blockedTaskCount}
              tone="warm"
            />
            <Metric
              icon={<CheckCircle2 size={18} />}
              label="Completed"
              value={completedTaskCount}
              tone="cool"
            />
            <Metric
              icon={<GitBranch size={18} />}
              label="Bottleneck"
              value={topBottleneck?.title ?? "None"}
              tone="neutral"
            />
          </div>
          <DependencyGraph chain={criticalPath} edges={dependencyEdges} />
        </section>
      </div>

      <DeliverablesHub
        submissions={submissions.data ?? []}
        pendingCount={pendingReviewCount}
        approvedCount={approvedSubmissionCount}
        changeCount={changeRequestCount}
        fileCount={deliveredFileCount}
        onOpenFile={openSubmittedFile}
      />

      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="text-[#6faebe]" />
          <h3 className="font-bold">Project settings</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Crown className="text-[#b9906a]" size={18} />
              <h4 className="font-bold">Project owner</h4>
            </div>
            <p className="text-sm text-[#6f7b73]">
              {project.data?.owner?.name ?? "Project owner"} controls
              project-level ownership. Workspace owner/admin can still manage
              workspace-level rules.
            </p>
          </div>
          <form
            className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4"
            onSubmit={projectStatusSubmit}
          >
            <label className="mb-2 block text-sm font-bold">
              Project status
            </label>
            <select
              className="input"
              name="status"
              defaultValue={project.data?.status ?? "ACTIVE"}
              disabled={!canManageProject}
            >
              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <button className="btn-primary mt-3" disabled={!canManageProject}>
              Save status
            </button>
            <p className="mt-2 text-xs leading-5 text-[#6f7b73]">
              Deadline passing shows overdue. Mark completed only when final
              delivery is accepted.
            </p>
          </form>
          <form
            className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4"
            onSubmit={transferProjectSubmit}
          >
            <label className="mb-2 block text-sm font-bold">
              Transfer project owner
            </label>
            <select
              className="input"
              name="userId"
              defaultValue=""
              disabled={!canManageProject}
            >
              <option value="">Select project member</option>
              {projectMembers
                .filter(
                  (member: any) =>
                    String(member._id ?? member) !== projectOwnerId,
                )
                .map((member: any) => (
                  <option
                    key={member._id ?? member}
                    value={member._id ?? member}
                  >
                    {member.name ?? member.email ?? member}
                  </option>
                ))}
            </select>
            <button className="btn-dark mt-3" disabled={!canManageProject}>
              Transfer project owner
            </button>
            {!canManageProject && (
              <p className="mt-2 text-xs text-[#6f7b73]">
                Only project owner or workspace owner/admin can transfer project
                ownership.
              </p>
            )}
          </form>
        </div>
      </div>

      {canCreateTask ? (
        <form onSubmit={submit} className="panel p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="text-[#6faebe]" />
            <h3 className="font-bold">Add task and assign owner</h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold">Task title</label>
              <input
                className="input"
                name="title"
                placeholder="Build API integration"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Assign to</label>
              <select className="input" name="assignee" defaultValue="">
                <option value="">Unassigned</option>
                {projectMembers.map((member: any) => (
                  <option
                    key={member._id ?? member}
                    value={member._id ?? member}
                  >
                    {member.name ?? member.email ?? member}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Priority</label>
              <select className="input" name="priority" defaultValue="MEDIUM">
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Status</label>
              <select className="input" name="status" defaultValue="TODO">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Due date</label>
              <input className="input" name="dueDate" type="date" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">
                Effort hours
              </label>
              <input
                className="input"
                name="estimatedEffort"
                type="number"
                min="0"
                defaultValue="1"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Labels</label>
              <input
                className="input"
                name="labels"
                placeholder="frontend, api"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="mb-2 block text-sm font-bold">
                Description
              </label>
              <textarea
                className="input min-h-20"
                name="description"
                placeholder="What needs to be done?"
              />
            </div>
          </div>
          <button className="btn-primary mt-4 w-full sm:w-auto">
            Create task
          </button>
          {message && (
            <p className="mt-4 rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">
              {message}
            </p>
          )}
        </form>
      ) : (
        <div className="panel p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Plus className="text-[#6faebe]" />
            <h3 className="font-bold">Task creation locked</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6f7b73]">
            Viewers can read the project board, comments, blockers and workload,
            but cannot create or edit tasks.
          </p>
          {message && (
            <p className="mt-4 rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">
              {message}
            </p>
          )}
        </div>
      )}

      <div className="panel grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto]">
        <input
          className="input"
          value={search}
          onChange={(event: any) => setSearch(event.target.value)}
          placeholder="Search tasks or labels"
        />
        <select
          className="input"
          value={filterOwner}
          onChange={(event: any) => setFilterOwner(event.target.value)}
        >
          <option value="">All owners</option>
          {projectMembers.map((member: any) => (
            <option key={member._id ?? member} value={member._id ?? member}>
              {member.name ?? member.email ?? member}
            </option>
          ))}
        </select>
        <button
          className="btn-ghost w-full md:w-auto"
          type="button"
          onClick={() => {
            setSearch("");
            setFilterOwner("");
          }}
        >
          Clear
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => (
          <div key={status} className="panel min-h-96 p-3">
            <h3 className="mb-3 rounded-md bg-[#fbf7ee] px-3 py-2 text-sm font-black text-[#263333]">
              {statusLabel(status)}
            </h3>
            <div className="space-y-3">
              {visibleTasks
                .filter((task: any) => task.status === status)
                .map((task: any) => {
                  const blockers = analysis.data?.blockedBy?.[task._id] ?? [];
                  const isTaskOwner =
                    idOf(task.assignee) === idOf(auth.user?.id);
                  const isBlocked = blockers.length > 0;
                  const candidates = visibleTasks.filter(
                    (candidate: any) => candidate._id !== task._id,
                  );
                  return (
                    <article
                      key={task._id}
                      className="rounded-lg border border-[#ded8c9] bg-[#fffdf8] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold">{task.title}</h4>
                        {blockers.length > 0 && (
                          <GitBranch className="text-[#c7a180]" size={18} />
                        )}
                      </div>
                      <p className="mt-2 text-sm text-[#6f7b73]">
                        Owner: <b>{task.assignee?.name ?? "Unassigned"}</b>
                      </p>
                      <p className="mt-1 text-sm text-[#6f7b73]">
                        {priorityLabel(task.priority)} priority ·{" "}
                        {task.estimatedEffort}h
                      </p>
                      {blockers.length > 0 && (
                        <p className="mt-3 rounded-md bg-[#f4e8dc] px-2 py-1 text-xs font-bold text-[#765a40]">
                          Blocked by {blockers.length} unfinished task(s).
                          Progress is locked until these are Done.
                        </p>
                      )}
                      <select
                        className="input mt-3"
                        value={task.status}
                        disabled={!isTaskOwner || isBlocked}
                        title={
                          !isTaskOwner
                            ? "Only the assigned task owner can update progress"
                            : isBlocked
                              ? "Complete dependencies before moving this task"
                              : "Update progress"
                        }
                        onChange={(e: any) => move(task, e.target.value)}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                      <label className="mt-3 block text-xs font-bold text-[#6f7b73]">
                        Assign owner
                      </label>
                      {!isTaskOwner && (
                        <p className="mt-2 text-xs text-[#6f7b73]">
                          Progress can be changed by the assigned owner only.
                        </p>
                      )}
                      <select
                        className="input mt-2"
                        value={task.assignee?._id ?? ""}
                        disabled={!canEditTaskDetails}
                        title={
                          canEditTaskDetails
                            ? "Change task owner"
                            : "Only workspace owner or admin can edit task details"
                        }
                        onChange={(e: any) => reassign(task, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {projectMembers.map((member: any) => (
                          <option
                            key={member._id ?? member}
                            value={member._id ?? member}
                          >
                            {member.name ?? member.email ?? member}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                        <button
                          className="btn-ghost w-full"
                          type="button"
                          onClick={() => setSelectedTask(task)}
                        >
                          <MessageSquare size={16} />
                          Details
                        </button>
                        {canEditTaskDetails && (
                          <button
                            className="rounded-md border border-[#ded8c9] p-3 text-[#765a40] hover:bg-[#f4e8dc]"
                            title="Delete task"
                            type="button"
                            onClick={() => deleteTask(task)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {canEditTaskDetails && task.status !== "DONE" ? (
                        <form
                          className="mt-3 rounded-md bg-[#fbf7ee] p-2"
                          onSubmit={(event: any) =>
                            dependencySubmit(event, task._id)
                          }
                        >
                          <label className="mb-2 flex items-center gap-2 text-xs font-bold text-[#6f7b73]">
                            <Link2 size={14} />
                            Depends on
                          </label>
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <select
                              className="input"
                              name="dependencyId"
                              defaultValue=""
                            >
                              <option value="">Select task</option>
                              {candidates
                                .filter(
                                  (candidate: any) =>
                                    candidate.status !== "DONE",
                                )
                                .map((candidate: any) => (
                                  <option
                                    key={candidate._id}
                                    value={candidate._id}
                                  >
                                    {candidate.title}
                                  </option>
                                ))}
                            </select>
                            <button className="btn-ghost" type="submit">
                              Add
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-3 rounded-md bg-[#edf0df] px-3 py-2 text-xs font-bold text-[#596344]">
                          {task.status === "DONE"
                            ? "Completed task. Dependency setup is closed."
                            : "Only managers can edit dependencies."}
                        </p>
                      )}
                    </article>
                  );
                })}
              {visibleTasks.filter((task: any) => task.status === status)
                .length === 0 && (
                <p className="rounded-lg border border-dashed border-[#ded8c9] bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">
                  No tasks here yet.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <section className="panel p-5 scroll-mt-24" ref={detailsRef}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">{selectedTask.title}</h3>
              <p className="mt-1 text-sm text-[#6f7b73]">
                {selectedTask.description || "No description added."}
              </p>
              <p className="mt-2 text-sm text-[#6f7b73]">
                Owner: <b>{selectedTask.assignee?.name ?? "Unassigned"}</b> ·{" "}
                {selectedTask.priority} · {selectedTask.estimatedEffort}h
              </p>
            </div>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setSelectedTask(null)}
            >
              Close
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4">
                <h4 className="mb-3 font-bold">Comments</h4>
                <div className="space-y-3">
                  {(comments.data ?? []).map((comment: any) => (
                    <div
                      className="rounded-md bg-[#fffdf8] p-3"
                      key={comment._id}
                    >
                      <p className="text-sm text-[#263333]">{comment.body}</p>
                      <p className="mt-1 text-xs text-[#6f7b73]">
                        {comment.author?.name ?? "User"}
                      </p>
                    </div>
                  ))}
                  {(comments.data ?? []).length === 0 && (
                    <p className="text-sm text-[#6f7b73]">No comments yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4">
                <h4 className="mb-3 flex items-center gap-2 font-bold">
                  <Code2 size={18} />
                  Files, versions and reviews
                </h4>
                <div className="space-y-3">
                  {(taskSubmissions.data ?? []).map((item: any) => (
                    <div className="rounded-md bg-[#fffdf8] p-3" key={item._id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold">
                            Version {item.version} ·{" "}
                            {submissionLabel(item.status)}
                          </p>
                          <p className="text-xs text-[#6f7b73]">
                            {item.note || "No submission note."}
                          </p>
                        </div>
                        {canManageProject &&
                          item.status === "PENDING_REVIEW" && (
                            <div className="grid gap-2 sm:grid-cols-3">
                              <button
                                className="btn-primary"
                                type="button"
                                onClick={() => startReview(item, "APPROVED")}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-ghost"
                                type="button"
                                onClick={() =>
                                  startReview(item, "CHANGES_REQUESTED")
                                }
                              >
                                Changes
                              </button>
                              <button
                                className="rounded-md border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700"
                                type="button"
                                onClick={() => startReview(item, "REJECTED")}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(item.files ?? []).map((file: any, index: number) => (
                          <button
                            className="rounded-md border border-[#ded8c9] bg-[#fbf7ee] p-3 text-left text-sm font-bold text-[#507f8a] hover:bg-[#eef8fa]"
                            type="button"
                            onClick={() => openSubmittedFile(file)}
                            key={`${file.key ?? file.url}-${index}`}
                          >
                            {file.name}
                          </button>
                        ))}
                      </div>
                      {item.reviewNote && (
                        <p className="mt-3 rounded-md bg-[#edf0df] p-2 text-xs text-[#596344]">
                          Review note: {item.reviewNote}
                        </p>
                      )}
                    </div>
                  ))}
                  {(taskSubmissions.data ?? []).length === 0 && (
                    <p className="text-sm text-[#6f7b73]">
                      Submitted versions will appear here.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <form
              className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4"
              onSubmit={commentSubmit}
            >
              <label className="mb-2 block text-sm font-bold">
                Add comment
              </label>
              <textarea
                className="input min-h-28"
                name="body"
                placeholder="Write an update or question..."
                required
              />
              <label className="mb-2 mt-3 block text-sm font-bold">
                Notify teammate
              </label>
              <select className="input" name="mention" defaultValue="">
                <option value="">No teammate</option>
                {otherProjectMembers.map((member: any) => (
                  <option
                    key={member._id ?? member}
                    value={member._id ?? member}
                  >
                    @{member.name ?? member.email ?? member}
                  </option>
                ))}
              </select>
              {otherProjectMembers.length === 0 && (
                <p className="mt-2 text-xs text-[#6f7b73]">
                  No other project member is available to notify.
                </p>
              )}
              <button className="btn-primary mt-3">Post comment</button>
            </form>
          </div>
          {idOf(selectedTask.assignee) === idOf(auth.user?.id) &&
            selectedTask.status !== "DONE" && (
              <form
                className="mt-4 rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4"
                onSubmit={submitWork}
              >
                <h4 className="mb-3 font-bold">
                  {canSelfApproveSubmission
                    ? "Add completed work"
                    : "Submit work for review"}
                </h4>
                <label className="mb-2 block text-sm font-bold">
                  Submission note
                </label>
                <textarea
                  className="input min-h-20"
                  name="note"
                  placeholder="What did you finish? Mention links, test notes, or files."
                />
                <label className="mb-2 mt-3 block text-sm font-bold">
                  Upload files
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#b9cfca] bg-[#fffdf8] p-5 text-center transition hover:border-[#6faebe] hover:bg-[#eef8fa]">
                  <UploadCloud className="mb-2 text-[#507f8a]" size={28} />
                  <span className="font-bold text-[#263333]">
                    Choose files to attach
                  </span>
                  <span className="mt-1 text-xs text-[#6f7b73]">
                    Code, PDFs, docs, screenshots or zip files
                  </span>
                  <input
                    className="sr-only"
                    name="cloudFiles"
                    type="file"
                    multiple
                    onChange={(event: any) =>
                      setSelectedFileNames(
                        Array.from(event.target.files ?? []).map(
                          (file: any) => file.name,
                        ),
                      )
                    }
                  />
                </label>
                {selectedFileNames.length > 0 && (
                  <div className="mt-2 rounded-md bg-[#fffdf8] p-2 text-xs text-[#6f7b73]">
                    {selectedFileNames.map((name: string) => (
                      <p className="truncate" key={name}>
                        {name}
                      </p>
                    ))}
                  </div>
                )}
                <label className="mb-2 mt-3 block text-sm font-bold">
                  File or code links
                </label>
                <input
                  className="input"
                  name="files"
                  placeholder="Optional: paste links, comma separated"
                />
                {submissionError && (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
                    {submissionError}
                  </p>
                )}
                <button className="btn-primary mt-3" disabled={uploading}>
                  <Cloud size={16} />
                  {uploading
                    ? "Uploading..."
                    : canSelfApproveSubmission
                      ? "Add to delivery"
                      : "Submit for review"}
                </button>
              </form>
            )}
        </section>
      )}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#263333]/40 p-4">
          <form
            className="w-full max-w-lg rounded-xl border border-[#ded8c9] bg-[#fffdf8] p-5 shadow-xl"
            onSubmit={submitReview}
          >
            <h3 className="text-xl font-black text-[#263333]">
              {reviewDecision === "APPROVED"
                ? "Approve submission"
                : reviewDecision === "CHANGES_REQUESTED"
                  ? "Request changes"
                  : "Reject submission"}
            </h3>
            <p className="mt-2 text-sm text-[#6f7b73]">
              {reviewTarget.task?.title ??
                selectedTask?.title ??
                "Submitted work"}{" "}
              · version {reviewTarget.version}
            </p>
            <label className="mb-2 mt-4 block text-sm font-bold">
              Review note
            </label>
            <textarea
              className="input min-h-28"
              name="reviewNote"
              placeholder={
                reviewDecision === "APPROVED"
                  ? "Optional approval note"
                  : "Tell the member what needs to change"
              }
              required={reviewDecision !== "APPROVED"}
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button className="btn-primary" type="submit">
                Save decision
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  setReviewTarget(null);
                  setReviewDecision("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function DeliverablesHub({
  submissions,
  pendingCount,
  approvedCount,
  changeCount,
  fileCount,
  onOpenFile,
}: {
  submissions: any[];
  pendingCount: number;
  approvedCount: number;
  changeCount: number;
  fileCount: number;
  onOpenFile: (file: any) => void;
}) {
  const buckets = [
    {
      title: "Drafts needing changes",
      icon: <Archive size={18} />,
      items: submissions.filter((item) =>
        ["CHANGES_REQUESTED", "REJECTED"].includes(item.status),
      ),
      helper: "Returned work that needs another version.",
    },
    {
      title: "In review",
      icon: <FileCheck2 size={18} />,
      items: submissions.filter((item) => item.status === "PENDING_REVIEW"),
      helper: "Submitted work waiting for a decision.",
    },
    {
      title: "Approved delivery",
      icon: <ShieldCheck size={18} />,
      items: submissions.filter((item) => item.status === "APPROVED"),
      helper: "Final versions that viewers can inspect.",
    },
  ];
  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-[#6faebe]" />
            <h3 className="font-bold">Deliverables hub</h3>
          </div>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[#6f7b73]">
            Track submitted versions here. Approved files become the project
            delivery set; returned work stays separate until it is fixed and
            submitted again.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
          <MiniStat label="Reviews" value={pendingCount} />
          <MiniStat label="Approved" value={approvedCount} />
          <MiniStat label="Files" value={fileCount} />
          <MiniStat label="Returned" value={changeCount} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {buckets.map((bucket) => (
          <div
            className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4"
            key={bucket.title}
          >
            <div className="mb-3 flex items-start gap-2">
              <span className="rounded-md bg-[#fffdf8] p-2 text-[#507f8a]">
                {bucket.icon}
              </span>
              <div>
                <h4 className="font-black text-[#263333]">{bucket.title}</h4>
                <p className="text-xs leading-5 text-[#6f7b73]">
                  {bucket.helper}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {bucket.items.slice(0, 4).map((item: any) => (
                <article className="rounded-md bg-[#fffdf8] p-3" key={item._id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#263333]">
                        {item.task?.title ?? "Submitted work"}
                      </p>
                      <p className="mt-1 text-xs text-[#6f7b73]">
                        Version {item.version} by{" "}
                        {item.submitter?.name ?? "Member"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#edf0df] px-2 py-1 text-[11px] font-bold text-[#596344]">
                      {submissionLabel(item.status)}
                    </span>
                  </div>
                  {item.files?.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      {item.files
                        .slice(0, 2)
                        .map((file: any, index: number) => (
                          <button
                            className="truncate rounded-md border border-[#ded8c9] bg-[#fbf7ee] px-3 py-2 text-left text-xs font-bold text-[#507f8a] hover:bg-[#eef8fa]"
                            type="button"
                            onClick={() => onOpenFile(file)}
                            key={`${file.key ?? file.url}-${index}`}
                          >
                            {file.name}
                          </button>
                        ))}
                    </div>
                  )}
                </article>
              ))}
              {bucket.items.length === 0 && (
                <p className="rounded-md border border-dashed border-[#ded8c9] bg-[#fffdf8] p-3 text-sm text-[#6f7b73]">
                  Nothing here yet.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "warm" | "cool" | "neutral";
}) {
  const toneClass =
    tone === "warm"
      ? "bg-[#f4e8dc] text-[#765a40]"
      : tone === "cool"
        ? "bg-[#d7edf2] text-[#365f66]"
        : "bg-[#edf0df] text-[#596344]";
  return (
    <div className="rounded-lg border border-[#ded8c9] bg-[#fffdf8] p-3">
      <div className={`mb-3 inline-flex rounded-md p-2 ${toneClass}`}>
        {icon}
      </div>
      <p className="text-xs font-bold uppercase text-[#6f7b73]">{label}</p>
      <p className="mt-1 break-words text-lg font-black text-[#263333]">
        {value}
      </p>
    </div>
  );
}

function ProjectHubStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3">
      <p className="text-[11px] font-bold uppercase text-[#6f7b73]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#263333]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#6f7b73]">{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3">
      <p className="text-[11px] font-bold uppercase text-[#6f7b73]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#263333]">{value}</p>
    </div>
  );
}

function DependencyGraph({
  chain,
  edges,
}: {
  chain: string[];
  edges: { from: string; to: string }[];
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3">
      <p className="text-sm font-bold text-[#263333]">Dependency graph</p>
      <p className="mt-1 text-xs leading-5 text-[#6f7b73]">
        Shows which tasks are waiting on other tasks before they can move
        forward.
      </p>
      {chain.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chain.map((name, index) => (
            <span
              className="inline-flex items-center gap-2"
              key={`${name}-${index}`}
            >
              <span className="rounded-md bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[#263333]">
                {name}
              </span>
              {index < chain.length - 1 && (
                <span className="text-[#b9906a]">→</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-[#fffdf8] p-3 text-sm text-[#6f7b73]">
          Add dependencies to draw a path.
        </p>
      )}
      {edges.length > 0 && (
        <div className="mt-3 space-y-2">
          {edges.map((edge, index) => (
            <p
              className="rounded-md bg-[#fffdf8] px-3 py-2 text-xs text-[#6f7b73]"
              key={`${edge.from}-${edge.to}-${index}`}
            >
              <b>{edge.from}</b> blocks <b>{edge.to}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
