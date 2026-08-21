import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Settings } from "lucide-react";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

export function WorkspaceSettings() {
  const { workspace, role } = useActiveWorkspace();
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  const canEdit = ["OWNER", "ADMIN"].includes(role);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.patch(`/workspaces/${workspace._id}`, Object.fromEntries(new FormData(event.currentTarget)));
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setMessage("Workspace settings saved.");
    } catch (err: any) { setMessage(err.response?.data?.error ?? "Only owner/admin can update workspace settings."); }
  }

  return (
    <section className="space-y-5">
      <div><h2 className="page-title">Workspace settings</h2><p className="page-subtitle">Workspace-level settings are for the whole team. Project ownership is managed inside each project.</p></div>
      <form className="panel p-5" onSubmit={save}>
        <div className="mb-4 flex items-center gap-2"><Settings className="text-[#6faebe]" /><h3 className="font-bold">General settings</h3></div>
        <label className="mb-2 block text-sm font-bold">Name</label><input className="input mb-4" name="name" defaultValue={workspace?.name} disabled={!canEdit} />
        <label className="mb-2 block text-sm font-bold">Description</label><textarea className="input mb-4" name="description" defaultValue={workspace?.description} disabled={!canEdit} />
        <label className="mb-2 block text-sm font-bold">Timezone</label><input className="input mb-4" name="timezone" defaultValue={workspace?.timezone ?? "Asia/Calcutta"} disabled={!canEdit} />
        <button className="btn-primary" disabled={!canEdit}>Save settings</button>
        {!canEdit && <p className="mt-3 rounded-md bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">Only workspace owner/admin can edit these settings.</p>}
      </form>
      <div className="panel p-5">
        <div className="mb-3 flex items-center gap-2"><Lock className="text-[#b9906a]" /><h3 className="font-bold">Owner-only workspace controls</h3></div>
        <p className="text-sm leading-6 text-[#6f7b73]">Workspace owner is fixed for this workspace. Project owners can be changed from each project board, so day-to-day ownership stays project-specific.</p>
      </div>
      {message && <p className="rounded-md bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">{message}</p>}
    </section>
  );
}
