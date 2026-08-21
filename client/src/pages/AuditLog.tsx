import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

export function AuditLog() {
  const { workspace } = useActiveWorkspace();
  const [filters, setFilters] = useState({ project: "", actor: "", from: "", to: "" });
  const activity = useQuery({ enabled: !!workspace, queryKey: ["workspace-activity", workspace?._id, filters], queryFn: async () => (await api.get(`/workspaces/${workspace._id}/activity`, { params: filters })).data.data });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFilters(Object.fromEntries(new FormData(event.currentTarget)) as any); }
  return <section className="space-y-5"><div><h2 className="page-title">Audit log</h2><p className="page-subtitle">Filter activity by project, user and date.</p></div><form className="panel grid gap-3 p-4 md:grid-cols-5" onSubmit={submit}><input className="input" name="project" placeholder="Project ID" /><input className="input" name="actor" placeholder="Member/User ID" /><input className="input" name="from" type="date" /><input className="input" name="to" type="date" /><button className="btn-primary">Apply</button></form><div className="panel p-5"><div className="space-y-3">{(activity.data ?? []).map((item: any) => <article className="rounded-lg bg-[#fbf7ee] p-3" key={item._id}><p className="font-bold">{item.action.replaceAll("_", " ")}</p><p className="text-sm text-[#6f7b73]">{item.actor?.name ?? "User"} · {item.project?.name ?? "Workspace"} · {new Date(item.createdAt).toLocaleString()}</p></article>)}{(activity.data ?? []).length === 0 && <p className="text-sm text-[#6f7b73]">No activity found.</p>}</div></div></section>;
}
