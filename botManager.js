const mineflayer = require('mineflayer');

class BotManager {
  constructor() {
    this.bots = {}; // { username: botData }
  }

  addBot(username) {
    if (this.bots[username]) return this.bots[username];

    const botData = {
      username,
      bot: null,
      online: false,
      enabled: true, // toggles whether the bot should stay online
      position: null,
      health: 20,
      food: 20,
      xp: 0,
      dimension: null,
      uptime: 0,
      lastTick: Date.now()
    };

    const spawnBot = () => {
      const bot = mineflayer.createBot({
        host: 'fakesalmon.aternos.me',
        port: 25565,
        username,
        version: '1.21.4'
      });

      botData.bot = bot;

      bot.on('spawn', () => {
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
        botData.online = false;
        if (botData.enabled) {
          setTimeout(() => spawnBot(), 5000);
        }
      });
    };

    spawnBot();

    // Uptime tracking
    setInterval(() => {
      if (botData.online) {
        botData.uptime = Math.floor((Date.now() - botData.lastTick) / 1000);
        botData.position = botData.bot.entity?.position || botData.position;
      }
    }, 1000);

    this.bots[username] = botData;
    return botData;
  }

  toggleBot(username) {
    const botData = this.bots[username];
    if (!botData) return;
    botData.enabled = !botData.enabled;
    if (!botData.enabled && botData.bot) {
      botData.bot.quit();
    } else if (botData.enabled && !botData.online) {
      // Respawn if currently offline
      this.addBot(username);
    }
  }

  removeBot(username) {
    const botData = this.bots[username];
    if (!botData) return;
    botData.enabled = false;
    if (botData.bot) botData.bot.quit();
    delete this.bots[username];
  }

  getAllBots() {
    return Object.values(this.bots).map(bot => ({
      username: bot.username,
      online: bot.online,
      enabled: bot.enabled,
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
