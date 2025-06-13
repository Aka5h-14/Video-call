const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} joining room ${roomId}`);
    
    const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    
    if (roomMembers.length > 2) {
      socket.emit('room-full');
      return;
    }
    
    socket.join(roomId);
    console.log(`Room ${roomId} members:`, roomMembers);
    
    socket.to(roomId).emit('user-joined', socket.id);
    
    const otherUsers = roomMembers.filter(id => id !== socket.id);
    socket.emit('room-users', otherUsers);
  });

  socket.on('offer', ({ to, offer }) => {
    console.log(`Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    console.log(`Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`ICE candidate from ${socket.id} to ${to}`);
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-left', socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 