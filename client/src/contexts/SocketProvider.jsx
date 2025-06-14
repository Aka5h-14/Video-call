import { io } from "socket.io-client";
import { createContext, useContext, useMemo, useEffect } from "react";

const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return socket;
}

export const SocketProvider = (props) => {
    const socket = useMemo(() =>
        io("https://192.168.29.89:3000"),[]);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
}; 