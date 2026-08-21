import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, CalendarClock, ClipboardList, FolderKanban, LayoutDashboard, Menu, Settings, UserCircle, Users, Workflow, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { api, socket } from "../lib/api";

export function AppShell() {
  const auth = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showBack = location.pathname !== "/app";
  const showSidebar = location.pathname === "/app";
  const unread = useQuery({ queryKey: ["notifications", "unread-count"], queryFn: async () => (await api.get("/notifications/unread-count")).data.data.count, refetchInterval: 5000 });
  const navClass = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${isActive ? "bg-[#9fcbd6] text-[#263333]" : "text-[#edf0df] hover:bg-[#263333] hover:text-white"}`;

  useEffect(() => {
    if (!auth.user?.id) return;
    socket.connect();
    socket.emit("user:join", auth.user.id);
    socket.on("notification:new", () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });
    return () => {
      socket.emit("user:leave", auth.user?.id);
      socket.off("notification:new");
    };
  }, [auth.user?.id, qc]);

  const sidebar = (
    <aside className="flex h-full w-[min(18rem,85vw)] flex-col bg-[#2f3f3f] p-5 text-white">
      <button className="mb-6 flex items-center gap-3 text-left" type="button" onClick={() => { setMobileOpen(false); navigate("/app"); }}>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#9fcbd6] text-[#263333] shadow-[0_12px_24px_rgba(159,203,214,0.25)]"><Workflow size={24} /></span>
        <span><span className="block text-2xl font-black tracking-normal">TeamFlow</span><span className="block text-xs font-bold uppercase text-[#d8c0a8]">Delivery workspace</span></span>
      </button>
      <nav className="space-y-2" onClick={() => setMobileOpen(false)}>
        <NavLink end className={navClass} to="/app"><LayoutDashboard size={18} />Dashboard</NavLink>
        <NavLink className={navClass} to="/app/projects"><FolderKanban size={18} />Projects</NavLink>
        <NavLink className={navClass} to="/app/team"><Users size={18} />Team</NavLink>
        <NavLink className={navClass} to="/app/profile"><UserCircle size={18} />Profile</NavLink>
        <NavLink className={navClass} to="/app/calendar"><CalendarClock size={18} />Calendar</NavLink>
        <NavLink className={navClass} to="/app/audit"><ClipboardList size={18} />Audit</NavLink>
        <NavLink className={navClass} to="/app/settings"><Settings size={18} />Settings</NavLink>
        <NavLink className={navClass} to="/app/notifications"><span className="relative"><Bell size={18} />{Number(unread.data ?? 0) > 0 && <span className="absolute -right-3 -top-3 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#d8c0a8] px-1 text-xs font-black text-[#263333]">{unread.data}</span>}</span>Notifications</NavLink>
      </nav>
      <p className="mt-auto rounded-lg bg-[#263333] p-3 text-xs leading-5 text-[#edf0df]">Work stays project-wise: submissions, reviews, delivery files, blockers and members are scoped to the project you open.</p>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f2f3e7]">
      {showSidebar && <div className="fixed inset-y-0 left-0 z-30 hidden md:block">{sidebar}</div>}
      {showSidebar && mobileOpen && <div className="fixed inset-0 z-40 md:hidden"><button className="absolute inset-0 bg-[#263333]/50" type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" />{sidebar}</div>}
      <main className={showSidebar ? "md:pl-72" : ""}>
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#ded8c9] bg-[#fffdf8]/90 px-3 py-2 backdrop-blur sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {showSidebar && <button className="btn-ghost md:hidden" type="button" onClick={() => setMobileOpen((value: boolean) => !value)} aria-label="Open menu">{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>}
            {showBack && <button className="btn-ghost px-3 sm:inline-flex" type="button" onClick={() => navigate(-1)}><ArrowLeft size={18} /><span className="hidden sm:inline">Back</span></button>}
          </div>
          <div className="relative">
            <button className="flex min-w-0 items-center gap-2 rounded-lg border border-[#ded8c9] bg-[#fffdf8] px-3 py-2 text-left hover:bg-[#edf0df]" type="button" onClick={() => navigate("/app/profile")}>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#edf0df] text-[#507f8a]"><UserCircle size={20} /></span>
              <span className="hidden min-w-0 sm:block"><span className="block text-[11px] font-bold uppercase text-[#b9906a]">Profile</span><span className="block max-w-44 truncate font-bold hover:text-[#507f8a]">{auth.user?.name}</span></span>
            </button>
          </div>
        </header>
        <div className="p-4 lg:p-7"><Outlet /></div>
      </main>
    </div>
  );
}
