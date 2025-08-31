const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { BotManager } = require('./botManager'); // updated botManager.js
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const botManager = new BotManager();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Add bot
app.post('/add-bot', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  botManager.addBot(username);
  res.json({ success: true });
  emitBotsUpdate();
});

// Toggle bot enabled/disabled
app.post('/toggle-bot', (req, res) => {
  const { username } = req.body;
  botManager.toggleBot(username);
  res.json({ success: true });
  emitBotsUpdate();
});

// Remove bot
app.post('/remove-bot', (req, res) => {
  const { username } = req.body;
  botManager.removeBot(username);
  res.json({ success: true });
  emitBotsUpdate();
});

// Socket.io connection for live updates
io.on('connection', (socket) => {
  console.log('Client connected');
  // Send initial bot data
  socket.emit('bots', botManager.getAllBots());

  // Interval to push live updates
  const interval = setInterval(() => {
    socket.emit('bots', botManager.getAllBots());
  }, 1000);

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

// Function to emit updates to all clients
function emitBotsUpdate() {
  io.emit('bots', botManager.getAllBots());
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
