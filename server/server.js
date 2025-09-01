const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const BotManager = require('./botManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const botManager = new BotManager();
app.use(express.static('../client'));

io.on('connection', (socket) => {
    socket.on('startBot', (options) => botManager.startBot(options));
    socket.on('stopBot', () => botManager.stopBot());

    setInterval(() => {
        socket.emit('botStatus', botManager.getStatus());
    }, 1000);

    socket.on('moveBot', data => {
        // Movement logic handled server-side with pathfinder
    });
    socket.on('selectSlot', slot => {});
    socket.on('swapOffhand', () => {});
});

server.listen(3000, () => console.log('Server running on port 3000'));
