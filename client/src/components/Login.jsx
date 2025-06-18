import { useAuth0 } from "@auth0/auth0-react";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaVideo, FaCloud, FaMicrophone, FaServer } from 'react-icons/fa';
import Navbar from "./Navbar";

const LoginButton = () => {
    const { loginWithRedirect, user, isLoading } = useAuth0();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && user) {
            navigate("/home");
        }
    }, [user, navigate, isLoading]);

    // if (isLoading) {
    //     return <div>Loading...</div>;
    // }

    return (
        <>
            <Navbar roomId={null} isDisabled={false} />
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
                {/* Hero Section */}
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                            High-Quality Video Calls with Recording
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Perfect for podcasts, interviews, and professional meetings. Our platform records high-resolution video and stores it for future use.
                        </p>
                    </div>

                    {/* Call to Action */}
                    <div className="bg-white p-8 mb-6 rounded-lg shadow-md max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Get Started</h2>
                        <button
                            onClick={() => loginWithRedirect()}
                            className="btn btn-primary w-full flex items-center justify-center gap-2 text-lg py-3"
                        >
                            <FaMicrophone /> Sign In to Start Video Calling
                        </button>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <FaVideo className="text-3xl text-blue-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">High-Resolution Recording</h3>
                            <p className="text-gray-600">Capture crystal-clear video quality for professional content creation.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <FaCloud className="text-3xl text-blue-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Cloud Storage</h3>
                            <p className="text-gray-600">AWS S3 storage for your recorded sessions.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <FaMicrophone className="text-3xl text-blue-500 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Real-time Communication</h3>
                            <p className="text-gray-600">Seamless video calls powered by WebRTC technology.</p>
                        </div>
                    </div>

                    {/* Technology Stack */}
                    <div className="mt-16">
                        <h2 className="text-2xl font-bold text-center mb-8">Built With</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <FaServer className="text-2xl text-blue-500 mx-auto mb-2" />
                                <p className="font-medium">React</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <FaServer className="text-2xl text-blue-500 mx-auto mb-2" />
                                <p className="font-medium">Socket.IO</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <FaServer className="text-2xl text-blue-500 mx-auto mb-2" />
                                <p className="font-medium">WebRTC</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <FaServer className="text-2xl text-blue-500 mx-auto mb-2" />
                                <p className="font-medium">FFmpeg</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginButton;