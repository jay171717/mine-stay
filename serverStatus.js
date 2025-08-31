// Placeholder to check server status
const util = require("minecraft-server-util");

async function getStatus() {
  try {
    const status = await util.status(process.env.MC_HOST, { port: parseInt(process.env.MC_PORT) });
    return { online: true, players: status.players.online };
  } catch (err) {
    return { online: false };
  }
}

module.exports = { getStatus };
