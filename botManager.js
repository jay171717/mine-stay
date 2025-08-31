const mineflayer = require('mineflayer');

class BotManager {
  constructor() {
    this.bots = {}; // { username: botData }
  }

  addBot(username) {
    if (this.bots[username]) return this.bots[username];

    const bot = mineflayer.createBot({
      host: 'fakesalmon.aternos.me',
      port: 25565,
      username: username,
      version: '1.21.4'
    });

    const botData = {
      username,
      bot,
      online: true,
      position: null,
      health: 20,
      food: 20,
      xp: 0,
      dimension: null,
      uptime: 0,
      lastTick: Date.now()
    };

    bot.on('spawn', () => {
      console.log(`${username} spawned`);
      botData.online = true;
      botData.position = bot.entity.position;
      botData.dimension = bot.dimension;
      botData.health = bot.health;
      botData.food = bot.food;
      botData.xp = bot.experience.level;
    });

    bot.on('health', () => {
      botData.health = bot.health;
      botData.food = bot.food;
    });

    bot.on('experience', () => {
      botData.xp = bot.experience.level;
    });

    bot.on('end', () => {
      console.log(`${username} disconnected, attempting reconnect...`);
      botData.online = false;
      setTimeout(() => {
        this.removeBot(username);
        this.addBot(username);
      }, 5000);
    });

    // Uptime tracking
    setInterval(() => {
      if (botData.online) {
        botData.uptime = Math.floor((Date.now() - botData.lastTick) / 1000);
        botData.position = bot.entity?.position || botData.position;
      }
    }, 1000);

    this.bots[username] = botData;
    return botData;
  }

  removeBot(username) {
    if (!this.bots[username]) return;
    const botData = this.bots[username];
    botData.bot.quit();
    delete this.bots[username];
  }

  getAllBots() {
    return Object.values(this.bots).map(bot => ({
      username: bot.username,
      online: bot.online,
      position: bot.position,
      health: bot.health,
      food: bot.food,
      xp: bot.xp,
      dimension: bot.dimension,
      uptime: bot.uptime
    }));
  }
}

module.exports = { BotManager };
