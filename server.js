const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createBot, removeBot, bots, moveBot, lookBot, selectHotbar, swapHands } = require('./botManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', socket => {
    socket.on('addBot', ({ name, host }) => {
        createBot(name, host);
        io.emit('updateBots', getAllBotsData());
    });

    socket.on('removeBot', ({ name }) => {
        removeBot(name);
        io.emit('updateBots', getAllBotsData());
    });

    socket.on('moveBot', ({ name, direction, distance }) => {
        moveBot(name, direction, distance);
    });

    socket.on('lookBot', ({ name, yaw, pitch, target }) => {
        lookBot(name, yaw, pitch, target);
    });

    socket.on('selectHotbar', ({ name, slot }) => selectHotbar(name, slot));
    socket.on('swapHands', ({ name }) => swapHands(name));

    const interval = setInterval(() => {
        io.emit('updateBots', getAllBotsData());
    }, 500);

    socket.on('disconnect', () => clearInterval(interval));
});

function getAllBotsData() {
    const result = {};
    for (const name in bots) {
        result[name] = bots[name].customData;
    }
    return result;
}

server.listen(process.env.PORT || 8080, '0.0.0.0', () => {
    console.log(`✅ Web server running on port ${process.env.PORT || 8080}`);
});
