import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { FaVideo, FaMicrophone } from 'react-icons/fa';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const DomainApi = import.meta.env.VITE_AUTH0_DOMAIN_API;

function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect, isLoading, user } = useAuth0();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
      return;
    }
  }, [user, navigate, isLoading]);

  useEffect(() => {
    const addUser = async () => {
      // console.log(user);
      if (!isLoading && user && user?.sub) {

        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: DomainApi,
            scope: "read:current_user",
          },
        });

        if (!token) {
          navigate("/");
          return;
        }

        try {
          await axios.post(`${backendUrl}/api/addUser`,
            {
              authId: user.sub,
              email: user.email
            }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (err) {
          if (err.response && err.response.status === 401) {
            navigate("/");
          }
          console.error("Failed to add user:", err);
        }
      }
    };
    // console.log(user?.sub)
    addUser();
  }, [user, isLoading]);

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