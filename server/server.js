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
    socket.on('moveBot', data => botManager.moveBot(data));
    socket.on('selectSlot', slot => {
        if (botManager.bot && botManager.bot.inventory) botManager.bot.setQuickBarSlot(slot);
    });
    socket.on('swapOffhand', () => {
        if (botManager.bot) botManager.bot.swapHands();
    });

    const interval = setInterval(() => {
        socket.emit('botStatus', botManager.getStatus());
    }, 1000);

    socket.on('disconnect', () => clearInterval(interval));
});

server.listen(3000, () => console.log('Server running on port 3000'));
