import { FolderKanban, KeyRound, LogOut, Mail, Shield, Trash2, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { WorkspaceSwitcher } from "../components/WorkspaceSwitcher";
import { useAuth } from "../store/auth";

export function Profile() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { workspace, role } = useActiveWorkspace();
  const username = auth.user?.username ?? auth.user?.email?.split("@")[0] ?? "user";

  function logout() {
    auth.logout();
    navigate("/login");
  }

  async function deleteAccount() {
    const confirmed = window.confirm("Delete your account permanently? This cannot be undone. If you own a workspace, its projects and tasks will also be deleted.");
    if (!confirmed) return;
    await api.delete("/auth/me");
    auth.logout();
    navigate("/");
  }

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="panel overflow-hidden">
        <div className="bg-[#2f3f3f] px-6 py-7 text-white">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex flex-wrap items-center gap-5">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[#d7edf2] text-[#263333]"><UserCircle size={46} /></div>
              <div className="min-w-0">
                <h2 className="text-3xl font-black tracking-normal">{auth.user?.name}</h2>
                <p className="mt-1 text-sm font-bold text-[#d7edf2]">@{username}</p>
                <p className="mt-1 break-all text-sm text-[#edf0df]">{auth.user?.email}</p>
                <span className="chip mt-3 bg-[#edf0df] text-[#596344]">{role}</span>
              </div>
            </div>
            <button className="btn-ghost w-full sm:w-auto" type="button" onClick={logout}><LogOut size={18} />Logout</button>
          </div>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
          <InfoRow icon={<FolderKanban size={20} />} label="Active workspace" value={workspace?.name ?? "Loading"} />
          <InfoRow icon={<Shield size={20} />} label="Role here" value={role} />
          <InfoRow icon={<Mail size={20} />} label="Username" value={`@${username}`} />
          <InfoRow icon={<UserCircle size={20} />} label="User ID" value={auth.user?.id ?? "-"} small forceBreak />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <div className="panel p-5">
          <h3 className="font-bold">My workspaces</h3>
          <p className="mt-2 text-sm leading-6 text-[#6f7b73]">Switch between workspaces or create your own workspace where you are the owner.</p>
          <div className="mt-4 w-full"><WorkspaceSwitcher /></div>
        </div>

        <div className="panel p-5">
          <h3 className="font-bold">Account actions</h3>
          <div className="mt-4 grid gap-3">
            <Link className="btn-ghost justify-start" to="/forgot-password"><KeyRound size={18} />Reset password</Link>
            <button className="btn-ghost justify-start" type="button" onClick={logout}><LogOut size={18} />Logout</button>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="font-bold">What you can do</h3>
        <p className="mt-2 text-sm leading-6 text-[#6f7b73]">Create workspaces, switch between workspaces, manage projects where you have access, and view work based on your current role.</p>
      </div>

      <div className="panel border-rose-200 bg-rose-50 p-5">
        <h3 className="font-bold text-rose-900">Danger zone</h3>
        <p className="mt-2 text-sm leading-6 text-rose-700">Delete your user account. If you own a workspace, that workspace and its project data will also be removed.</p>
        <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 sm:w-auto" type="button" onClick={deleteAccount}><Trash2 size={17} />Delete my account</button>
      </div>
    </section>
  );
}

function InfoRow({ icon, label, value, small = false, forceBreak = false }: { icon: any; label: string; value: string; small?: boolean; forceBreak?: boolean }) {
  return (
    <div className="min-w-0 border-t border-[#ded8c9] p-5 xl:border-r xl:last:border-r-0">
      <div className="mb-3 text-[#b9906a]">{icon}</div>
      <p className="text-xs font-bold uppercase text-[#b9906a]">{label}</p>
      <p className={`mt-2 max-w-full font-black leading-snug text-[#263333] ${forceBreak ? "break-all" : "break-words"} ${small ? "text-sm" : "text-base sm:text-lg"}`}>
        {value}
      </p>
    </div>
  );
}
