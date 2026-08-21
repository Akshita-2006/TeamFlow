import { ArrowRight, BarChart3, Bell, Cloud, FileCheck2, GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: FileCheck2, title: "Submit for review", text: "Members submit finished work with file or code links instead of directly marking work done." },
  { icon: ShieldCheck, title: "Approve or request changes", text: "Owner/admin reviews each submission, approves it, rejects it, or sends it back with feedback." },
  { icon: Cloud, title: "Delivery room", text: "Approved versions become the project delivery set that clients or viewers can inspect." },
  { icon: Bell, title: "Helpful updates", text: "Teammates get notified about invites, assignments, comments, reviews and approved work." }
];

export function Landing() {
  return (
    <main className="surface-grid min-h-screen">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-5">
        <Brand />
        <div className="flex items-center gap-2">
          <Link className="btn-ghost" to="/how-to">How it works</Link>
          <Link className="btn-primary" to="/login">Start</Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <span className="chip bg-[#edf0df] text-[#596344]">Cloud work review and delivery workspace</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#263333] sm:text-5xl md:text-6xl">Submit work, review changes, approve deliverables, and ship with clarity.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">TeamFlow is built for teams that need more than a task board: assign work, attach files or code links, review submissions, request changes, and keep the final delivery set clean.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn-primary w-full sm:w-auto" to="/register">Create workspace <ArrowRight size={18} /></Link>
            <Link className="btn-ghost w-full sm:w-auto" to="/how-to">See the workflow</Link>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 bg-[#2f3f3f] px-5 py-4 text-white">
            <p className="text-sm text-[#d8c0a8]">Product preview</p>
            <h2 className="mt-1 text-2xl font-bold">How delivery moves</h2>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <PreviewCard label="Submissions" value="Queued" tone="blue" />
            <PreviewCard label="Reviews" value="Tracked" tone="amber" />
            <PreviewCard label="Delivery" value="Approved" tone="teal" />
            <PreviewCard label="Updates" value="Instant" tone="rose" />
          </div>
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 font-bold"><BarChart3 size={18} />Everyday workflow</div>
              {["Assign work to the right owner", "Submit files or code links for review", "Approve final versions into delivery"].map((row) => <div className="mb-2 rounded-md bg-[#fffdf8] px-3 py-2 text-sm text-slate-600" key={row}>{row}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-14 sm:px-5 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => <article className="panel p-5" key={feature.title}><feature.icon className="mb-4 text-[#6faebe]" /><h3 className="font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p></article>)}
      </section>
    </main>
  );
}

function Brand() {
  return <Link to="/" className="flex items-center gap-3 text-[#263333]"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#9fcbd6] shadow-[0_12px_24px_rgba(159,203,214,0.35)]"><Workflow size={24} /></span><span><span className="block text-2xl font-black tracking-normal">TeamFlow</span><span className="block text-xs font-bold uppercase text-[#b9906a]">Delivery workspace</span></span></Link>;
}

function PreviewCard({ label, value, tone }: { label: string; value: string; tone: "amber" | "blue" | "rose" | "teal" }) {
  const colors = { amber: "bg-[#ead5bf] text-[#765a40]", blue: "bg-[#d7edf2] text-[#365f66]", rose: "bg-rose-100 text-rose-800", teal: "bg-[#edf0df] text-[#596344]" };
  return <div className="rounded-lg border border-slate-200 p-4"><span className={`chip ${colors[tone]}`}>{label}</span><p className="mt-4 text-3xl font-black">{value}</p></div>;
}
