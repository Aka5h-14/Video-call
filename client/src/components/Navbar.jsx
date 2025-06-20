import React, { useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from 'react-router-dom';

function Navbar({ roomId, isDisabled }) {
  const { loginWithRedirect, logout, user } = useAuth0();

  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isAdmin = true; // TODO: Replace with real admin check
  // /api/admin/users  post {email , password}

  return (
    <div className="bg-gray-800 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {roomId ?
            <>
              <span className="text-gray-400">Meet Code:</span>
              <div className="flex items-center space-x-2">
                <span className="font-sans bg-gray-700 px-3 py-1.5 rounded">{roomId}</span>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Copy meeting code"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
            </> : ''}
        </div>
        <div>
          {isAdmin && !isDisabled && (
            <Link to="/admin" className="bg-gray-600 p-1 px-2 rounded-md hover:bg-gray-700 mr-2">Admin</Link>
          )}
          <Link to="/my-videos" className="bg-gray-600 p-1 px-2 rounded-md hover:bg-gray-700 mr-2">My Videos</Link>
          {user === undefined ?
            <button className='bg-green-600 p-1 px-2 rounded-md hover:bg-green-700 ' onClick={() => {
              if (!isDisabled) {
                {
                  loginWithRedirect()
                }
              }
            }}>
              Sign In
            </button> :
            <button className='bg-red-600 p-1 px-2 rounded-md hover:bg-red-700' onClick={() => {
              if (!isDisabled) {
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
            }}>
              Log Out
            </button>}
        </div>
      </div>
    </div >
  );
}

export default Navbar; 