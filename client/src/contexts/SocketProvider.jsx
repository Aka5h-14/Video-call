import { io } from "socket.io-client";
import { createContext, useContext, useMemo } from "react";

const SocketContext = createContext(null);
const backendUrl = import.meta.env.VITE_BACKEND_URL;
// Example: new Socket(backendUrl, ...)

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return socket;
}

export const SocketProvider = (props) => {
    const socket = useMemo(() =>
        io(backendUrl),[]);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
}; 