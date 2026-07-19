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
    //origin: 'https://wordlmaxxing.vercel.app/', 
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});
io.on('connection', (socket) => {
  gameManager.handleConnection(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on :${PORT}`));
