"use client"
import React, { useEffect, useState } from "react";
import RestartGame from "./(restartGame)/RestartGame";
import { on } from "events";

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

  useEffect(() => {
    socket.on("message_receiver", (data: IMsgDataTypes) => {
      setChat((pre) => [...pre, data]);
    });

    const handleBeforeUnload = () => {
      socket.emit("user_disconnected", { roomId, username });
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    //cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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


  },[socket])

  return (
    <div className="w-1/3 h-full flex flex-col">
      <div className="mb-5 border-2 border-black rounded-md p-2">
        <p>
          Name: <b>{username}</b> and Room Id: <b>{roomId}</b>
        </p>
      </div>
      <div className="flex-grow flex h-full flex-col justify-between">
        <div >
          {chat.map(({ roomId, user, msg, time }, key) => (
            <div
              key={key}
              className={`${user === username ? "text-right" : "text-left"} my-4`}
            >
              <span
                className={`${user === username ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50 "} p-2 rounded-md`}
              >
                {user !== username && (<>{user}:</>) } {msg}
              </span>
            </div>
          ))}
        </div>
        <div className="mb-5">
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
      </div>
      {isGameOver && 
        <RestartGame socket={socket} roomId={roomId} username={username} players={players}/>
      }
    </div>
  );
};

export default ChatPage;