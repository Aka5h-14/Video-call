const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({
  origin: ["https://192.168.29.89:5173", "http://192.168.29.89:5173", "https://localhost:5173", "http://localhost:5173"],
  methods: ["GET", "POST"],
  credentials: true
}));

// SSL certificate
const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

const httpsServer = https.createServer(options, app);

const io = new Server(httpsServer, {
  cors: {
    origin: ["https://192.168.29.89:5173", "http://192.168.29.89:5173", "https://localhost:5173", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

httpsServer.on('error', (error) => {
  console.error('HTTPS Server Error:', error);
});


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    // console.log('Current room members:', roomMembers);

    if (roomMembers.length > 2) {
      io.to(socket.id).emit('room-full');
      // console.log("Room is full");
      return;
    }

    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('offer', ({ to, offer }) => {
    // console.log(`Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    // console.log(`Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    // console.log(`ICE candidate from ${socket.id} to ${to}`);
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 3000;

httpsServer.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTPS Server listening on https://192.168.29.89:${PORT}`);
});