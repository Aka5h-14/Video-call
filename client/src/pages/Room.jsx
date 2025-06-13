import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';

const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [myStream, setMyStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const streamRef = useRef(null);

  const createPeerConnection = useCallback((userId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local stream tracks to peer connection
    if (myStream) {
      myStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, myStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(userId, event.streams[0]);
        return newStreams;
      });
    };

    return peerConnection;
  }, [myStream]);

  const handleUserJoined = useCallback(async (userId) => {
    console.log('User joined:', userId);
    const peerConnection = createPeerConnection(userId);
    peerConnections.current.set(userId, peerConnection);

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', { to: userId, offer });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection]);

  const handleOffer = useCallback(async ({ from, offer }) => {
    console.log('Received offer from:', from);
    const peerConnection = createPeerConnection(from);
    peerConnections.current.set(from, peerConnection);

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async ({ from, answer }) => {
    console.log('Received answer from:', from);
    const peerConnection = peerConnections.current.get(from);
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ from, candidate }) => {
    console.log('Received ICE candidate from:', from);
    const peerConnection = peerConnections.current.get(from);
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }, []);

  const handleUserLeft = useCallback((userId) => {
    console.log('User left:', userId);
    const peerConnection = peerConnections.current.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.current.delete(userId);
    }
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(userId);
      return newStreams;
    });
  }, []);

  // Initialize media stream
  useEffect(() => {
    let mounted = true;

    const initializeMedia = async () => {
      try {
        console.log('Requesting media devices...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        console.log('Media stream obtained:', stream);
        
        if (mounted) {
          streamRef.current = stream;
          setMyStream(stream);
          // Ensure video element is updated with stream
          if (videoRef.current) {
            console.log('Setting video srcObject');
            videoRef.current.srcObject = stream;
          }
        } else {
          // Clean up stream if component unmounted during initialization
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setError('Failed to access camera and microphone. Please ensure you have granted the necessary permissions.');
      }
    };

    initializeMedia();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video element when myStream changes
  useEffect(() => {
    if (myStream && videoRef.current) {
      console.log('Updating video element with stream');
      videoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  // Join room and set up socket listeners
  useEffect(() => {
    if (!roomId) return;

    // Join room
    socket.emit('join-room', roomId);

    // Set up socket event listeners
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);
    socket.on('room-full', () => {
      setError('Room is full. Only two people can join a room.');
      setTimeout(() => navigate('/'), 2000);
    });

    // Cleanup
    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
      socket.off('room-full');

      // Close all peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, [roomId, handleUserJoined, handleOffer, handleAnswer, handleIceCandidate, handleUserLeft, navigate]);

  const toggleMute = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (myStream) {
      myStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const leaveRoom = () => {
    // Stop all tracks
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Navigate back to home
    navigate('/');
  };

  const handleMouseDown = useCallback((e) => {
    if (remoteStreams.size === 0) return;
    
    const rect = videoRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, [remoteStreams.size]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || remoteStreams.size === 0) return;

    requestAnimationFrame(() => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const videoRect = videoRef.current.getBoundingClientRect();
      
      // Calculate new position relative to the container
      let newX = e.clientX - containerRect.left - dragOffset.x;
      let newY = e.clientY - containerRect.top - dragOffset.y;

      // Keep video within container bounds with padding
      const padding = 16; // 1rem padding
      const maxX = containerRect.width - videoRect.width - padding;
      const maxY = containerRect.height - videoRect.height - padding;

      newX = Math.max(padding, Math.min(newX, maxX));
      newY = Math.max(padding, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    });
  }, [isDragging, dragOffset, remoteStreams.size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Memoize the video container style to prevent unnecessary re-renders
  const localVideoStyle = useMemo(() => ({
    transform: `translate(${position.x}px, ${position.y}px)`,
    zIndex: 50,
    cursor: remoteStreams.size > 0 ? 'move' : 'default',
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
    maxWidth: 'calc(100% - 2rem)',
    maxHeight: 'calc(100% - 7rem)',
    left:'0',
    top: '0',
    pointerEvents: 'auto'
  }), [position, remoteStreams.size, isDragging]);

  // Memoize the remote video container style
  const remoteVideoStyle = useMemo(() => ({
    maxWidth: 'calc(100% - 2rem)',
    maxHeight: 'calc(100% - 7rem)',
    left: '1rem',
    top: '1rem',
    zIndex: 10
  }), []);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <Navbar roomId={roomId} />
      
      <div className="flex-1 relative p-4">
        {/* Main video container */}
        <div ref={containerRef} className="w-full h-full overflow-hidden rounded-lg">
          {/* Remote video */}
          {remoteStreams.size > 0 && (
            <div 
              className="absolute w-full h-full "
              style={remoteVideoStyle}
            >
              {Array.from(remoteStreams.values()).map((stream, index) => (
                <video
                  key={index}
                  ref={el => {
                    if (el) {
                      console.log('Setting remote video srcObject');
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ))}
            </div>
          )}

          {/* Local video */}
          {myStream && (
            <div
              className={`absolute ${remoteStreams.size > 0 ? 'w-32 sm:w-64 lg:w-72' : 'w-full h-full'}`}
              style={localVideoStyle}
              onMouseDown={handleMouseDown}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full ${remoteStreams.size > 0 ? 'object-cover' : 'object-contain'} rounded-lg shadow-lg`}
                style={{ backgroundColor: 'black' }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-4 bg-black bg-opacity-50">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600'} hover:bg-opacity-80 transition-colors`}
          >
            {isMuted ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'} hover:bg-opacity-80 transition-colors`}
          >
            {isVideoOff ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={leaveRoom}
            className="p-3 rounded-full bg-red-500 hover:bg-opacity-80 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Room; 