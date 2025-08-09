require('dotenv').config()
const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { User } = require('./db/index')
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
  origin: ["https://192.168.29.89:5173", "https://localhost:5173"],
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

// Function to merge two videos using fluent-ffmpeg
function mergeVideos(sessionDir, callback) {
  const outputVideo = path.join(sessionDir, 'merged_output.mp4');
  
  // Read directory and find all .mp4 files
  let videoFiles;
  try {
    const files = fs.readdirSync(sessionDir);
    videoFiles = files.filter(file => 
      file.endsWith('_rec.mp4') && 
      file !== 'merged_output.mp4'
    ).map(file => path.join(sessionDir, file));
  } catch (error) {
    console.error('Error reading session directory:', error);
    return callback(new Error('Failed to read session directory'));
  }
  
  if (videoFiles.length === 0) {
    console.log('No video files found to merge in directory:', sessionDir);
    return callback(new Error('No video files found'));
  }
  
  if (videoFiles.length >= 2) {
    // Two or more videos exist - merge the first two side by side
    const video1 = videoFiles[0];
    const video2 = videoFiles[1];
    console.log('Merging two videos side by side...');
    console.log('Video 1:', path.basename(video1));
    console.log('Video 2:', path.basename(video2));
    
    ffmpeg()
      .input(video1)
      .input(video2)
      .complexFilter([
        // Scale and pad first video
        '[0:v]scale=iw*min(640/iw\\,720/ih):ih*min(640/iw\\,720/ih),pad=640:720:(640-iw*min(640/iw\\,720/ih))/2:(720-ih*min(640/iw\\,720/ih))/2,setsar=1[v0]',
        // Scale and pad second video
        '[1:v]scale=iw*min(640/iw\\,720/ih):ih*min(640/iw\\,720/ih),pad=640:720:(640-iw*min(640/iw\\,720/ih))/2:(720-ih*min(640/iw\\,720/ih))/2,setsar=1[v1]',
        // Stack videos horizontally
        '[v0][v1]hstack=inputs=2[v]',
        // Mix audio from both videos
        '[0:a][1:a]amix=inputs=2:duration=shortest[a]'
      ])
      .outputOptions([
        '-map [v]',
        '-map [a]',
        '-c:v libx264',
        '-c:a aac',
        '-crf 23',
        '-preset veryfast'
      ])
      .output(outputVideo)
      .on('start', (commandLine) => {
        // console.log('FFmpeg command: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
      })
      .on('end', () => {
        console.log('Video merge completed successfully');
        
        // Clean up individual video files after successful merge
        videoFiles.forEach(videoFile => {
          fs.unlink(videoFile, (err) => {
            if (err) console.error(`Error deleting video ${path.basename(videoFile)}:`, err);
            else console.log(`Deleted original video: ${path.basename(videoFile)}`);
          });
        });
        
        callback(null, outputVideo);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        callback(err);
      })
      .run();
      
  } else {
    // Only one video exists - just copy it as the merged output
    const singleVideo = videoFiles[0];
    console.log('Processing single video:', path.basename(singleVideo));
    
    ffmpeg(singleVideo)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-crf 23',
        '-preset veryfast'
      ])
      .output(outputVideo)
      .on('start', (commandLine) => {
        // console.log('FFmpeg command: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
      })
      .on('end', () => {
        console.log('Video processing completed successfully');
        
        // Clean up original video file
        fs.unlink(singleVideo, (err) => {
          if (err) console.error('Error deleting original video:', err);
          else console.log(`Deleted original video: ${path.basename(singleVideo)}`);
        });
        
        callback(null, outputVideo);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        callback(err);
      })
      .run();
  }
}

io.on('connection', (socket) => {
  // console.log('User connected:', socket.id);

  socket.on('join-room', async ({ roomId, email }) => {
    let roomMembers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

    if (roomMembers.length > 2) {
      io.to(socket.id).emit('room-full');
      return;
    }

    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { socketId: socket.id, email });
    await new Promise(resolve => setTimeout(resolve, 100));

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
        // console.log(`Appended chunk to ${videoFileName}`);
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
        
        // Merge videos using ffmpeg when user disconnects
        console.log(`Starting video merge process for session ${session.sessionId}`);
        mergeVideos(session.sessionDir, (error, outputPath) => {
          if (error) {
            console.error('Failed to merge videos:', error);
          } else {
            // TODO: upload merged video to s3, add data in mongo user and admin
          }
        });
        
        activeSessions.delete(roomId);
      }
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