const express = require("express");
const mineflayer = require("mineflayer");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Create bot
const bot = mineflayer.createBot({
  host: process.env.MC_HOST || "localhost",
  username: process.env.MC_USER || "Bot",
  password: process.env.MC_PASS || null,
});

// Bot events
bot.on("login", () => console.log("Bot logged in!"));
bot.on("error", err => console.log("Bot error:", err));
bot.on("end", () => console.log("Bot disconnected."));

// Simple API for frontend
app.get("/status", (req, res) => {
  res.json({ online: bot.isAlive, username: bot.username });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
