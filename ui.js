const socket = io();

const botList = document.getElementById('botList');
let selectedBot = null;

function addBotUI(botName, host) {
    socket.emit('addBot', { name: botName, host });
}

function removeBotUI(botName) {
    socket.emit('removeBot', { name: botName });
}

function selectBot(botName) {
    selectedBot = botName;
}

function moveBot(direction, distance) {
    if (!selectedBot) return;
    socket.emit('moveBot', { name: selectedBot, direction, distance });
}

function lookBot(yaw, pitch, target = null) {
    if (!selectedBot) return;
    socket.emit('lookBot', { name: selectedBot, yaw, pitch, target });
}

function selectHotbar(slot) {
    if (!selectedBot) return;
    socket.emit('selectHotbar', { name: selectedBot, slot });
}

function swapHands() {
    if (!selectedBot) return;
    socket.emit('swapHands', { name: selectedBot });
}

socket.on('updateBots', data => {
    botList.innerHTML = '';
    for (const name in data) {
        const bot = data[name];
        const div = document.createElement('div');
        div.innerHTML = `
            <b>${name}</b> [Status: ${bot.status}] [Health: ${bot.health}] [Hunger: ${bot.hunger}] [XP: ${bot.xp}]
            [<button onclick="selectBot('${name}')">Select</button>]
            [<button onclick="removeBotUI('${name}')">Remove</button>]
        `;
        botList.appendChild(div);
    }
});
