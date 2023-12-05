"use client";

import { useContext, useEffect, useState } from "react";
import ChatPage from "../ChatPage";
import { SocketContext} from "../SocketProvider";

export default function JoinPage() {
  const [showChat, setShowChat] = useState(false);
  const [userName, setUserName] = useState("");
  const [roomId, setroomId] = useState("");

  let socket: any;
  socket = useContext(SocketContext);

  const handleJoin = () => {
    if (userName !== "" && roomId !== "") {
      console.log(userName, "userName", roomId, "roomId");

      socket.emit("join_room", {roomId, userName})
      setShowChat(true);
    } else {
      alert("Please fill in Username and Room Id");
    }
  };

  useEffect(() => {
    function onCannotJoin(data: string) {
      setShowChat(false);
      alert(data);
    }

    socket.on("cannot_join", (data: string) => onCannotJoin(data));

    return () => {
      socket.off("cannot_join", (data: string) => onCannotJoin(data));
    }
  }, [socket]);

  return (
    <div className={"flex justify-center items-center h-full flex-col"}>
        {!showChat && ( 
          <div className="flex flex-col gap-2">
            <input 
              className="border-2 p-1 border-black rounded-md focus:outline-none"
              type="text"
              placeholder="Username"
              onChange={(e) => setUserName(e.target.value)}
            />
            <input 
              className="border-2 p-1 border-black rounded-md focus:outline-none"
              type="text"
              placeholder="room id"
              onChange={(e) => setroomId(e.target.value)}
            />
            <button 
              className="p-2 bg-black text-white rounded-md"
              onClick={() => handleJoin()}>
              Join Chat
            </button>
          </div>
        )}
        <div style={{ display: !showChat ? "none" : "" }} className="w-full h-full mt-1 flex justify-center">
          <ChatPage socket={socket} roomId={roomId} username={userName} />
        </div>
    </div>
  );
}