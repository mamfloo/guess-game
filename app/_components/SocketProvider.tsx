import React from 'react'
import { io } from "socket.io-client";

const socket = io("http://localhost:3001"), SocketContext = React.createContext(socket);
socket.on("connect", () => console.log("connected"));

function SocketProvider({children}: any) {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export {SocketProvider, SocketContext};
