import { FormEvent, useEffect, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useAuth } from "../store/auth";

const idOf = (value: any) => String(value?._id ?? value ?? "");
const roleFor = (workspace: any, currentUserId: string | undefined) => workspace?.members?.find((member: any) => idOf(member.user) === idOf(currentUserId))?.role ?? "";

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { workspaces, workspace, role, selectWorkspace, createWorkspace } = useActiveWorkspace();
  const currentUserId = useAuth((state) => state.user?.id);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const list = workspaces.data ?? [];

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      const root = document.getElementById("teamflow-workspace-switcher");
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    createWorkspace.mutate({ name });
    setShowCreate(false);
    setOpen(false);
    event.currentTarget.reset();
  }

  return (
    <div className="relative inline-block" id="teamflow-workspace-switcher">
      <button className={compact ? "btn-ghost w-full max-w-full" : "flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-[#ded8c9] bg-[#fffdf8] px-4 py-3 text-left text-[#263333] shadow-sm transition hover:border-[#9fcbd6] sm:min-w-64"} type="button" onClick={() => setOpen((value: boolean) => !value)}>
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#d7edf2] text-[#365f66]"><Building2 size={18} /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">{workspace?.name ?? "Select workspace"}</span>
            {!compact && <span className="block text-xs font-bold uppercase text-[#b9906a]">{role}</span>}
          </span>
        </span>
        <ChevronDown className="shrink-0" size={17} />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[#ded8c9] bg-[#fffdf8] shadow-[0_18px_45px_rgba(74,60,44,0.18)]">
          <div className="border-b border-[#ded8c9] p-3">
            <p className="text-xs font-bold uppercase text-[#b9906a]">Switch workspace</p>
          </div>
          <div className="max-h-72 overflow-auto p-2">
            {list.map((item: any) => (
              <button className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left hover:bg-[#fbf7ee]" key={item._id} type="button" onClick={() => { selectWorkspace(item._id); setOpen(false); }}>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-[#263333]">{item.name}</span>
                  <span className="block text-xs text-[#6f7b73]">{item.members?.length ?? 1} member(s) · {roleFor(item, currentUserId)}</span>
                </span>
                {item._id === workspace?._id && <Check className="text-[#507f8a]" size={18} />}
              </button>
            ))}
          </div>

          {showCreate ? (
            <form className="border-t border-[#ded8c9] bg-[#fbf7ee] p-3" onSubmit={submit}>
              <label className="mb-2 block text-xs font-bold uppercase text-[#b9906a]">New workspace name</label>
              <input className="input mb-3" name="name" placeholder="Design Team Workspace" autoFocus required />
              <div className="flex gap-2">
                <button className="btn-primary flex-1" type="submit">Create</button>
                <button className="btn-ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="flex w-full items-center gap-2 border-t border-[#ded8c9] px-4 py-3 text-sm font-bold text-[#507f8a] hover:bg-[#fbf7ee]" type="button" onClick={() => setShowCreate(true)}><Plus size={16} />Create workspace</button>
          )}
        </div>
      )}
    </div>
  );
}

