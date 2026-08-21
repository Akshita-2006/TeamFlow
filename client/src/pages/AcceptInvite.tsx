import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const auth = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState(auth.token ? "Accepting invite..." : "Login or register with the invited email to accept this workspace invite.");
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();
  const friendlyInviteError = (error: string) => {
    if (/cancelled|expired|fresh invite|new invite/i.test(error)) return error;
    if (/different email/i.test(error)) return "This invite belongs to a different email address. Login or register with the invited email.";
    if (/already been accepted/i.test(error)) return "This invite has already been accepted. Open your TeamFlow workspace to continue.";
    return "This invite link cannot be used right now. Please ask the workspace owner for a fresh invite.";
  };
  async function accept() {
    try {
      setFailed(false);
      const { data } = await api.post("/workspaces/invites/accept", { token });
      if (data.data?._id) {
        localStorage.setItem("teamflow.activeWorkspaceId", data.data._id);
        window.dispatchEvent(new CustomEvent("teamflow:active-workspace-changed", { detail: data.data._id }));
      }
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      await qc.invalidateQueries({ queryKey: ["workspace-invites"] });
      setMessage("Invite accepted. Opening your workspace...");
      navigate("/app/team");
    } catch (err: any) {
      setFailed(true);
      setMessage(friendlyInviteError(err.response?.data?.error ?? ""));
    }
  }

  useEffect(() => {
    if (auth.token && token) accept();
  }, [auth.token, token]);

  const redirect = `/accept-invite?token=${encodeURIComponent(token)}`;
  return <main className="surface-grid grid min-h-screen place-items-center p-4 sm:p-5"><section className="panel w-full max-w-md p-5 sm:p-6"><h1 className="text-2xl font-black sm:text-3xl">Accept workspace invite</h1><p className="mt-2 text-sm text-[#6f7b73]">Use the same email address that received this invite.</p>{auth.token && !failed && <button className="btn-primary mt-5 w-full" onClick={accept}>Accept invite</button>}{message && <p className={`mt-4 rounded-md p-3 text-sm ${failed ? "bg-rose-50 text-rose-700" : "bg-[#fbf7ee] text-[#6f7b73]"}`}>{message}</p>}<div className="mt-4 grid gap-2 text-sm font-bold sm:grid-cols-3"><Link className="btn-ghost" to="/app">Open</Link><Link className="btn-ghost" to={`/login?redirect=${encodeURIComponent(redirect)}`}>Login</Link><Link className="btn-primary" to={`/register?redirect=${encodeURIComponent(redirect)}`}>Register</Link></div></section></main>;
}
