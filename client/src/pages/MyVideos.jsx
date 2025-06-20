import { useEffect, useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const DomainApi = import.meta.env.VITE_AUTH0_DOMAIN_API;

export default function MyVideos() {
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect, isLoading, user } = useAuth0();

  useEffect(() => {
    if (isLoading) return; // Wait for Auth0 to finish loading
    // console.log(isLoading, isAuthenticated);
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: "/my-videos" } });
      return;
    }
    // console.log("end")

    const fetchVideos = async () => {
      // console.log("fetch")
      try {
        // console.log(user);
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: DomainApi,
            scope: "read:current_user",
          },
        });
        // console.log("token", token);
        if (!token) {
          navigate("/");
          return;
        }
        const res = await axios.post(`${backendUrl}/api/userVideos`, 
          {
            email: user.email
          },{
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setVideos(res.data.videos || []);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          navigate("/");
        } else {
          setVideos([]);
        }
      }
    };
    fetchVideos();
  }, [isAuthenticated, isLoading, loginWithRedirect, navigate]);

  return (
    <>
      <Navbar roomId={null} isDisabled={false} />
      <div className="p-4">
        <button
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => navigate('/home')}
        >
          Back
        </button>
        <h2 className="text-xl font-bold mb-4">My Videos</h2>
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v, idx) => (
              <tr key={v.id || idx}>
                <td className="border px-4 py-2">{v.id}</td>
                <td className="border px-4 py-2">{v.date ? new Date(v.date).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
} 