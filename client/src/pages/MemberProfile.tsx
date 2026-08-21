import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Flame, UserCircle } from "lucide-react";
import { api } from "../lib/api";

export function MemberProfile() {
  const { workspaceId, userId } = useParams();
  const profile = useQuery({ queryKey: ["member-profile", workspaceId, userId], queryFn: async () => (await api.get(`/workspaces/${workspaceId}/members/${userId}/profile`)).data.data });
  const data = profile.data;

  return (
    <section className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#507f8a]" to="/app/team"><ArrowLeft size={17} />Back to team</Link>
      <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
        <aside className="panel p-6 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#d7edf2] text-[#365f66]"><UserCircle size={56} /></div>
          <h2 className="mt-4 text-2xl font-black">{data?.user?.name ?? "Member"}</h2>
          <p className="font-bold text-[#507f8a]">@{data?.user?.username ?? data?.user?.email?.split("@")[0]}</p>
          <p className="break-all text-sm text-[#6f7b73]">{data?.user?.email}</p>
          <span className="chip mt-4 bg-[#edf0df] text-[#596344]">{data?.role}</span>
        </aside>
        <div className="space-y-5">
          <div className="panel p-4">
            <h3 className="font-bold">What these numbers mean</h3>
            <p className="mt-2 text-sm leading-6 text-[#6f7b73]">These stats are calculated from tasks assigned to this person inside the current workspace. Assigned is total assigned work, Active is not Done, Completed is Done, and High priority counts High/Critical tasks.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Assigned" value={data?.stats?.assigned ?? 0} icon="clock" />
            <Stat label="Active" value={data?.stats?.active ?? 0} icon="clock" />
            <Stat label="Completed" value={data?.stats?.completed ?? 0} icon="check" />
            <Stat label="High priority" value={data?.stats?.highPriority ?? 0} icon="flame" />
          </div>
          <div className="panel p-5">
            <h3 className="mb-4 font-bold">Assigned work</h3>
            <div className="space-y-3">
              {(data?.tasks ?? []).map((task: any) => <article className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4" key={task._id}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-bold">{task.title}</p><p className="text-sm text-[#6f7b73]">{task.project?.name ?? "Project"} · {task.status.replace("_", " ")}</p></div><span className="chip w-fit bg-[#ead5bf] text-[#765a40]">{task.priority}</span></div></article>)}
              {data?.tasks?.length === 0 && <p className="text-sm text-[#6f7b73]">No assigned tasks yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: "clock" | "check" | "flame" }) {
  const Icon = icon === "check" ? CheckCircle2 : icon === "flame" ? Flame : Clock;
  return <div className="panel p-4"><Icon className="mb-3 text-[#b9906a]" size={20} /><p className="text-sm text-[#6f7b73]">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}

