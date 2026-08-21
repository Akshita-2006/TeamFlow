import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Filter, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

const actionText = (action: string) => ({
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  TASK_DELETED: "Task deleted",
  COMMENT_ADDED: "Comment added",
  DEPENDENCY_ADDED: "Dependency added",
  DEPENDENCY_REMOVED: "Dependency removed",
  SUBMISSION_CREATED: "Work submitted",
  SUBMISSION_APPROVED: "Submission approved",
  SUBMISSION_CHANGES_REQUESTED: "Changes requested",
  SUBMISSION_REJECTED: "Submission rejected",
  PROJECT_CREATED: "Project created",
  PROJECT_UPDATED: "Project updated"
}[action] ?? action.toLowerCase().split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "));

type AuditFilters = {
  project: string;
  actor: string;
  from: string;
  to: string;
};

const emptyFilters: AuditFilters = { project: "", actor: "", from: "", to: "" };

export function AuditLog() {
  const { workspace } = useActiveWorkspace();
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const members = workspace?.members ?? [];
  const projects = useQuery({ enabled: !!workspace, queryKey: ["projects", workspace?._id], queryFn: async () => (await api.get(`/projects?workspace=${workspace._id}`)).data.data });
  const activity = useQuery({
    enabled: !!workspace,
    queryKey: ["workspace-activity", workspace?._id, appliedFilters],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => value));
      return (await api.get(`/workspaces/${workspace._id}/activity`, { params })).data.data;
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(Object.fromEntries(new FormData(event.currentTarget)) as AuditFilters);
  }

  function updateFilter(key: keyof typeof draftFilters, value: string) {
    setDraftFilters((current: AuditFilters) => ({ ...current, [key]: value }));
  }

  function onSelectFilter(key: keyof AuditFilters) {
    return (event: any) => updateFilter(key, event.target.value);
  }

  function onDateFilter(key: keyof AuditFilters) {
    return (event: any) => updateFilter(key, event.target.value);
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="page-title">Audit log</h2>
        <p className="page-subtitle">A timestamped trail of project decisions, submissions, task updates and dependency changes.</p>
      </div>
      <form className="panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto_auto]" onSubmit={submit}>
        <select className="input" name="project" value={draftFilters.project} onChange={onSelectFilter("project")}>
          <option value="">All projects</option>
          {(projects.data ?? []).map((project: any) => <option key={project._id} value={project._id}>{project.name}</option>)}
        </select>
        <select className="input" name="actor" value={draftFilters.actor} onChange={onSelectFilter("actor")}>
          <option value="">All members</option>
          {members.map((member: any) => {
            const userId = member.user?._id ?? member.user;
            return <option key={userId} value={userId}>{member.user?.name ?? member.user?.email ?? "Member"}</option>;
          })}
        </select>
        <input className="input" name="from" type="date" value={draftFilters.from} onChange={onDateFilter("from")} />
        <input className="input" name="to" type="date" value={draftFilters.to} onChange={onDateFilter("to")} />
        <button className="btn-primary" type="submit"><Filter size={16} />Apply</button>
        <button className="btn-ghost" type="button" onClick={() => { setDraftFilters(emptyFilters); setAppliedFilters(emptyFilters); }}><RotateCcw size={16} />Reset</button>
      </form>
      <div className="panel p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><ClipboardList className="text-[#6faebe]" /><h3 className="font-bold">Workspace trail</h3></div>
          <p className="text-xs font-bold uppercase text-[#b9906a]">{activity.data?.length ?? 0} event{(activity.data?.length ?? 0) === 1 ? "" : "s"}</p>
        </div>
        <div className="space-y-3">
          {activity.isLoading && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">Loading activity...</p>}
          {activity.isError && <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">Could not apply these filters. Please try a different selection.</p>}
          {(activity.data ?? []).map((item: any) => (
            <article className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4" key={item._id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-[#263333]">{actionText(item.action)}</p>
                  <p className="mt-1 break-words text-sm text-[#6f7b73]">
                    <span className="font-bold text-[#507f8a]">{item.actor?.name ?? item.actor?.username ?? "User"}</span>
                    <span> in {item.project?.name ?? workspace?.name ?? "Workspace"}</span>
                    {item.task?.title ? <span> · {item.task.title}</span> : null}
                  </p>
                </div>
                <time className="text-sm font-bold text-[#765a40]">{new Date(item.createdAt).toLocaleString()}</time>
              </div>
            </article>
          ))}
          {(activity.data ?? []).length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">No activity found for these filters.</p>}
        </div>
      </div>
    </section>
  );
}
