import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2 } from "lucide-react";
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
      <div><h2 className="page-title">Notifications</h2><p className="page-subtitle">Mentions, assignments, invites and review updates for your current work.</p></div>
      {(notifications.data ?? []).map((item: any) => (
        <article className={`panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${item.readAt ? "opacity-75" : "border-[#9fcbd6]"}`} key={item._id}>
          <div className="flex min-w-0 gap-3">
            <span className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg ${item.readAt ? "bg-[#edf0df] text-[#596344]" : "bg-[#d7edf2] text-[#365f66]"}`}>
              {item.readAt ? <CheckCircle2 size={18} /> : <Bell size={18} />}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[#263333]">{item.message}</p>
              <p className="mt-1 text-sm text-[#6f7b73]">
                {notificationLabel(item.type)}
                {item.project?.name ? ` · ${item.project.name}` : ""}
                {item.task?.title ? ` · ${item.task.title}` : ""}
              </p>
            </div>
          </div>
          {!item.readAt && <button className="btn-primary w-full sm:w-auto" onClick={() => markRead(item._id)}>Mark read</button>}
        </article>
      ))}
      {(notifications.data ?? []).length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">No notifications yet.</p>}
    </section>
  );
}


