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

// Create storage directories if they don't exist
const storageDir = path.join(__dirname, 'storage');
const sessionsDir = path.join(storageDir, 'sessions');

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

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
  maxHttpBufferSize: 1e8 // 100MB buffer size
});

httpsServer.on('error', (error) => {
  console.error('HTTPS Server Error:', error);
});

// Store active recording sessions
const activeSessions = new Map();
// Store user mappings
const userMappings = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

    if (roomMembers.length > 2) {
      io.to(socket.id).emit('room-full');
      return;
    }

    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);

    // Initialize recording session when second user joins
    if (roomMembers.length === 1) {
      const sessionId = `${roomId}_${Date.now()}`;
      const sessionDir = path.join(sessionsDir, sessionId);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Create user directories
      const user1Dir = path.join(sessionDir, 'user1');
      const user2Dir = path.join(sessionDir, 'user2');
      fs.mkdirSync(user1Dir, { recursive: true });
      fs.mkdirSync(user2Dir, { recursive: true });

      activeSessions.set(roomId, {
        sessionId,
        sessionDir,
        user1: roomMembers[0],
        user2: socket.id,
        startTime: Date.now(),
        user1Dir,
        user2Dir,
        user1Chunks: 0,
        user2Chunks: 0
      });

      // Map users to their directories
      userMappings.set(roomMembers[0], { roomId, isUser1: true });
      userMappings.set(socket.id, { roomId, isUser1: false });
    } else if (roomMembers.length === 2) {
      // Map the second user if they're joining an existing session
      const session = activeSessions.get(roomId);
      if (session) {
        userMappings.set(socket.id, { roomId, isUser1: false });
      }
    }
  });

  socket.on('media-chunk', ({ roomId, chunk, type, timestamp, chunkIndex }) => {
    const session = activeSessions.get(roomId);
    if (!session) return;

    const userMapping = userMappings.get(socket.id);
    if (!userMapping) return;

    const userDir = userMapping.isUser1 ? session.user1Dir : session.user2Dir;
    const fileName = `chunk_${chunkIndex.toString().padStart(6, '0')}.webm`;
    const filePath = path.join(userDir, fileName);

    // Convert ArrayBuffer to Buffer and write to file
    const buffer = Buffer.from(chunk);
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        console.error('Error saving chunk:', err);
        socket.emit('chunk-error', { error: 'Failed to save chunk' });
      } else {
        // Update chunk count
        if (userMapping.isUser1) {
          session.user1Chunks++;
        } else {
          session.user2Chunks++;
        }
        console.log(`Saved chunk ${chunkIndex} for ${userMapping.isUser1 ? 'user1' : 'user2'}`);
      }
    });
  });

  socket.on('disconnect', () => {
    // Clean up user mapping
    userMappings.delete(socket.id);

    // Clean up any active sessions when user disconnects
    for (const [roomId, session] of activeSessions.entries()) {
      if (session.user1 === socket.id || session.user2 === socket.id) {
        console.log(`Session ended. User1 chunks: ${session.user1Chunks}, User2 chunks: ${session.user2Chunks}`);
        activeSessions.delete(roomId);
        break;
      }
    }
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