// socket.js
const { Server } = require('socket.io');
const http = require("http");
const express = require("express");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connect', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(3001, () => {
    console.log("Socket is running on port 3001");
});

module.exports = { io, server };
