import { FormEvent, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export function Login() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [params] = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await api.post("/auth/login", Object.fromEntries(form));
      setAuth(data.token, data.user);
      navigate(params.get("redirect") || "/app");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Login failed");
    }
  }
  return (
    <main className="surface-grid flex min-h-dvh items-start justify-center px-4 py-5 sm:items-center sm:p-6">
      <div className="grid w-full max-w-md overflow-hidden rounded-xl bg-[#fffdf8] shadow-[0_24px_70px_rgba(15,23,42,.16)] lg:max-w-6xl lg:grid-cols-[1fr_.85fr]">
        <section className="hidden bg-[#2f3f3f] p-8 text-white lg:block lg:p-10">
          <Link to="/" className="text-2xl font-black">TeamFlow</Link>
          <h1 className="mt-12 text-4xl font-black leading-tight tracking-normal">Welcome back to your project command center.</h1>
          <p className="mt-4 leading-7 text-[#edf0df]">Login to your real workspace and continue managing projects, tasks, team roles and deadlines.</p>
          <div className="mt-8 space-y-3">
            {["Create your own projects", "Assign tasks to real team members", "Track deadlines and workload"].map((item) => <p className="flex items-center gap-3 text-sm text-slate-200" key={item}><CheckCircle2 className="text-[#d8c0a8]" size={18} />{item}</p>)}
          </div>
        </section>
        <form onSubmit={submit} className="p-5 sm:p-7 lg:p-10">
          <div className="mb-6 rounded-lg bg-[#2f3f3f] p-4 text-white lg:hidden">
            <Link to="/" className="text-xl font-black">TeamFlow</Link>
            <p className="mt-2 text-sm leading-6 text-[#edf0df]">Login to manage your projects, tasks and team updates.</p>
          </div>
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#507f8a]"><ArrowLeft size={17} />Back to website</Link>
          <h2 className="text-2xl font-black sm:text-3xl">Login</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use the account you created from the register page.</p>
          <label className="mb-2 mt-6 block text-sm font-bold">Email</label>
          <input className="input" name="email" type="email" placeholder="you@example.com" required />
          <label className="mb-2 mt-4 block text-sm font-bold">Password</label>
          <div className="relative">
            <input className="input pr-12" name="password" type={showPassword ? "text" : "password"} placeholder="Your password" required />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-[#507f8a]" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button className="btn-primary mt-5 w-full">Enter workspace <ArrowRight size={18} /></button>
          <div className="mt-4 grid gap-2 text-center text-sm font-bold sm:flex sm:justify-center sm:gap-4"><Link className="text-[#507f8a]" to="/forgot-password">Forgot password?</Link><Link className="text-[#507f8a]" to={params.get("redirect") ? `/register?redirect=${encodeURIComponent(params.get("redirect") ?? "")}` : "/register"}>Create account</Link></div>
        </form>
      </div>
    </main>
  );
}



