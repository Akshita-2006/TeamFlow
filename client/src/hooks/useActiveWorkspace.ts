import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

const STORAGE_KEY = "teamflow.activeWorkspaceId";
const CHANGE_EVENT = "teamflow:active-workspace-changed";
const idOf = (value: any) => String(value?._id ?? value ?? "");
const setStoredActiveId = (id: string) => {
  localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
};

export function useActiveWorkspace() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const workspaces = useQuery({ queryKey: ["workspaces"], queryFn: async () => (await api.get("/workspaces")).data.data, refetchInterval: 5000 });
  const workspaceList = workspaces.data ?? [];
  const activeWorkspace = workspaceList.find((item: any) => idOf(item._id) === activeId);
  const ownedWorkspace = workspaceList.find((item: any) => idOf(item.owner) === idOf(auth.user?.id));
  const workspace = activeWorkspace ?? (!activeId ? (ownedWorkspace ?? workspaceList[0]) : undefined);

  useEffect(() => {
    const sync = (event: Event) => setActiveId((event as CustomEvent<string>).detail ?? localStorage.getItem(STORAGE_KEY) ?? "");
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (workspace?._id && workspace._id !== activeId) {
      setStoredActiveId(workspace._id);
    }
  }, [activeId, workspace?._id]);

  const createWorkspace = useMutation({
    mutationFn: async (payload: any) => (await api.post("/workspaces", payload)).data.data,
    onSuccess: (created: any) => {
      setStoredActiveId(created._id);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    }
  });

  function selectWorkspace(id: string) {
    setStoredActiveId(id);
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["my-summary"] });
    qc.invalidateQueries({ queryKey: ["workspace-invites"] });
  }

  const role = workspace?.members?.find((member: any) => idOf(member.user) === idOf(auth.user?.id))?.role ?? "";

  return { workspaces, workspace, role, selectWorkspace, createWorkspace };
}
