require('dotenv').config()
const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { User, Admin } = require('./db/index')
const { adminAuth } = require('./middleware/admin')
const { auth } = require('express-oauth2-jwt-bearer');

const jwtCheck = auth({
  audience: process.env.API_IDENTIFIER,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

// enforce on all endpoints

const app = express();
app.use(cors({
  origin: ["https://192.168.29.89:5173", "http://192.168.29.89:5173", "https://localhost:5173", "http://localhost:5173"],
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Video Call app backend");
});

// send email and password for auth
app.post('/api/admin/videos', adminAuth, async (req, res) => {
  try {
    // req.admin is set by adminAuth middleware
    const videos = req.admin.videos || [];
    res.status(200).json({ verified: true, videos });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin videos' });
  }
});

// Apply jwtCheck to all routes after this point
app.use(jwtCheck);

app.post("/api/addUser", async (req, res) => {
  const user = req.auth;
  const { authId , email } = req.body;
  if (!user) {
    res.status(401).send("Not found");
    return;
  }

  if (!authId || !email) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const user = await User.findOneAndUpdate(
      { email: email }, // find
      { auth0Id: authId, email:email, videos: [] }, // Data to set if found, or to create if not found
      { upsert: true, new: true }
    );
    return res.status(200).send("user added")
  } catch (error) {
    console.error('Error finding or creating user in mongoose:', error);
  }
  res.status(400).send("user not added")

})

app.post("/api/userVideos", async (req, res) => {
  const user = req.auth;
  const { authId , email } = req.body;
  if (!user) {
    res.status(401).send("Not found");
    return;
  }

  try {
    const dbUser = await User.findOne({ email: email });
    if (dbUser) {
      res.send({ videos: dbUser.videos });
      return;
    } else {
      res.status(401).send("Not found");
      return;
    }
  } catch (err) {
    // Only send error if a response hasn't already been sent
    if (!res.headersSent) {
      res.status(500).send("Server error");
    }
  }
});


// Create storage directories if they don't exist
const sessionsDir = path.join(__dirname, 'sessions');

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

  socket.on('join-room', async ({ roomId, email }) => {
    const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

    if (roomMembers.length > 2) {
      io.to(socket.id).emit('room-full');
      return;
    }

    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { socketId: socket.id, email });

    // Initialize recording session when second user joins
    if (roomMembers.length === 1) {
      const sessionId = `${roomId}`;
      const sessionDir = path.join(sessionsDir, sessionId);

      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      activeSessions.set(roomId, {
        sessionId,
        sessionDir,
        user1: email,
        user2: null,
        startTime: Date.now(),
        user1Chunks: 0,
        user2Chunks: 0
      });

      // Map users to their directories
      userMappings.set(socket.id, { roomId, email, isUser1: true });
    } else if (roomMembers.length === 2) {
      // Map the second user if they're joining an existing session
      const session = activeSessions.get(roomId);
      if (session) {
        session.user2 = email;
        userMappings.set(socket.id, { roomId, email, isUser1: false });
      }
    }
  });

  socket.on('media-chunk', ({ roomId, chunk, type, timestamp, chunkIndex, authId, email }) => {
    const session = activeSessions.get(roomId);
    if (!session) return;

    const userMapping = userMappings.get(socket.id);
    if (!userMapping) return;

    const videoFileName = `${userMapping.email}_rec.mp4`;
    const videoFilePath = path.join(session.sessionDir, videoFileName);

    const dir = path.dirname(videoFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append chunk to the video file
    fs.appendFile(videoFilePath, Buffer.from(chunk), (err) => {
      if (err) {
        console.error('Error writing video chunk:', err);
        socket.emit('chunk-error', { error: 'Failed to write video chunk in server' });
      } else {
        // Update chunk count
        if (userMapping.isUser1) {
          session.user1Chunks++;
        } else {
          session.user2Chunks++;
        }
        console.log(`Appended chunk to ${videoFileName}`);
      }
    });
  });

  socket.on('disconnect', () => {
    const userMapping = userMappings.get(socket.id);
    if (userMapping) {
      const { roomId, email } = userMapping;
      userMappings.delete(socket.id);

      // Clean up any active sessions when user disconnects
      const session = activeSessions.get(roomId);
      if (session) {
        console.log(`Session ended. User ${email} disconnected. Chunks: ${userMapping.isUser1 ? session.user1Chunks : session.user2Chunks}`);
        activeSessions.delete(roomId);
      }
      // upload both videos to s3 , add data in mongo user and admin
    }
  });

  socket.on("discnt", ({ roomId }) => {
    const userMapping = userMappings.get(socket.id);
    if (userMapping) {
      socket.to(roomId).emit("user-disconnet", { socketId: socket.id, email: userMapping.email });
    }
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 3000;

httpsServer.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTPS Server listening on https://192.168.29.89:${PORT}`);
});