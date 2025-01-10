// socket.js
const { Server } = require('socket.io');
const http = require("http");
let io;

const initializeSocket = (app) => {
    const server = http.createServer(app);

    // Gắn socket vào server chính
    io = new Server(server, {
        cors: {
            origin: "*", // Cho phép tất cả các domain. Thay đổi thành domain cụ thể nếu cần.
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Các phương thức HTTP được phép
            allowedHeaders: ["Content-Type", "Authorization"], // Các header được phép
        },
    });

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return { server, io };
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io chưa được khởi tạo!");
    }
    return io;
};

module.exports = { initializeSocket, getIO };
