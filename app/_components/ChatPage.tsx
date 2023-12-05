"use client"
import React, { useEffect, useRef, useState } from "react";
import RestartGame from "./(restartGame)/RestartGame";

interface IMsgDataTypes {
  roomId: String | number;
  user: String;
  msg: String;
  time: String;
}

const ChatPage = ({ socket, username, roomId }: any) => {
  const [currentMsg, setCurrentMsg] = useState("");
  const [chat, setChat] = useState<IMsgDataTypes[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [players, setPlayers] = useState(0);

  const sendData = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();
    if (currentMsg !== "") {
      const msgData: IMsgDataTypes = {
        roomId,
        user: username,
        msg: currentMsg,
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
      };
      await socket.emit("answer_question", msgData);
      setCurrentMsg("");
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  },[chat])


  useEffect(() => {
    function onUserJoined(data: IMsgDataTypes) {
      setChat((pre) => [...pre, data])
    }
    
    socket.on("message_receiver", onUserJoined);

    //user disconnected action
    const handleBeforeUnload = () => {
      socket.emit("user_disconnected", { roomId, username });
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    //cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.off("message_receiver", onUserJoined);
    }
  }, [socket, username, roomId]);

  useEffect(() => {
    console.log(socket);
    function onUserJoined(data: string) {
      console.log("user_joined", data);
    }
    function onGameReady() {
      setIsGameOver(false);
      console.log("game_ready");
    }
    function onGameOver() {
      console.log("game_over");
      setIsGameOver(true);
    }
    function onServerStatus(data: number) {
      console.log("server_status", data);
      setPlayers(data);
    }

    socket.on("server_status", onServerStatus);
    socket.on("game_over", onGameOver);
    socket.on("user_joined", onUserJoined);
    socket.on("game_ready", onGameReady);

    return () => {
      socket.off("server_status", onServerStatus);
      socket.off("game_over", onGameOver);
      socket.off("user_joined", onUserJoined);
      socket.off("game_ready", onGameReady);
    }
  },[socket])

  return (
    <div className="w-full h-full flex flex-col min-w-[450px] md:w-1/3 ">
      <div className="mt-1 border-2 border-black rounded-md p-2 mx-2">
        <p>
          Name: <b>{username}</b> and Room Id: <b>{roomId}</b>
        </p>
      </div>
      <div  
        className="flex-grow flex h-full flex-col justify-between overflow-scroll px-4">
        <div >
          {chat.map(({ roomId, user, msg, time }, key) => (
            <div
              key={key}
              className={`${user === username ? "items-end" : "items-start"} my-4 flex flex-col`}
            >
              <div
                className={`${user === username ? "text-green-600 bg-green-50" : user === "Server" ? "text-violet-600 bg-gray-50"  : "text-blue-600 bg-blue-50 "} p-2 rounded-md space-y-2 w-fit`}
              >
                {user !== username && (<p className="inline-block">{user}:&nbsp;</p>) } 
                {!msg.includes("\n") ? <p className="inline-block">{msg}</p>: msg.split("\n").map((m, key) => (
                  <p key={key}>{m}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef}></div>
      </div>
      <div className="mb-2">
          <form onSubmit={(e) => sendData(e)}
            className="flex gap-2">
            <input
              className="border-2 border-black rounded-md p-1 focus:outline-none w-full"
              type="text"
              value={currentMsg}
              placeholder="Type your message.."
              onChange={(e) => setCurrentMsg(e.target.value)}
            />
            <button className="border-2 border-black rounded-md p-2 bg-black text-white">Send</button>
          </form>
        </div>
      {isGameOver && 
        <RestartGame socket={socket} roomId={roomId} username={username} players={players}/>
      }
    </div>
  );
};

export default ChatPage;

function userRef<T>(arg0: null) {
  throw new Error("Function not implemented.");
}
