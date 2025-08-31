const mineflayer = require('mineflayer');

class BotManager {
  constructor(io) {
    this.io = io;
    this.bots = {};
  }

  addBot(name) {
    if (this.bots[name]) return;
    const bot = mineflayer.createBot({
      host: 'fakesalmon.aternos.me',
      port: 25565,
      username: name,
      version: '1.21.4'
    });

    bot.on('spawn', () => {
      console.log(`${name} spawned`);
      this.io.emit('botStatus', { name, status: 'online' });
    });

    bot.on('end', () => {
      console.log(`${name} disconnected, reconnecting...`);
      setTimeout(() => this.addBot(name), 3000);
    });

    bot.on('death', () => {
      console.log(`${name} died, respawning...`);
      bot.emit('respawn');
    });

    this.bots[name] = bot;
  }

  removeBot(name) {
    const bot = this.bots[name];
    if (!bot) return;
    bot.quit();
    delete this.bots[name];
    this.io.emit('botStatus', { name, status: 'offline' });
  }
}

module.exports = { BotManager };
