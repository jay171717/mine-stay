const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const botManager = require("./botManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname)); // serve everything in root (including index.html)

io.on("connection", (socket) => {
  console.log("Client connected");

  // Send existing bots to the client
  socket.emit("updateBots", botManager.getBotsData());

  // Add bot
  socket.on("addBot", (name) => {
    botManager.addBot(name);
    io.emit("updateBots", botManager.getBotsData());
  });

  // Remove / Toggle bot
  socket.on("toggleBot", (name) => {
    botManager.toggleBot(name);
    io.emit("updateBots", botManager.getBotsData());
  });

  // Listen for requests for bot status
  socket.on("getBotStatus", (name) => {
    const status = botManager.getBotStatus(name);
    socket.emit("botStatus", status);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
