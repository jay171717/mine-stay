import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { BotManager } from "./botManager.js";
import { startServerStatusLoop, getLatestStatus } from "./serverStatus.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve UI
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// config (defaults for your Aternos cracked server)
const MC_HOST = process.env.MC_HOST || "fakesalmon.aternos.me";
const MC_PORT = parseInt(process.env.MC_PORT || "25565", 10);
const MC_VERSION = process.env.MC_VERSION || "1.21.4";
const DEFAULT_AUTO_RECONNECT = process.env.AUTO_RECONNECT === "false" ? false : true;

// managers
const bots = new BotManager({
  host: MC_HOST,
  port: MC_PORT,
  version: MC_VERSION,
  autoReconnect: DEFAULT_AUTO_RECONNECT
});

// REST helpers (optional)
app.get("/api/status", (_req, res) => {
  res.json({
    server: getLatestStatus(),
    bots: bots.summary()
  });
});

// socket wiring
io.on("connection", (socket) => {
  // send initial state
  socket.emit("bootstrap", {
    server: getLatestStatus(),
    bots: bots.summary()
  });

  // server status push
  const statusInterval = setInterval(() => {
    socket.emit("serverStatus", getLatestStatus());
  }, 3000);

  // --- bot lifecycle ---
  socket.on("addBot", ({ name }) => {
    try {
      bots.addBot(name);
      io.emit("bots", bots.summary());
    } catch (e) {
      socket.emit("errorMsg", e.message);
    }
  });

  socket.on("removeBot", ({ id }) => {
    bots.removeBot(id);
    io.emit("bots", bots.summary());
  });

  socket.on("startBot", ({ id }) => {
    bots.startBot(id);
  });

  socket.on("stopBot", ({ id }) => {
    bots.stopBot(id);
  });

  // --- inventory / slots ---
  socket.on("selectHotbar", ({ id, slot }) => {
    bots.selectHotbar(id, slot);
  });

  // --- movement ---
  socket.on("setMovement", ({ id, control, mode, blocks }) => {
    // control: "forward"|"back"|"left"|"right"
    // mode: "once" (x blocks), "continuous", "stop"
    bots.setMovement(id, control, mode, blocks);
  });

  // --- looking ---
  socket.on("nudgeLook", ({ id, yawDeg, pitchDeg }) => {
    bots.nudgeLook(id, yawDeg, pitchDeg);
  });

  socket.on("lookAtBlock", ({ id, x, y, z }) => {
    bots.lookAtBlock(id, x, y, z);
  });

  // --- actions ---
  // action: "jump"|"sneak"|"leftClick"|"rightClick"|"drop"|"dropStack"|"useItem"
  // mode: "once"|"interval"|"continuous"|"stop"
  // intervalGt: number of game ticks for interval (1gt = 50ms)
  socket.on("doAction", ({ id, action, mode = "once", intervalGt = 4 }) => {
    bots.doAction(id, action, mode, intervalGt);
  });

  socket.on("disconnect", () => {
    clearInterval(statusInterval);
  });
});

// wire updates from bots to UI
bots.onAnyUpdate((payload) => {
  io.emit(payload.type, payload.data);
});

// ping Aternos regularly
startServerStatusLoop(MC_HOST, MC_PORT);

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Web UI: http://localhost:${PORT}  (Railway will show "Open App")`);
  console.log(`Target server: ${MC_HOST}:${MC_PORT} (version ${MC_VERSION})`);
});
