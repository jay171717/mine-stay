import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import mineflayer from "mineflayer";

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer);

app.use(express.static(".")); // Serve root folder

let bot = null;
let isBotOnline = false;
let reconnecting = false;

// Broadcast log messages to Debug tab
function log(message) {
  console.log(message);
  io.emit("debug", message);
}

function createBot() {
  if (bot) {
    bot.removeAllListeners();
    bot.end();
    bot = null;
  }

  log("⛏️ Creating bot...");

  bot = mineflayer.createBot({
    host: "localhost", // <-- change to your server IP
    port: 25565,
    username: "wow",
  });

  bot.on("login", () => {
    log("✅ Bot logged in!");
    isBotOnline = true;
    io.emit("status", isBotOnline);
  });

  bot.on("end", () => {
    log("⚠️ Bot disconnected.");
    isBotOnline = false;
    io.emit("status", isBotOnline);

    if (!reconnecting) {
      reconnecting = true;
      setTimeout(() => {
        reconnecting = false;
        createBot();
      }, 5000); // auto-reconnect delay
    }
  });

  bot.on("error", (err) => {
    log(`❌ Error: ${err.message}`);
  });
}

// WebSocket events
io.on("connection", (socket) => {
  log("📡 Client connected to WebSocket");
  socket.emit("status", isBotOnline);

  socket.on("toggle", () => {
    if (isBotOnline) {
      log("🛑 Stopping bot...");
      if (bot) bot.end();
    } else {
      log("▶️ Starting bot...");
      createBot();
    }
  });

  socket.on("sendCommand", (cmd) => {
    if (isBotOnline && bot) {
      log(`💬 Executing: ${cmd}`);
      bot.chat(cmd);
    } else {
      log("⚠️ Bot is offline, cannot run command.");
    }
  });
});

httpServer.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
