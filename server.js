const express = require("express");
const path = require("path");
const { createBot, getBots } = require("./botManager");

const app = express();
const PORT = process.env.PORT || 3000; // Railway automatically sets PORT

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Serve index.html
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
app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});


