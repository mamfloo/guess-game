import React, { useEffect } from 'react'

export default function RestartGame({socket, roomId, username, players}: {socket: any, roomId: String, username: String, players: number}) {
  const [isReady, setIsReady] = React.useState(false);
  const [readyPlayers, setReadyPlayers] = React.useState(0);

  async function handleReady() {
    setIsReady(true);
    await socket.emit("player_ready", {roomId, username});
  }

  useEffect(() => {
    function onRestartStatus(data: number) {
      setReadyPlayers(data);
      console.log(data);
    }

    socket.on("restart_status", onRestartStatus);
  },[socket])

  return (
    <div className='flex justify-center items-center absolute p-10 bg-gray-100 rounded-md left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2'>
        <div className='flex flex-col items-center gap-3'>
          <p>Do you want to play again?</p>
          <p>Ready {readyPlayers}/{players}</p>
          <button 
            onClick={handleReady}
            disabled={isReady} 
            className='p-2 bg-green-400 rounded-md mt-2 disabled:bg-gray-400 disabled:text-gray-50'>Ready</button>
        </div>
    </div>
  )
}
