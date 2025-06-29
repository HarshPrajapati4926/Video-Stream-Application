const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Stores roomId -> senderSocketId
const sessions = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-room', () => {
    const roomId = uuidv4();
    sessions[roomId] = socket.id;
    socket.emit('room-created', roomId);
    console.log(`Room created: ${roomId}`);
  });

  socket.on('join-room', (roomId) => {
    const senderSocketId = sessions[roomId];
    if (senderSocketId) {
      socket.to(senderSocketId).emit('viewer-joined', socket.id);
      console.log(`Viewer ${socket.id} joined room ${roomId}`);
    }
  });

  socket.on('offer', ({ offer, target }) => {
    io.to(target).emit('offer', { offer, sender: socket.id });
  });

  socket.on('answer', ({ answer, target }) => {
    io.to(target).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ candidate, target }) => {
    io.to(target).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const roomId in sessions) {
      if (sessions[roomId] === socket.id) {
        delete sessions[roomId];
      }
    }
  });
});

// Serve static React files from client build
app.use(express.static(path.join(__dirname, '../client/build')));

// ✅ Fallback route for SPA (fixes path-to-regexp error)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
