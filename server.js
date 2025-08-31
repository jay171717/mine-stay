require("dotenv").config();
const express = require("express");
const path = require("path");
const { createBot, getBots } = require("./botManager");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API to add bot
app.post("/api/addBot", (req, res) => {
  const { username } = req.body;
  const bot = createBot(username);
  res.json({ success: true, bot: bot.username });
});

// API to list bots
app.get("/api/bots", (req, res) => {
  res.json(getBots());
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
