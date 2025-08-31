const express = require('express');
const path = require('path');

const app = express();

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the port Railway provides, fallback to 8080 locally
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));
