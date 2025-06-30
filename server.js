// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://group-6-vac-work.vercel.app", // Next.js runs on 3000 by default
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("send-message", (data) => {
    console.log("Message received:", data);
    io.emit("receive-message", data + " server_recieved");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(4000, () => {
  console.log("Socket.IO server listening on http://localhost:4000");
});
