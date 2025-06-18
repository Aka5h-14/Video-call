import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth0 } from '@auth0/auth0-react';
import { FaVideo, FaMicrophone } from 'react-icons/fa';

function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const { user, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
      return;
    }
  }, [user, navigate, isLoading]);

  // if (isLoading) {
  //   return <div >Loading...</div>;
  // }

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <>
      <Navbar roomId={null} isDisabled={false} />
      <div className="min-h-[90vh] flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Start Video Call</h1>
          
          <button
            onClick={createRoom}
            className="btn btn-primary w-full mb-4 flex items-center justify-center gap-2"
          >
            <FaVideo /> Create New Room
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={joinRoom}>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="input mb-4"
            />
            <button
              type="submit"
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <FaMicrophone /> Join Room
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Home; 