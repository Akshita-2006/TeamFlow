import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderKanban, Plus } from "lucide-react";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

export function Projects() {
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  const { workspace, role } = useActiveWorkspace();
  const canCreateProject = ["OWNER", "ADMIN"].includes(role);
  const projects = useQuery({ enabled: !!workspace, queryKey: ["projects", workspace?._id], queryFn: async () => (await api.get(`/projects?workspace=${workspace._id}`)).data.data });
  const createProject = useMutation({
    mutationFn: async (payload: any) => (await api.post("/projects", { ...payload, workspace: workspace._id })).data.data,
    onSuccess: () => { setMessage("Project created."); qc.invalidateQueries({ queryKey: ["projects", workspace?._id] }); },
    onError: (err: any) => setMessage(err.response?.data?.error ?? "Could not create project")
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateProject) {
      setMessage("Viewers can view shared projects, but cannot create new projects.");
      return;
    }
    createProject.mutate(Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  }

  return (
    <section className="space-y-6">
      <div><h2 className="page-title">Projects</h2><p className="page-subtitle">{canCreateProject ? "Create separate projects for separate work. Each project has its own board, team, deadline, workload and blockers." : "You have view-only access here. You can open projects shared with you, but only owners/admins can create new projects."}</p></div>
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        {canCreateProject ? (
          <form onSubmit={submit} className="panel p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-2"><Plus className="text-[#6faebe]" /><h3 className="font-bold">Add project</h3></div>
            <label className="mb-2 block text-sm font-bold">Project name</label>
            <input className="input mb-4" name="name" placeholder="Mobile app launch" required />
            <label className="mb-2 block text-sm font-bold">Description</label>
            <textarea className="input mb-4 min-h-28" name="description" placeholder="What is this project about?" />
            <label className="mb-2 block text-sm font-bold">Deadline</label>
            <input className="input mb-4" name="deadline" type="date" />
            <button className="btn-primary w-full">Create project</button>
            {message && <p className="mt-4 rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">{message}</p>}
          </form>
        ) : (
          <div className="panel p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-2"><Plus className="text-[#6faebe]" /><h3 className="font-bold">Project creation locked</h3></div>
            <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm leading-6 text-[#6f7b73]">Your current role is Viewer, so this workspace is read-only for you. Ask the owner/admin to change your role if you need to create projects.</p>
          </div>
        )}
        <div className="panel p-5">
          <div className="mb-5 flex items-center gap-2"><FolderKanban className="text-[#b9906a]" /><h3 className="font-bold">Workspace projects</h3></div>
          <div className="grid gap-3 md:grid-cols-2">
            {(projects.data ?? []).map((project: any) => <Link className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4 transition hover:-translate-y-0.5 hover:shadow-md" key={project._id} to={`/app/projects/${project._id}`}><p className="font-bold text-[#263333]">{project.name}</p><p className="mt-2 line-clamp-2 text-sm text-[#6f7b73]">{project.description || "No description"}</p><span className="chip mt-4 bg-[#d7edf2] text-[#365f66]">{project.status}</span></Link>)}
            {(projects.data ?? []).length === 0 && <div className="rounded-lg border border-dashed border-[#ded8c9] bg-[#fbf7ee] p-6 text-sm text-[#6f7b73] md:col-span-2">{canCreateProject ? "No projects yet. Create your first project from the form." : "No projects are shared with you yet."}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}


