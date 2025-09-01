const mineflayer = require('mineflayer');
const bots = {};

function createBot(name, host, port = 25565) {
    const bot = mineflayer.createBot({
        username: name,
        host: host,
        port: port,
    });

    bot.customData = {
        status: 'online',
        xp: 0,
        health: 20,
        hunger: 20,
        position: { x: 0, y: 0, z: 0 },
    };

    bot.on('spawn', () => {
        bot.customData.status = 'online';
        updateBotData(bot);
    });

    bot.on('end', () => {
        bot.customData.status = 'offline';
        // Auto reconnect after 5s
        setTimeout(() => {
            createBot(name, host, port);
        }, 5000);
    });

    bot.on('health', () => updateBotData(bot));
    bot.on('move', () => updateBotData(bot));
    bot.on('xp', () => updateBotData(bot));

    bots[name] = bot;
    return bot;
}

function removeBot(name) {
    if (bots[name]) {
        bots[name].quit();
        delete bots[name];
    }
}

function updateBotData(bot) {
    const { x, y, z } = bot.entity.position;
    bot.customData.position = { x, y, z };
    bot.customData.health = bot.health;
    bot.customData.hunger = bot.food;
    bot.customData.xp = bot.experience.total;
}

function moveBot(name, direction, distance = 1) {
    const bot = bots[name];
    if (!bot) return;

    const mcData = require('minecraft-data')(bot.version);
    const movements = {
        forward: { x: 0, z: 1 },
        back: { x: 0, z: -1 },
        left: { x: -1, z: 0 },
        right: { x: 1, z: 0 },
    };

    if (movements[direction]) {
        const { x, z } = movements[direction];
        bot.setControlState('forward', direction === 'forward');
        bot.setControlState('back', direction === 'back');
        bot.setControlState('left', direction === 'left');
        bot.setControlState('right', direction === 'right');

        setTimeout(() => {
            bot.setControlState('forward', false);
            bot.setControlState('back', false);
            bot.setControlState('left', false);
            bot.setControlState('right', false);
        }, distance * 500); // crude estimate: 1 block ~ 500ms
    }
}

function lookBot(name, yawDeg = null, pitchDeg = null, targetBlock = null) {
    const bot = bots[name];
    if (!bot) return;

    if (targetBlock) {
        bot.lookAt(targetBlock.position);
    } else {
        const yawRad = yawDeg !== null ? yawDeg * (Math.PI / 180) : bot.entity.yaw;
        const pitchRad = pitchDeg !== null ? pitchDeg * (Math.PI / 180) : bot.entity.pitch;
        bot.look(yawRad, pitchRad);
    }
}

function selectHotbar(name, slot) {
    const bot = bots[name];
    if (!bot) return;
    bot.setQuickBarSlot(slot);
}

function swapHands(name) {
    const bot = bots[name];
    if (!bot) return;
    bot.swapHeldItem();
}

module.exports = {
    createBot,
    removeBot,
    bots,
    moveBot,
    lookBot,
    selectHotbar,
    swapHands,
};
