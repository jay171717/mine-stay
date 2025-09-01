const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const BotManager = require('./botManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve client files
app.use(express.static(path.join(__dirname, '../client')));

// Ensure root URL serves index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const botManager = new BotManager();

io.on('connection', (socket) => {
    console.log('A client connected');

    socket.on('startBot', (options) => {
        botManager.startBot(options);
        console.log(`Bot started with username: ${options.username}`);
    });

    socket.on('stopBot', () => {
        botManager.stopBot();
        console.log('Bot stopped');
    });

    setInterval(() => {
        socket.emit('botStatus', botManager.getStatus());
    }, 1000);

    socket.on('moveBot', data => {
        // Movement logic handled server-side with pathfinder
    });

    socket.on('selectSlot', slot => {
        // Handle slot selection
    });

    socket.on('swapOffhand', () => {
        // Handle offhand swap
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
