import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export function Register() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [params] = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const { data } = await api.post("/auth/register", Object.fromEntries(new FormData(event.currentTarget)));
      setAuth(data.token, data.user);
      navigate(params.get("redirect") || "/app");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Registration failed");
    }
  }
  return (
    <main className="surface-grid grid min-h-screen place-items-center p-4 sm:p-5">
      <form onSubmit={submit} className="panel w-full max-w-lg p-5 sm:p-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#507f8a]"><ArrowLeft size={17} />Back to website</Link>
        <Link to="/" className="block text-2xl font-black">TeamFlow</Link>
        <h1 className="mt-8 text-3xl font-black">Create your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Registration creates a protected account and a starter workspace automatically.</p>
        <label className="mb-2 mt-6 block text-sm font-bold">Name</label>
        <input className="input" name="name" placeholder="Your name" required />
        <label className="mb-2 mt-4 block text-sm font-bold">Username</label>
        <div className="flex rounded-md border bg-[#fffdf8] focus-within:ring-4" style={{ borderColor: "var(--tf-line)", "--tw-ring-color": "#d7edf2" } as any}>
          <span className="grid w-12 shrink-0 place-items-center border-r text-[#6f7b73]" style={{ borderColor: "var(--tf-line)" }}>@</span>
          <input className="min-h-11 w-full min-w-0 rounded-r-md bg-transparent px-3 py-2.5 text-[#263333] outline-none" name="username" placeholder="projectpilot_24" pattern="[A-Za-z0-9_]{3,24}" title="Use 3-24 letters, numbers or underscore" required />
        </div>
        <p className="mt-2 text-xs text-slate-500">This is your unique TeamFlow handle.</p>
        <label className="mb-2 mt-4 block text-sm font-bold">Email</label>
        <input className="input" name="email" type="email" placeholder="you@example.com" required />
        <label className="mb-2 mt-4 block text-sm font-bold">Password</label>
        <div className="relative">
          <input className="input pr-12" name="password" type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters" required />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-[#507f8a]" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button className="btn-primary mt-5 w-full">Create account</button>
        <Link className="mt-4 block text-center text-sm font-bold text-[#507f8a]" to={params.get("redirect") ? `/login?redirect=${encodeURIComponent(params.get("redirect") ?? "")}` : "/login"}>Already have an account? Login</Link>
      </form>
    </main>
  );
}

