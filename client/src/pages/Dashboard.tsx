import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Cloud,
  FileCheck2,
  GitBranch,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { WorkspaceSwitcher } from "../components/WorkspaceSwitcher";

const activityLabel = (action: string) =>
  ({
    TASK_CREATED: "Task created",
    TASK_UPDATED: "Task updated",
    TASK_DELETED: "Task deleted",
    COMMENT_ADDED: "Comment added",
    DEPENDENCY_ADDED: "Dependency added",
    DEPENDENCY_REMOVED: "Dependency removed",
    PROJECT_CREATED: "Project created",
    PROJECT_UPDATED: "Project updated",
  })[action] ??
  action
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

export function Dashboard() {
  const { workspace, role } = useActiveWorkspace();
  const projects = useQuery({
    enabled: !!workspace,
    queryKey: ["projects", workspace?._id],
    queryFn: async () =>
      (await api.get(`/projects?workspace=${workspace._id}`)).data.data,
  });
  const mySummary = useQuery({
    enabled: !!workspace,
    queryKey: ["my-summary", workspace?._id],
    queryFn: async () =>
      (await api.get(`/workspaces/${workspace._id}/my-summary`)).data.data,
  });
  const myStats = mySummary.data?.assignedTaskStats ?? {
    total: 0,
    completed: 0,
    active: 0,
    overdue: 0,
    highPriority: 0,
  };
  const deliveryStats = mySummary.data?.deliveryStats ?? {
    pendingReviews: 0,
    approvedDeliverables: 0,
    deliveredFiles: 0,
    blockedTasks: 0,
  };
  const status = myStats.byStatus ?? {
    todo: 0,
    inProgress: 0,
    inReview: 0,
    done: myStats.completed ?? 0,
  };
  const completion = myStats.total
    ? Math.round((myStats.completed / myStats.total) * 100)
    : 0;
  const canCreateProject = ["OWNER", "ADMIN"].includes(role);

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-[#2f3f3f] p-4 text-white shadow-[0_18px_45px_rgba(74,60,44,0.18)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <span className="chip bg-[#edf0df] text-[#596344]">
              Workspace: {workspace?.name ?? "Loading"} · {role}
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">
              Your workspace home.
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#edf0df]">
              Use this page for workspace overview, your assigned work and
              deadlines. Open a project to see its board, dependencies,
              bottlenecks and team load.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap">
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <WorkspaceSwitcher compact />
            </div>
            <Link className="btn-ghost w-full lg:w-auto" to="/app/projects">
              All projects
            </Link>
            {canCreateProject && (
              <Link className="btn-primary w-full lg:w-auto" to="/app/projects">
                <Plus size={18} />
                Create project
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Projects"
          value={projects.data?.length ?? 0}
          helper="Visible in this workspace"
        />
        <Metric
          label="My tasks"
          value={myStats.total}
          helper="Assigned to me"
        />
        <Metric
          label="My completion"
          value={`${completion}%`}
          helper="My done vs assigned"
        />
        <Metric
          label="My overdue"
          value={myStats.overdue}
          helper="Assigned to me"
          tone="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <TaskFlowGraph status={status} total={myStats.total} />
        <DeliveryPulse stats={deliveryStats} />
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold">
              Projects in {workspace?.name ?? "this workspace"}
            </h3>
            <p className="text-sm text-[#6f7b73]">
              Open a project to manage tasks, project members, dependencies and
              workload.
            </p>
          </div>
          <Link className="btn-ghost w-full sm:w-auto" to="/app/projects">
            {canCreateProject ? "Create project" : "View projects"}
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(projects.data ?? []).map((item: any) => (
            <Link
              className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              key={item._id}
              to={`/app/projects/${item._id}`}
            >
              <p className="font-bold text-[#263333]">{item.name}</p>
              <p className="mt-2 text-sm text-[#6f7b73]">{item.status}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#507f8a]">
                Open project <ArrowRight size={16} />
              </span>
            </Link>
          ))}
          {(projects.data ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed border-[#ded8c9] bg-[#fbf7ee] p-5 text-sm text-[#6f7b73] md:col-span-3">
              {canCreateProject
                ? "No projects yet. Create one from Projects."
                : "No projects are shared with you yet."}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="text-[#b9906a]" />
            <h3 className="font-bold">Upcoming deadlines</h3>
          </div>
          {(mySummary.data?.projectDeadlines ?? [])
            .slice(0, 4)
            .map((project: any) => (
              <p
                className="mb-3 rounded-lg bg-[#fbf7ee] p-3 text-sm"
                key={project._id}
              >
                <b>{project.name}</b>
                <br />
                <span className="text-[#6f7b73]">
                  Project deadline:{" "}
                  {new Date(project.deadline).toLocaleDateString()}
                </span>
              </p>
            ))}
          {(mySummary.data?.assignedDeadlines ?? [])
            .slice(0, 4)
            .map((task: any) => (
              <p
                className="mb-3 rounded-lg bg-[#fffdf8] p-3 text-sm"
                key={task._id}
              >
                {task.title}
                <br />
                <span className="text-[#6f7b73]">
                  My task due: {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </p>
            ))}
        </div>
        <div className="panel p-5">
          <h3 className="mb-4 font-bold">Delivery activity</h3>
          {(mySummary.data?.recentSubmissions ?? [])
            .slice(0, 6)
            .map((item: any) => (
              <p
                className="mb-3 rounded-lg bg-[#fbf7ee] p-3 text-sm"
                key={item._id}
              >
                <b>{item.task?.title ?? "Submitted work"}</b>
                <br />
                <span className="text-[#6f7b73]">
                  {item.status.replaceAll("_", " ").toLowerCase()} ·{" "}
                  {item.project?.name ?? "Project"}
                </span>
              </p>
            ))}
          {(mySummary.data?.recentSubmissions ?? []).length === 0 && (
            <p className="rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">
              No submitted work yet.
            </p>
          )}
          <h3 className="mb-4 mt-5 font-bold">My recent activity</h3>
          {(mySummary.data?.recentActivity ?? [])
            .slice(0, 4)
            .map((item: any) => (
              <p
                className="mb-3 rounded-lg bg-[#fffdf8] p-3 text-sm"
                key={item._id}
              >
                {activityLabel(item.action)}
                <br />
                <span className="text-[#6f7b73]">
                  {item.project?.name ?? "Workspace"}
                </span>
              </p>
            ))}
          {(mySummary.data?.recentActivity ?? []).length === 0 && (
            <p className="rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">
              No personal activity yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function DeliveryPulse({
  stats,
}: {
  stats: {
    pendingReviews: number;
    approvedDeliverables: number;
    deliveredFiles: number;
    blockedTasks: number;
  };
}) {
  const rows = [
    {
      label: "Pending reviews",
      value: stats.pendingReviews,
      icon: <FileCheck2 size={18} />,
      helper: "Waiting for owner/admin decision",
    },
    {
      label: "Approved deliverables",
      value: stats.approvedDeliverables,
      icon: <ShieldCheck size={18} />,
      helper: "Final versions across visible projects",
    },
    {
      label: "Delivered files",
      value: stats.deliveredFiles,
      icon: <Cloud size={18} />,
      helper: "Files inside approved submissions",
    },
    {
      label: "Blocked tasks",
      value: stats.blockedTasks,
      icon: <GitBranch size={18} />,
      helper: "Waiting on unfinished dependencies",
    },
  ];
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <h3 className="font-bold">Delivery pulse</h3>
        <p className="mt-1 text-sm text-[#6f7b73]">
          A workspace-level signal of reviews, final outputs and blockers across
          projects you can access.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3"
            key={row.label}
          >
            <div className="mb-3 inline-flex rounded-md bg-[#d7edf2] p-2 text-[#365f66]">
              {row.icon}
            </div>
            <p className="text-xs font-bold uppercase text-[#6f7b73]">
              {row.label}
            </p>
            <p className="mt-1 text-2xl font-black text-[#263333]">
              {row.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#6f7b73]">
              {row.helper}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  helper: string;
  tone?: "blue" | "amber";
}) {
  return (
    <div className="panel p-5">
      <span
        className={`chip ${tone === "amber" ? "bg-[#ead5bf] text-[#765a40]" : "bg-[#d7edf2] text-[#365f66]"}`}
      >
        {label}
      </span>
      <p className="mt-4 text-4xl font-black">{value}</p>
      <p className="mt-1 text-sm text-[#6f7b73]">{helper}</p>
    </div>
  );
}

function TaskFlowGraph({
  status,
  total,
}: {
  status: { todo: number; inProgress: number; inReview: number; done: number };
  total: number;
}) {
  const rows = [
    { label: "To do", value: status.todo, color: "bg-[#ead5bf]" },
    { label: "In progress", value: status.inProgress, color: "bg-[#9fcbd6]" },
    { label: "In review", value: status.inReview, color: "bg-[#d7edf2]" },
    { label: "Done", value: status.done, color: "bg-[#8a9a6c]" },
  ];
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <h3 className="font-bold">My task flow</h3>
        <p className="mt-1 text-sm text-[#6f7b73]">
          Visual split of your assigned work. The cards above show totals; this
          graph shows where the work is sitting.
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const width = total
            ? Math.max(8, Math.round((row.value / total) * 100))
            : 0;
          return (
            <div
              className="grid gap-2 sm:grid-cols-[120px_1fr_48px] sm:items-center"
              key={row.label}
            >
              <p className="text-sm font-bold text-[#263333]">{row.label}</p>
              <div className="h-4 overflow-hidden rounded-full bg-[#fbf7ee]">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="text-sm font-black text-[#263333] sm:text-right">
                {row.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
