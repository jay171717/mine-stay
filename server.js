const express = require("express");
const path = require("path");
const app = express();

// Use the port Railway gives us, or fallback to 3000 locally
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "/")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
