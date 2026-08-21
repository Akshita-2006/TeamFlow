import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";

export function ResetPassword() {
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.post("/auth/reset-password", { ...Object.fromEntries(new FormData(event.currentTarget)), token: params.get("token") });
      navigate("/login");
    } catch (err: any) { setError(err.response?.data?.error ?? "Could not reset password"); }
  }
  return <main className="surface-grid grid min-h-screen place-items-center p-5"><form className="panel w-full max-w-md p-6" onSubmit={submit}><Link className="text-sm font-bold text-[#507f8a]" to="/login">Back to login</Link><h1 className="mt-4 text-3xl font-black">Choose new password</h1><label className="mb-2 mt-5 block text-sm font-bold">New password</label><div className="relative"><input className="input pr-12" name="password" type={show ? "text" : "password"} minLength={8} required /><button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn-primary mt-4 w-full">Reset password</button></form></main>;
}
