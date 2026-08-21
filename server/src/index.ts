import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.clientUrl, credentials: true } });
app.set("io", io);

io.on("connection", (socket) => {
  socket.on("user:join", (userId: string) => socket.join(`user:${userId}`));
  socket.on("user:leave", (userId: string) => socket.leave(`user:${userId}`));
  socket.on("project:join", (projectId: string) => socket.join(`project:${projectId}`));
  socket.on("project:leave", (projectId: string) => socket.leave(`project:${projectId}`));
});

await mongoose.connect(config.mongoUri);
server.listen(config.port, () => console.log(`TeamFlow API running on ${config.port}`));
