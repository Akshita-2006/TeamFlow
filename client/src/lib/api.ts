import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "../store/auth";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api" });
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000", { autoConnect: false });
