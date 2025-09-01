const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const BotManager = require('./botManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));
app.use(bodyParser.json());

const manager = new BotManager(io);

// API Endpoints
app.post('/api/bots', (req,res)=>{
  const { username } = req.body;
  if(!username) return res.status(400).send('Username required');
  manager.addBot(username);
  res.sendStatus(200);
});

app.delete('/api/bots/:username', (req,res)=>{
  manager.removeBot(req.params.username);
  res.sendStatus(200);
});

app.post('/api/toggle/:username', (req,res)=>{
  manager.toggleBot(req.params.username);
  res.sendStatus(200);
});

app.post('/api/move/:username', (req,res)=>{
  manager.handleMove(req.params.username, req.body);
  res.sendStatus(200);
});

app.post('/api/look/:username', (req,res)=>{
  manager.handleLookDelta(req.params.username, req.body);
  res.sendStatus(200);
});

app.post('/api/lookat/:username', (req,res)=>{
  manager.handleLookAt(req.params.username, req.body);
  res.sendStatus(200);
});

app.post('/api/goto/:username', (req,res)=>{
  manager.handleGoTo(req.params.username, req.body);
  res.sendStatus(200);
});

server.listen(3000, ()=>console.log('Server running on port 3000'));
