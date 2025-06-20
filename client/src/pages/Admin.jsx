import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function Admin() {
  const [videos, setVideos] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/videos`,
        { email, password },
        { withCredentials: true }
      );
      if (data.verified) {
        setIsVerified(true);
        setVideos(data.videos || []);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Invalid credentials or server error");
    }
  };

  return (
    <>
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => navigate('/home')}
      >
        Back
      </button>
      {isVerified ? (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Admin Videos</h2>
          <ul>
            {videos.map((v, idx) => (
              <li key={v.id || idx}>
                <span>{v.id || JSON.stringify(v)}</span>
                {v.date && <> — {new Date(v.date).toLocaleString()}</>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="p-4 max-w-sm mx-auto">
          <label htmlFor="email" className="block mb-1">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mb-2 p-2 border w-full"
            required
          />

          <label htmlFor="password" className="block mb-1">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mb-2 p-2 border w-full"
            required
          />

          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </form>
      )}
    </>
  );
} 