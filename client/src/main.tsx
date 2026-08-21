import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Landing } from "./pages/Landing";
import { HowTo } from "./pages/HowTo";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { ProjectBoard } from "./pages/ProjectBoard";
import { Workload } from "./pages/Workload";
import { Notifications } from "./pages/Notifications";
import { Team } from "./pages/Team";
import { MemberProfile } from "./pages/MemberProfile";
import { Profile } from "./pages/Profile";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { AcceptInvite } from "./pages/AcceptInvite";
import { WorkspaceSettings } from "./pages/WorkspaceSettings";
import { AuditLog } from "./pages/AuditLog";
import { CalendarView } from "./pages/CalendarView";
import { useAuth } from "./store/auth";
import "./styles.css";

const queryClient = new QueryClient();

function Protected({ children }: { children: any }) {
  return useAuth.getState().token ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<Landing />} />
          <Route path="/how-to" element={<HowTo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/app" element={<Protected><AppShell /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectBoard />} />
            <Route path="projects/:projectId/workload" element={<Workload />} />
            <Route path="team" element={<Team />} />
            <Route path="workspaces/:workspaceId/members/:userId" element={<MemberProfile />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<WorkspaceSettings />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="calendar" element={<CalendarView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);




