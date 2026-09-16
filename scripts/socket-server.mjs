import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketServer } from "../lib/socket/server.mjs";

const port = parseInt(process.env.SOCKET_PORT || "3001", 10);
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "arena-socket-server", port }));
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/api/socketio",
  pingInterval: 10000,
  pingTimeout: 5000,
});

setupSocketServer(io);

httpServer.listen(port, () => {
  console.log(`> [Arena Standalone Socket] Running on http://localhost:${port}`);
  console.log(`> [Arena Standalone Socket] Socket.IO endpoint: http://localhost:${port}/api/socketio`);
});
