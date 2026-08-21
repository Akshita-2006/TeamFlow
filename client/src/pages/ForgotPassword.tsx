import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data } = await api.post("/auth/forgot-password", Object.fromEntries(new FormData(event.currentTarget)));
    setMessage(data.message);
    setDevLink(data.devLink ?? "");
  }
  return <main className="surface-grid grid min-h-screen place-items-center p-5"><form className="panel w-full max-w-md p-6" onSubmit={submit}><Link className="text-sm font-bold text-[#507f8a]" to="/login">Back to login</Link><h1 className="mt-4 text-3xl font-black">Reset password</h1><p className="mt-2 text-sm text-[#6f7b73]">Enter your registered email. TeamFlow will send a reset link to that inbox.</p><label className="mb-2 mt-5 block text-sm font-bold">Email</label><input className="input" name="email" type="email" required /><button className="btn-primary mt-4 w-full">Send reset link</button>{message && <p className="mt-4 rounded-md bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">{message}</p>}{devLink && <a className="mt-3 block break-all rounded-md bg-[#d7edf2] p-3 text-sm font-bold text-[#365f66]" href={devLink}>Local test link: {devLink}</a>}</form></main>;
}
