const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { BotManager } = require('./botManager');

const botManager = new BotManager();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Add bot
app.post('/add-bot', (req, res) => {
  const { username } = req.body;
  const bot = botManager.addBot(username);
  res.json(bot);
});

// Remove bot
app.post('/remove-bot', (req, res) => {
  const { username } = req.body;
  botManager.removeBot(username);
  res.json({ success: true });
});

// Get all bots
app.get('/bots', (req, res) => {
  res.json(botManager.getAllBots());
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Web client connected');

  // Send current bots on connection
  socket.emit('bots', botManager.getAllBots());

  // Update status every second
  const interval = setInterval(() => {
    socket.emit('bots', botManager.getAllBots());
  }, 1000);

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
