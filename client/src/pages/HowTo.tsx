import { Link } from "react-router-dom";
import { Bell, CheckCircle2, Cloud, FileCheck2, GitBranch, MailPlus, Shield, Workflow } from "lucide-react";

const steps = [
  ["Create your account", "Register with your name, email and password. TeamFlow creates your first workspace automatically and makes you the owner."],
  ["Invite or add teammates", "Open Team & invites. If the email is already registered, the person is added and emailed. If not, TeamFlow sends an invite link."],
  ["Create projects", "Open Projects and create separate projects for separate work. Each project can have its own deadline and team."],
  ["Choose project members", "Open a project and add people from the workspace team into that project. Only project members appear in task assignment."],
  ["Add tasks and owners", "Create tasks with title, due date, priority, labels, effort and description. Assign each task to a project member or leave it unassigned."],
  ["Submit work for review", "The assigned owner attaches files or links and submits the task for review. TeamFlow moves it to In Review."],
  ["Approve or request changes", "Owner/admin uses the review inbox to approve, reject, or ask for changes. Approved submissions mark the task Done."],
  ["Use the delivery room", "Approved versions appear in Delivery, so final files and code links stay separate from work still under review."],
  ["Use comments and notifications", "Add comments, mention teammates and track notifications from the top menu. Unread notifications show a count until marked read."],
  ["Connect dependencies", "Use Depends on inside task cards. Blocked tasks cannot move forward or submit until their dependency tasks are Done."],
  ["Review workload and deadlines", "Use the project workload page for member capacity. Dashboard and Calendar show your workspace and assigned deadlines."],
  ["Manage settings", "Owners/admins can manage workspace settings, project settings, roles, pending invites and account/profile actions."],
];

const highlights = [
  { icon: MailPlus, title: "Simple invites", text: "Add registered users directly or send invite links to new teammates." },
  { icon: Shield, title: "Clear roles", text: "Owner, admin, member and viewer actions stay separated." },
  { icon: FileCheck2, title: "Review gate", text: "Work becomes Done only after a reviewer approves it." },
  { icon: Cloud, title: "Cloud files", text: "Submissions keep uploaded files, links, versions and review notes together." },
];

export function HowTo() {
  return (
    <main className="surface-grid min-h-screen px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3 text-[#263333]"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#9fcbd6]"><Workflow size={24} /></span><span><span className="block text-2xl font-black">TeamFlow</span><span className="block text-xs font-bold uppercase text-[#b9906a]">How it works</span></span></Link>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto"><Link className="btn-ghost" to="/register">Register</Link><Link className="btn-primary" to="/login">Login</Link></div>
        </div>

        <section className="panel p-6 md:p-8">
          <span className="chip bg-[#d7edf2] text-[#365f66]"><FileCheck2 size={14} /> User workflow</span>
          <h1 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">How to use TeamFlow</h1>
          <p className="mt-3 max-w-3xl leading-7 text-[#6f7b73]">Start with a workspace, invite people, create projects, then run work through submit, review, approve and deliver. Tasks still exist, but the core flow is approval-based delivery.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {steps.map(([title, text], index) => (
              <article className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-5" key={title}>
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-[#2f3f3f] font-black text-white">{index + 1}</div>
                <h2 className="font-bold text-[#263333]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6f7b73]">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          {highlights.map((item) => <article className="panel p-5" key={item.title}><item.icon className="mb-4 text-[#6faebe]" /><h2 className="font-bold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[#6f7b73]">{item.text}</p></article>)}
        </section>

        <section className="mt-5 panel p-5">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-1 text-[#8a9a6c]" /><div><h2 className="font-bold">What users should remember</h2><p className="mt-2 text-sm leading-6 text-[#6f7b73]">Workspace team means all people available to the company/team. Project members means only the people working on that project. Task owners are selected from project members only.</p></div></div>
        </section>
      </div>
    </main>
  );
}
