const mineflayer = require("mineflayer");
const bots = {};

function createBot(username) {
  const bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT),
    username: username || process.env.MC_USERNAME,
    version: process.env.MC_VERSION
  });

  // Auto respawn if dead
  bot.on("death", () => {
    console.log(`${bot.username} died, respawning...`);
    setTimeout(() => bot.spawn(), 1000);
  });

  // Reconnect if disconnected
  bot.on("end", () => {
    console.log(`${bot.username} disconnected, reconnecting...`);
    setTimeout(() => createBot(username), 3000);
  });

  bots[username] = bot;
  return bot;
}

function getBots() {
  return Object.keys(bots);
}

module.exports = { createBot, getBots };
