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
    origin: '*', // use '*' in production or set your Render domain
    methods: ['GET', 'POST'],
  },
});

const sessions = {}; // Map roomId => socketId

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('create-room', () => {
    const roomId = uuidv4();
    sessions[roomId] = socket.id;
    socket.emit('room-created', roomId);
  });

  socket.on('join-room', (roomId) => {
    const senderSocketId = sessions[roomId];
    if (senderSocketId) {
      socket.to(senderSocketId).emit('viewer-joined', socket.id);
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
    console.log('Client disconnected');
  });
});

// 🔧 Serve static files from the React frontend
app.use(express.static(path.join(__dirname, '../client/build')));

// 🔁 Serve index.html on all unmatched routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// ✅ Use dynamic port for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
