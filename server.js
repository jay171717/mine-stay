const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { BotManager } = require('./botManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const botManager = new BotManager(io);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('addBot', (botName) => {
    botManager.addBot(botName);
  });

  socket.on('removeBot', (botName) => {
    botManager.removeBot(botName);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
