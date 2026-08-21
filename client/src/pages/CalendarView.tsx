import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, NotebookPen, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

type Note = { id: string; date: string; text: string };

export function CalendarView() {
  const { workspace } = useActiveWorkspace();
  const storageKey = workspace?._id ? `teamflow-calendar-notes-${workspace._id}` : "teamflow-calendar-notes";
  const [notes, setNotes] = useState([] as Note[]);
  const summary = useQuery({ enabled: !!workspace, queryKey: ["my-summary", workspace?._id], queryFn: async () => (await api.get(`/workspaces/${workspace._id}/my-summary`)).data.data });
  const items = [...(summary.data?.projectDeadlines ?? []).map((project: any) => ({ id: project._id, title: project.name, type: "Project deadline", date: project.deadline })), ...(summary.data?.assignedDeadlines ?? []).map((task: any) => ({ id: task._id, title: task.title, type: "My task due", date: task.dueDate }))].sort((a: any, b: any) => Number(new Date(a.date)) - Number(new Date(b.date)));
  const sortedNotes = [...notes].sort((a: Note, b: Note) => Number(new Date(a.date)) - Number(new Date(b.date)));

  useEffect(() => {
    try { setNotes(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { setNotes([]); }
  }, [storageKey]);

  function saveNotes(next: Note[]) {
    setNotes(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    const text = String(raw.text ?? "").trim();
    const date = String(raw.date ?? "");
    if (!text || !date) return;
    saveNotes([{ id: crypto.randomUUID(), date, text }, ...notes]);
    form.reset();
  }

  return (
    <section className="space-y-5">
      <div><h2 className="page-title">Calendar</h2><p className="page-subtitle">Project deadlines, your assigned task due dates, and short planning notes.</p></div>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="panel p-5">
          <div className="mb-4 flex items-center gap-2"><CalendarClock className="text-[#b9906a]" /><h3 className="font-bold">Deadlines</h3></div>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item: any) => <article className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-4" key={`${item.type}-${item.id}`}><p className="text-xs font-bold uppercase text-[#b9906a]">{item.type}</p><h3 className="mt-2 font-bold">{item.title}</h3><p className="mt-2 text-sm text-[#6f7b73]">{new Date(item.date).toLocaleDateString()}</p></article>)}
            {items.length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-4 text-sm text-[#6f7b73] md:col-span-2">No deadlines yet.</p>}
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center gap-2"><NotebookPen className="text-[#6faebe]" /><h3 className="font-bold">Short notes</h3></div>
          <form className="space-y-3" onSubmit={addNote}>
            <input className="input" name="date" type="date" required />
            <textarea className="input min-h-24" name="text" placeholder="Add a quick planning note..." required />
            <button className="btn-primary w-full">Save note</button>
          </form>
          <div className="mt-5 space-y-3">
            {sortedNotes.map((note: Note) => <article className="rounded-lg border border-[#ded8c9] bg-[#fbf7ee] p-3" key={note.id}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#b9906a]">{new Date(note.date).toLocaleDateString()}</p><p className="mt-1 text-sm text-[#263333]">{note.text}</p></div><button className="rounded-md p-2 text-[#765a40] hover:bg-[#ead5bf]" type="button" onClick={() => saveNotes(notes.filter((item: Note) => item.id !== note.id))} aria-label="Delete note"><Trash2 size={16} /></button></div></article>)}
            {sortedNotes.length === 0 && <p className="rounded-lg bg-[#fbf7ee] p-3 text-sm text-[#6f7b73]">No notes yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
