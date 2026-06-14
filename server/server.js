const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const gameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());

// Serve static files from parent folder (project root)
app.use(express.static(path.join(__dirname, '../')));

// Route for default index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Setup Socket.IO connection handling
io.on('connection', (socket) => {
    gameManager.handleConnection(io, socket);
});

// Listen on Port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Wordlmaxxing server running at http://localhost:${PORT}`);
});
