import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, ListChecks, Timer } from "lucide-react";
import { api } from "../lib/api";

const loadLabel = (load: string) => ({ HEAVY_LOAD: "Heavy", MEDIUM_LOAD: "Balanced", LIGHT_LOAD: "Light" }[load] ?? "No load");
const loadClass = (load: string) => load === "HEAVY_LOAD" ? "bg-[#f4e8dc] text-[#765a40]" : load === "MEDIUM_LOAD" ? "bg-[#edf0df] text-[#596344]" : "bg-[#d7edf2] text-[#365f66]";

export function Workload() {
  const { projectId } = useParams();
  const workload = useQuery({ queryKey: ["workload", projectId], queryFn: async () => (await api.get(`/projects/${projectId}/workload`)).data.data });
  const members = workload.data?.members ?? [];
  const assignedTotal = members.reduce((sum: number, member: any) => sum + Number(member.assigned ?? 0), 0);
  const overdueTotal = members.reduce((sum: number, member: any) => sum + Number(member.overdue ?? 0), 0);
  const completedTotal = members.reduce((sum: number, member: any) => sum + Number(member.completed ?? 0), 0);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="page-title">Project workload</h2><p className="page-subtitle">A clean view of who owns what in this project. Load is estimated from assigned open work, overdue tasks and high priority tasks.</p></div>
        <Link className="btn-ghost" to={`/app/projects/${projectId}`}><ArrowLeft size={18} />Project board</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary icon={<ListChecks size={20} />} label="Assigned tasks" value={assignedTotal} />
        <Summary icon={<AlertTriangle size={20} />} label="Overdue tasks" value={overdueTotal} />
        <Summary icon={<CheckCircle2 size={20} />} label="Completed tasks" value={completedTotal} />
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2"><Timer className="text-[#6faebe]" /><h3 className="font-bold">Member capacity</h3></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member: any) => {
            const assigned = Number(member.assigned ?? 0);
            const completed = Number(member.completed ?? 0);
            const percent = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
            return (
              <article className="rounded-lg border border-[#ded8c9] bg-[#fffdf8] p-4" key={member.userId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h4 className="font-black text-[#263333]">{member.name}</h4><p className="text-sm text-[#6f7b73]">{assigned} assigned, {completed} done</p></div>
                  <span className={`chip ${loadClass(member.load)}`}>{loadLabel(member.load)}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0df]"><div className="h-full rounded-full bg-[#9fcbd6]" style={{ width: `${percent}%` }} /></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <Stat label="Open" value={Math.max(assigned - completed, 0)} />
                  <Stat label="Overdue" value={member.overdue} />
                  <Stat label="Done" value={completed} />
                </div>
              </article>
            );
          })}
          {members.length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">No project members or assigned tasks yet.</p>}
        </div>
      </div>
    </section>
  );
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="panel p-4"><div className="mb-3 inline-flex rounded-md bg-[#d7edf2] p-2 text-[#365f66]">{icon}</div><p className="text-sm font-bold text-[#6f7b73]">{label}</p><p className="mt-1 text-3xl font-black text-[#263333]">{value}</p></div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-[#fbf7ee] p-3"><dt className="text-xs font-bold uppercase text-[#6f7b73]">{label}</dt><dd className="mt-1 font-black text-[#263333]">{value}</dd></div>;
}
