const express = require('express');
const path = require('path');

const app = express();

// Serve index.html from root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the port Render assigns or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
