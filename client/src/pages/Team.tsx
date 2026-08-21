import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, MailCheck, MailPlus, Shield, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

const roleHelp: Record<string, string> = {
  ADMIN: "Can manage team, projects and task details",
  MEMBER: "Can collaborate and update assigned progress",
  VIEWER: "Read-only access"
};
const handle = (user: any) => user?.username ? `@${user.username}` : user?.email ?? user;

export function Team() {
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const qc = useQueryClient();
  const { workspace, role } = useActiveWorkspace();
  const canManageTeam = ["OWNER", "ADMIN"].includes(role);
  const invites = useQuery({
    enabled: !!workspace && canManageTeam,
    queryKey: ["workspace-invites", workspace?._id],
    queryFn: async () => (await api.get(`/workspaces/${workspace._id}/invites`)).data.data,
    refetchInterval: canManageTeam ? 5000 : false
  });

  const refreshTeam = () => {
    qc.invalidateQueries({ queryKey: ["workspaces"] });
    qc.invalidateQueries({ queryKey: ["workspace-invites", workspace?._id] });
  };

  const addMember = useMutation({
    mutationFn: async (payload: any) => (await api.post(`/workspaces/${workspace._id}/members`, payload)).data,
    onSuccess: (data) => { setMessage(data.message ?? "Member added or role updated."); setDevLink(data.devLink ?? ""); refreshTeam(); },
    onError: (err: any) => setMessage(err.response?.data?.error ?? "Could not add or invite member")
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, nextRole }: { userId: string; nextRole: string }) => (await api.patch(`/workspaces/${workspace._id}/members/${userId}`, { role: nextRole })).data,
    onSuccess: (data) => { setMessage(data.message ?? "Member role updated."); setDevLink(""); refreshTeam(); },
    onError: (err: any) => setMessage(err.response?.data?.error ?? "Could not update member role")
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/workspaces/${workspace._id}/members/${userId}`)).data.data,
    onSuccess: () => { setMessage("Member removed from workspace. Their assigned tasks are no longer tied to this workspace membership."); setDevLink(""); refreshTeam(); },
    onError: (err: any) => setMessage(err.response?.data?.error ?? "Could not remove member")
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => (await api.delete(`/workspaces/${workspace._id}/invites/${inviteId}`)).data,
    onSuccess: (data) => { setMessage(data.message ?? "Invite cancelled."); setDevLink(""); refreshTeam(); },
    onError: (err: any) => setMessage(err.response?.data?.error ?? "Could not cancel invite")
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMember.mutate(Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  }

  function confirmRemove(userId: string, name: string) {
    const ok = window.confirm(`Remove ${name} from this workspace? They will lose access to this workspace and its projects. This cannot remove the workspace owner.`);
    if (ok) removeMember.mutate(userId);
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="page-title">Team & invites</h2>
        <p className="page-subtitle">Invite new people, manage pending requests, change roles, or remove members. Workspace owner is protected and cannot be removed from the team.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-5">
          <form onSubmit={submit} className="panel p-5">
            <div className="mb-5 flex items-center gap-2"><MailPlus className="text-[#6faebe]" /><h3 className="font-bold">Add or invite teammate</h3></div>
            <label className="mb-2 block text-sm font-bold">Email address</label>
            <p className="mb-3 text-xs text-[#6f7b73]">Registered users join now and get an email. New users receive an invite link.</p>
            <input className="input mb-4" name="email" type="email" placeholder="teammate@example.com" required disabled={!canManageTeam} />
            <label className="mb-2 block text-sm font-bold">Workspace role</label>
            <select className="input mb-4" name="role" defaultValue="MEMBER" disabled={!canManageTeam}>
              <option value="ADMIN">Admin - manage workspace, projects, team and task details</option>
              <option value="MEMBER">Member - collaborate and update assigned task progress</option>
              <option value="VIEWER">Viewer - read-only access</option>
            </select>
            <button className="btn-primary w-full" disabled={!canManageTeam}>{canManageTeam ? "Add or send invite" : "Only owner/admin can invite"}</button>
            {message && <p className="mt-4 rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">{message}</p>}
            {devLink && <a className="mt-3 block break-all rounded-lg bg-[#d7edf2] p-3 text-sm font-bold text-[#365f66]" href={devLink}>Local test invite link: {devLink}</a>}
          </form>

          <div className="panel p-5">
            <div className="mb-5 flex items-center gap-2"><Clock className="text-[#b9906a]" /><h3 className="font-bold">Pending invites</h3></div>
            <div className="space-y-3">
              {(invites.data ?? []).map((invite: any) => (
                <article className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4" key={invite._id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><p className="truncate font-bold text-[#263333]">{invite.email}</p><p className="text-sm text-[#6f7b73]">Invited as {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}</p></div>
                    <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end"><span className="chip bg-[#ead5bf] text-[#765a40]">Pending</span><button className="grid h-9 w-9 place-items-center rounded-md border border-[#ded8c9] text-[#765a40] hover:bg-[#ead5bf]" type="button" onClick={() => cancelInvite.mutate(invite._id)} aria-label="Cancel invite"><Trash2 size={17} /></button></div>
                  </div>
                </article>
              ))}
              {canManageTeam && (invites.data ?? []).length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">No pending invites.</p>}
              {!canManageTeam && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73]">Only owner/admin can view pending invites.</p>}
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-5 flex items-center gap-2"><Shield className="text-[#8a9a6c]" /><h3 className="font-bold">Workspace members</h3></div>
          <div className="space-y-3">
            {(workspace?.members ?? []).map((member: any) => {
              const userId = member.user?._id ?? member.user;
              const isOwner = member.role === "OWNER" || String(workspace?.owner?._id ?? workspace?.owner) === String(userId);
              const name = member.user?.name ?? "Member";
              return <article className="grid gap-3 rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center" key={userId}>
                <Link className="min-w-0" to={`/app/workspaces/${workspace._id}/members/${userId}`}><p className="font-bold text-[#263333]">{name}</p><p className="truncate text-sm text-[#6f7b73]">{handle(member.user)}</p>{isOwner && <p className="mt-1 text-xs font-bold text-[#8a6f4d]">Owner is protected.</p>}</Link>
                {isOwner ? <span className="chip justify-center bg-[#edf0df] text-[#596344]">OWNER</span> : <div><select className="input" value={member.role} disabled={!canManageTeam} onChange={(event: any) => updateRole.mutate({ userId, nextRole: event.target.value })}><option value="ADMIN">Admin</option><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option></select><p className="mt-1 text-xs text-[#6f7b73]">{roleHelp[member.role]}</p></div>}
                <div className="flex justify-start md:justify-end">{isOwner ? <MailCheck className="text-[#8a9a6c]" size={18} /> : canManageTeam && <button className="grid h-10 w-10 place-items-center rounded-md border border-[#ded8c9] text-[#765a40] hover:bg-[#ead5bf]" type="button" onClick={() => confirmRemove(userId, name)} aria-label="Remove member"><Trash2 size={17} /></button>}</div>
              </article>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
