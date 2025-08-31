require("dotenv").config();
const express = require("express");
const path = require("path");
const { createBot, getBots } = require("./botManager"); // make sure botManager.js exists

const app = express();
const PORT = process.env.PORT || 3000; // Railway will set process.env.PORT automatically

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Route to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API to add a bot
app.post("/api/addBot", (req, res) => {
  const { username } = req.body;
  try {
    const bot = createBot(username);
    res.json({ success: true, bot: bot.username });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API to list all bots
app.get("/api/bots", (req, res) => {
  res.json(getBots());
});

// Start the web server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

