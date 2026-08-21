import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const notificationLabel = (type: string) => {
  const labels: Record<string, string> = {
    TASK_ASSIGNED: "Task assigned",
    TASK_CREATED: "Task created",
    TASK_COMPLETED: "Task completed",
    TASK_UPDATED: "Task updated",
    COMMENT_ADDED: "New comment",
    COMMENT_MENTION: "Mention",
    SUBMISSION_READY: "Work submitted for review",
    SUBMISSION_APPROVED: "Submission approved",
    SUBMISSION_CHANGES_REQUESTED: "Changes requested",
    SUBMISSION_REJECTED: "Submission rejected",
    DEPENDENCY_READY: "Dependency update",
    INVITE_SENT: "Invite sent",
    INVITE_ACCEPTED: "Invite accepted",
    INVITE_CANCELLED: "Invite cancelled",
    WORKSPACE_JOINED: "Workspace joined",
    WORKSPACE_ROLE_UPDATED: "Role updated",
    MEMBER_ADDED: "Member added",
    MEMBER_ROLE_UPDATED: "Member role updated",
    MEMBER_REMOVED: "Member removed"
  };
  return labels[type] ?? type.toLowerCase().split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
};

export function Notifications() {
  const qc = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/notifications")).data.data, refetchInterval: 5000 });
  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  }
  return (
    <section className="space-y-4">
      <div><h2 className="page-title">Notifications</h2><p className="page-subtitle">Assignment and collaboration updates with read/unread state.</p></div>
      {(notifications.data ?? []).map((item: any) => (
        <article className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item._id}>
          <div><p className="font-medium">{item.message}</p><p className="text-sm text-slate-500">{notificationLabel(item.type)}</p></div>
          {!item.readAt && <button className="btn-primary w-full sm:w-auto" onClick={() => markRead(item._id)}>Mark read</button>}
        </article>
      ))}
      {(notifications.data ?? []).length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">No notifications yet.</p>}
    </section>
  );
}


