# Video Call Application

A modern, feature-rich video calling application built with React, WebRTC, and Socket.IO. This application provides real-time video communication with advanced features like video recording, user authentication, and video management.

## 🚀 Features

### Core Video Calling
- **Real-time Video & Audio Communication** - High-quality peer-to-peer video calls using WebRTC
- **Room-based Calls** - Create or join video call rooms with unique room IDs
- **Device Management** - Switch between different cameras, microphones, and audio output devices
- **Media Controls** - Mute/unmute audio and enable/disable video during calls

### Advanced Features
- **Screen Recording** - Record video calls with high-quality settings (MP4 format, 1.5Mbps video, 128kbps audio)
- **Video Management** - View and manage your recorded videos through a dedicated dashboard
- **User Authentication** - Secure login system powered by Auth0
- **Admin Panel** - Administrative interface for managing users and videos
- **Responsive Design** - Modern, mobile-friendly UI built with Tailwind CSS

### Technical Features
- **WebRTC Peer Connections** - Direct peer-to-peer communication for optimal performance
- **Socket.IO Integration** - Real-time signaling and room management
- **Secure HTTPS** - Encrypted communication with SSL certificates
- **Database Integration** - MongoDB for user data and video metadata storage
- **AWS Integration** - Cloud storage capabilities for video files

## 🛠️ Technologies Used

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for styling
- **React Router DOM** - Client-side routing
- **Socket.IO Client** - Real-time communication with the server
- **RecordRTC** - Screen recording functionality
- **React Icons** - Icon library for UI elements
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database with Mongoose ODM
- **Auth0** - Authentication and authorization service
- **AWS SDK** - Cloud storage integration
- **FFmpeg** - Video processing and manipulation
- **CORS** - Cross-origin resource sharing
- **JWT** - JSON Web Token authentication

### Development Tools
- **ESLint** - Code linting and formatting
- **Nodemon** - Development server with auto-restart
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📋 Prerequisites

- **Node.js** (v22.0.0 or higher)
- **npm**  package manager
- **MongoDB** database
- **Auth0** account (for authentication)
- **AWS** account (optional, for cloud storage)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Video-call
```

### 2. Install Dependencies

#### Server Setup
```bash
cd server
npm install
```

#### Client Setup
```bash
cd client
npm install
```

### 3. Environment Configuration

#### Server Environment Variables
Create a `.env` file in the `server` directory:
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Auth0 Configuration
AUTH0_DOMAIN=your_auth0_domain
API_IDENTIFIER=your_api_identifier

# AWS Configuration (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name

# SSL Certificate Paths
SSL_KEY_PATH=path_to_private_key.pem
SSL_CERT_PATH=path_to_certificate.pem
```

#### Client Environment Variables
Create a `.env` file in the `client` directory:
```env
VITE_BACKEND_URL=https://localhost:3000
VITE_AUTH0_DOMAIN=your_auth0_domain
VITE_AUTH0_CLIENT_ID=your_auth0_client_id
VITE_AUTH0_DOMAIN_API=your_api_identifier
```

### 4. Generate SSL Certificates (for HTTPS)
```bash
cd server
node generate-cert.js
```

### 5. Start the Application

#### Start the Server
```bash
cd server
npm run dev
```
The server will run on `https://localhost:3000`

#### Start the Client
```bash
cd client
npm run dev
```
The client will run on `http://localhost:5173`

## 🎯 Usage

### Getting Started
1. **Authentication** - Sign in using Auth0 authentication
2. **Create/Join Room** - Create a new room or join an existing one using a room ID
3. **Device Setup** - Allow camera and microphone access when prompted
4. **Start Calling** - Begin your video call with real-time communication

### Video Call Features
- **Mute/Unmute** - Toggle audio on/off during calls
- **Video Toggle** - Enable/disable video stream
- **Device Selection** - Switch between available cameras and microphones
- **Screen Recording** - Record your video calls for later viewing
- **Room Sharing** - Share room IDs with others to join your call

### Video Management
- **My Videos** - Access your recorded video calls
- **Admin Panel** - Administrative interface for managing users and videos

## 🔧 API Endpoints

### Authentication Required
- `POST /api/addUser` - Add or update user information
- `POST /api/userVideos` - Get user's recorded videos

### Admin Only
- `POST /api/admin/videos` - Get all videos (admin access required)

## 🏗️ Project Structure

```
Video-call/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Socket.IO)
│   │   ├── pages/          # Application pages
│   │   └── App.jsx         # Main application component
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── db/                 # Database models and connection
│   ├── middleware/         # Express middleware
│   ├── sessions/           # Video recording storage
│   ├── index.js            # Main server file
│   └── package.json
└── README.md
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **HTTPS/SSL** - Encrypted communication
- **CORS Protection** - Cross-origin request security
- **Input Validation** - Server-side validation for all inputs
- **Environment Variables** - Secure configuration management

## 🚀 Deployment

### Production Build
```bash
# Build the client
cd client
npm run build

# Start the server in production mode
cd server
npm start
```

### Environment Considerations
- Ensure all environment variables are properly configured
- Set up MongoDB Atlas or a production MongoDB instance
- Configure Auth0 for production domain
- Set up AWS S3 for video storage (optional)
- Configure SSL certificates for HTTPS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Ensure all prerequisites are met and environment variables are configured

## 🔮 Future Enhancements

- [ ] Screen sharing functionality
- [ ] Chat messaging during calls
- [ ] Virtual backgrounds
- [ ] Call scheduling
- [ ] Mobile app development
- [ ] Advanced video filters
- [ ] Group call management
- [ ] Analytics dashboard 