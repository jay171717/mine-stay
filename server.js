// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const BotManager = require('./botManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // serve index.html and other root files

const PORT = process.env.PORT || 8080;
const mcHost = process.env.MC_HOST || 'fakesalmon.aternos.me';
const mcPort = parseInt(process.env.MC_PORT || '25565');
const mcVersion = process.env.MC_VERSION || '1.21.4';

// Create bot manager and pass io so it can emit updates/debug
const botManager = new BotManager({ host: mcHost, port: mcPort, version: mcVersion, io });

// Serve index
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

/*
  REST endpoints used by the UI (client) - some UI actions use fetch.
  The UI also listens to socket.io events for real-time updates from botManager.
*/

// add bot
app.post('/api/bots', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const ok = botManager.addBot(username);
  if (!ok) return res.status(400).json({ error: 'bot exists' });
  return res.json({ success: true });
});

// delete bot completely
app.delete('/api/bots/:username', (req, res) => {
  const { username } = req.params;
  const ok = botManager.removeBot(username);
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.json({ success: true });
});

// toggle online/offline
app.post('/api/bots/:username/toggle', (req, res) => {
  const { username } = req.params;
  const ok = botManager.toggleBot(username);
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.json({ success: true });
});

// select hotbar slot
app.post('/api/bots/:username/selectSlot', (req, res) => {
  const { username } = req.params;
  const { slot } = req.body; // 0..8
  const ok = botManager.selectHotbarSlot(username, slot);
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.json({ success: true });
});

// swap main and offhand
app.post('/api/bots/:username/swap', (req, res) => {
  const { username } = req.params;
  const ok = botManager.swapMainOffhand(username);
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.json({ success: true });
});

// movement - start/stop continuous
app.post('/api/bots/:username/move', (req, res) => {
  const { username } = req.params;
  const { direction, enable } = req.body; // direction: forward/back/left/right
  const ok = botManager.setMoveState(username, direction, !!enable);
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.json({ success: true });
});

// move X blocks (direction, blocks)
app.post('/api/bots/:username/moveBlocks', (req, res) => {
  const { username } = req.params;
  const { direction, blocks } = req.body;
  const ok = botManager.moveBlocks(username, direction, Number(blocks));
  if (!ok) return res.status(404).json({ error: 'not found or bot offline' });
  return res.json({ success: true });
});

// look by degrees (yaw, pitch in degrees)
app.post('/api/bots/:username/look', (req, res) => {
  const { username } = req.params;
  const { yaw, pitch } = req.body;
  const ok = botManager.lookDegrees(username, Number(yaw), Number(pitch));
  if (!ok) return res.status(404).json({ error: 'not found or bot offline' });
  return res.json({ success: true });
});

// look at block coordinates
app.post('/api/bots/:username/lookAt', (req, res) => {
  const { username } = req.params;
  const { x, y, z } = req.body;
  const ok = botManager.lookAt(username, { x: Number(x), y: Number(y), z: Number(z) });
  if (!ok) return res.status(404).json({ error: 'not found or bot offline' });
  return res.json({ success: true });
});

// go to coordinate (simple forward movement -- not pathfinder)
app.post('/api/bots/:username/goTo', (req, res) => {
  const { username } = req.params;
  const { x, y, z } = req.body;
  const ok = botManager.goTo(username, { x: Number(x), y: Number(y), z: Number(z) });
  if (!ok) return res.status(404).json({ error: 'not found or bot offline' });
  return res.json({ success: true });
});

// client socket.io connections (UI subscribes here)
io.on('connection', socket => {
  console.log('UI connected via socket.io');
  // send full bots list immediately
  socket.emit('bots', botManager.listBots());
  // no need to handle UI socket events here; UI uses REST endpoints
  socket.on('disconnect', () => {
    // nothing special
  });
});

// have botManager emit events to io
botManager.on('update', () => {
  io.emit('bots', botManager.listBots());
});
botManager.on('debug', msg => {
  io.emit('debug', msg);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
