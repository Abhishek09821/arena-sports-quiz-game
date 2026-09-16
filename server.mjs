import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketServer } from "./lib/socket/server.mjs";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  setupSocketServer(io);

  httpServer.listen(port, () => {
    console.log(`> [Arena] Server listening on http://localhost:${port} (${dev ? "development" : "production"})`);
    console.log(`> [Arena] Socket.IO server running on path /api/socketio`);
  });
});
