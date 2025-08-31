const express = require('express');
const path = require('path');
const app = express();

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Railway sets the port in process.env.PORT
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
