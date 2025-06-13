# Simple Video Call App

A simple video call application built with React, WebRTC, and Socket.IO.

## Features

- Create or join video call rooms
- Real-time video and audio communication
- Mute/unmute audio
- Enable/disable video
- Responsive design
- Multiple participants support

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Start the server:

```bash
cd server
npm run dev
```

4. Start the client:

```bash
cd client
npm run dev
```

5. Open http://localhost:5173 in your browser

## Usage

1. Create a new room or join an existing one using a room ID
2. Allow camera and microphone access when prompted
3. Share the room ID with others to join your call
4. Use the controls to mute/unmute audio or enable/disable video
5. Click "Leave Room" to end the call

## Technologies Used

- React
- WebRTC
- Socket.IO
- Tailwind CSS
- Vite

## License

MIT 