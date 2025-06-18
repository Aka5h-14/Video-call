import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketProvider';
import Navbar from '../components/Navbar';
import RecordRTC from 'recordrtc';
import { useAuth0 } from '@auth0/auth0-react';


function Room() {
  const { user, isLoading } = useAuth0();
  const socket = useSocket();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioOutputDevice, setSelectedAudioOutputDevice] = useState('');
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const streamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const connectionEstablishedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, navigate, isLoading]);
  // if (isLoading) {
  //     return <div>Loading...</div>;
  // }

  const startRecording = useCallback(() => {
    if (!myStream || !socket || isRecording) return;
    let chunkIndex = 0;

    // const isWebMSupported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus');
    // const types = [
    //   "video/webm",
    //   "video/webm;codecs=vp8",
    //   "video/webm;codecs=vp9",
    //   "video/webm;codecs=h264",
    //   "video/mp4",
    //   "video/mp4;codecs=avc1.64003E,mp4a.40.2",   // in ios
    //   "video/mp4;codecs=avc1.64003E,opus",
    //   "video/mp4;codecs=avc3.64003E,mp4a.40.2",
    //   "video/mp4;codecs=avc3.64003E,opus",
    //   "video/mp4;codecs=hvc1.1.6.L186.B0,mp4a.40.2",
    //   "video/mp4;codecs=hvc1.1.6.L186.B0,opus",
    //   "video/mp4;codecs=hev1.1.6.L186.B0,mp4a.40.2",
    //   "video/mp4;codecs=hev1.1.6.L186.B0,opus",
    //   "video/mp4;codecs=av01.0.19M.08,mp4a.40.2",  // best by chatgpt
    //   "video/mp4;codecs=av01.0.19M.08,opus",
    // ];

    // for (const type of types) {
    //   console.log(
    //     `Is ${type} supported? ${
    //       MediaRecorder.isTypeSupported(type) ? "Yes!" : "Nope :("
    //     }`,
    //   );
    // }

    const recorder = new RecordRTC(myStream, {
      type: 'video',
      mimeType: "video/mp4;codecs=avc1.64003E,mp4a.40.2",
      recorderType: RecordRTC.MediaStreamRecorder,
      disableLogs: true,
      timeSlice: 10000, // 10 seconds per chunk
      bitsPerSecond: 1628000,
      videoBitsPerSecond: 1500000,
      audioBitsPerSecond: 128000,
      frameRate: 26,
      ondataavailable: async (blob) => {
        if (blob.size > 0) {
          // const durationInSec = 10; // if using timeSlice: 10000
          // const bitrate = (blob.size * 8) / durationInSec; // bits per second
          // console.log('Approx Bitrate:', bitrate, 'bps');

          console.log(blob, chunkIndex);
          const arrayBuffer = await blob.arrayBuffer();

          socket.emit('media-chunk', {
            roomId,
            user: user.email,
            chunk: arrayBuffer,
            type: blob.type,
            timestamp: Date.now(),
            chunkIndex: chunkIndex++,
          });
        }
      }
    });

    mediaRecorderRef.current = recorder;
    recorder.startRecording();
    setIsRecording(true);
  }, [myStream, socket, isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stopRecording(() => {
        setIsRecording(false);
      });
    }
  }, []);

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
      const stream = event.streams[0];
      setRemoteStream(stream);
      // Use a small timeout to ensure the video element is mounted
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      }, 0);
    };

    return peerConnection;
  }, [myStream, socket]);


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
  }, [createPeerConnection, socket]);

  const userDisconnect = useCallback(() => {
    setError("Call Ended")
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }

    stopRecording();
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    setRemoteStream(null);
    remoteVideoRef.current = null;
    setTimeout(() => {
      navigate("/");
    }, 3000)
  }, [socket, myStream, stopRecording, navigate])

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
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async ({ from, answer }) => {
    console.log('Received answer from:', from);
    const peerConnection = peerConnections.current.get(from);
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        connectionEstablishedRef.current = true;
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

  // Get available devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // console.log(devices);
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .filter((device, index, self) =>
          index === self.findIndex(d => d.groupId === device.groupId)
        );

      const videoInputs = devices
        .filter(device => device.kind === 'videoinput')
        .filter((device, index, self) =>
          index === self.findIndex(d => d.groupId === device.groupId)
        );

      const audioOutputs = devices
        .filter(device => device.kind === 'audiooutput')
        .filter((device, index, self) =>
          index === self.findIndex(d => d.groupId === device.groupId)
        );

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      setAudioOutputDevices(audioOutputs);

      if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioOutputs.length > 0) {
        setSelectedAudioOutputDevice(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  }, []);

  // Handle audio device change
  const handleAudioDeviceChange = useCallback(async (deviceId) => {
    setSelectedAudioDevice(deviceId);

    // Stop existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: 4 / 3,
          frameRate: { ideal: 30 },
          facingMode: { ideal: 'user' },
          resizeMode: 'crop-and-scale',
        },
        audio: {
          deviceId: { exact: deviceId },
          sampleRate: 44100,
          channelCount: 2,
          sampleSize: { ideal: 16 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = newStream;
      setMyStream(newStream);
      setIsMuted(false);
      setIsVideoOff(false);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Update all peer connections with new audio track
      peerConnections.current.forEach((pc, userId) => {
        const audioTrack = newStream.getAudioTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(audioTrack);
        }
      });
    } catch (error) {
      console.error('Error switching audio device:', error);
      setError('Failed to switch audio device. Please try again.');
    }
  }, [selectedVideoDevice]);

  // Handle video device change
  const handleVideoDeviceChange = useCallback(async (deviceId) => {
    setSelectedVideoDevice(deviceId);

    // Stop existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: 4 / 3,
          frameRate: { ideal: 30 },
          facingMode: { ideal: 'user' },
          resizeMode: 'crop-and-scale',
        },
        audio: {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          sampleRate: 44100,
          channelCount: 2,
          sampleSize: { ideal: 16 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = newStream;
      setMyStream(newStream);
      setIsMuted(false);
      setIsVideoOff(false);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Update all peer connections with new video track
      peerConnections.current.forEach((pc, userId) => {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
    } catch (error) {
      console.error('Error switching video device:', error);
      setError('Failed to switch video device. Please try again.');
    }
  }, [selectedAudioDevice]);

  // Handle audio output device change
  const handleAudioOutputDeviceChange = useCallback(async (deviceId) => {
    setSelectedAudioOutputDevice(deviceId);

    // Set the audio output device for the remote video
    if (remoteVideoRef.current) {
      try {
        await remoteVideoRef.current.setSinkId(deviceId);
      } catch (error) {
        console.error('Error setting audio output device:', error);
        setError('Failed to switch audio output device. Please try again.');
      }
    }
  }, []);

  // Initialize media stream
  useEffect(() => {
    let mounted = true;

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: 4 / 3,
            frameRate: { ideal: 30 },
            facingMode: { ideal: 'user' }
          },
          audio: {
            sampleRate: 44100,
            channelCount: 2,
            sampleSize: { ideal: 16 },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        await getDevices();
        setIsMuted(false);
        setIsVideoOff(false);

        if (mounted) {
          streamRef.current = stream;
          setMyStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setError('Failed to access camera and microphone. Please ensure you have granted the necessary permissions.');
        // alert('Failed to access camera and microphone. Please ensure you have granted the necessary permissions.');
      }
    };

    initializeMedia();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [getDevices]);

  // Start recording when both streams are available
  useEffect(() => {
    if (myStream && remoteStream && !isRecording) {
      console.log('Starting recording - both streams available');
      startRecording();
    }
  }, [myStream, remoteStream, isRecording, startRecording]);


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

  const leaveRoom = useCallback(() => {
    socket.emit("discnt", { roomId });
    setError("Call Ended");
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }

    stopRecording();
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    setRemoteStream(null);
    remoteVideoRef.current = null;
    setTimeout(() => {
      navigate("/");
    }, 3000)
  }, [myStream, socket, stopRecording, navigate]);

  // socket listeners
  useEffect(() => {
    if (!roomId || !socket || !user) return;

    setRemoteStream(null);
    remoteVideoRef.current = null;

    // Join room with email
    socket.emit('join-room', { roomId, email: user.email });

    socket.on('user-joined', ({ socketId, email }) => {
      console.log('User joined:', email);
      handleUserJoined(socketId);
    });
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-disconnet', ({ socketId, email }) => {
      console.log('User disconnected:', email);
      userDisconnect();
    });
    socket.on('chunk-error', ({error})=>{
      stopRecording();
      setError(error);
      setTimeout(() => navigate('/'), 6000);
    })
    socket.on('room-full', () => {
      setError('Room is full. Only two people can join a room.');
      setTimeout(() => navigate('/'), 6000);
    });


    return () => {
      stopRecording();
      
      socket.off('user-joined');
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off("user-disconnet", userDisconnect);
      socket.off('chunk-error');
      socket.off('room-full');

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      setRemoteStream(null);
    };
  }, [roomId, socket, user, handleUserJoined, handleOffer, handleAnswer, handleIceCandidate, userDisconnect, stopRecording, navigate]);

  // Update video element
  useEffect(() => {
    if (videoRef.current && myStream) {
      videoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  const handleMouseDown = useCallback((e) => {
    if (!remoteStream) return;

    const rect = videoRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, [remoteStream]);

  const handleTouchStart = useCallback((e) => {
    if (!remoteStream) return;

    const touch = e.touches[0];
    const rect = videoRef.current.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, [remoteStream]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !remoteStream) return;

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
  }, [isDragging, dragOffset, remoteStream]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !remoteStream) return;
    e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0];
    requestAnimationFrame(() => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const videoRect = videoRef.current.getBoundingClientRect();

      // Calculate new position relative to the container
      let newX = touch.clientX - containerRect.left - dragOffset.x;
      let newY = touch.clientY - containerRect.top - dragOffset.y;

      // Keep video within container bounds with padding
      const padding = 16; // 1rem padding
      const maxX = containerRect.width - videoRect.width - padding;
      const maxY = containerRect.height - videoRect.height - padding;

      newX = Math.max(padding, Math.min(newX, maxX));
      newY = Math.max(padding, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    });
  }, [isDragging, dragOffset, remoteStream]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Add a new useEffect for remote video
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  return (
    <>
      <Navbar roomId={roomId} isDisabled={true} />
      <div className="flex flex-col h-[90vh] bg-gray-900">

        <div className="flex-1 relative p-4">
          {/* Error message */}
          {error && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[100]">
              {error}
            </div>
          )}

          {/* Main video container */}
          <div ref={containerRef} className="w-full h-full rounded-lg">
            {/* Remote video */}
            {remoteStream && (
              <div
                className="absolute w-full h-full "
                style={{
                  maxWidth: 'calc(100% - 2rem)',
                  maxHeight: 'calc(100% - 7rem)',
                  left: '1rem',
                  top: '1rem',
                  zIndex: 10
                }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Local video */}
            {myStream && (
              <div
                className={`absolute ${remoteStream ? 'w-32 sm:w-64 lg:w-72' : 'w-full h-full'}`}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  zIndex: 20,
                  cursor: remoteStream ? 'move' : 'default',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  maxWidth: 'calc(100% - 2rem)',
                  maxHeight: 'calc(100% - 7rem)',
                  left: '0',
                  top: '0',
                  pointerEvents: 'auto'
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full ${remoteStream ? 'object-cover' : 'object-contain'} rounded-lg shadow-lg`}
                  style={{ backgroundColor: 'black' }}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 flex bg-black bg-opacity-50">
            <div className='w-full flex justify-center gap-2 sm:gap-4'>
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
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-full ${showSettings ? 'bg-blue-500' : 'bg-gray-600'} hover:bg-opacity-80 transition-colors`}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
          </div>

          {/* Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Device Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Audio Input</label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => handleAudioDeviceChange(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Audio Input</option>
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Video Input</label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => handleVideoDeviceChange(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Video Input</option>
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Audio Output</label>
                    <select
                      value={selectedAudioOutputDevice}
                      onChange={(e) => handleAudioOutputDeviceChange(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Audio Output</option>
                      {audioOutputDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Room; 