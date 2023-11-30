const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const express = require("express");
const app = express();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

//create an array of all active games
const activeGames = {};

io.on("connection", (socket) => {

  socket.on("join_room", ({roomId, userName}) => {
    
    console.log("A user connected:", socket.id);
    if(activeGames[roomId] && activeGames[roomId].players.length === 2) {
      //notify player that the room is full
      socket.emit("room_full");
      return;
    }
    socket.join(roomId);
    console.log(`user with id-${socket.id} joined room - ${roomId}`);

    //initialize game or check if game for that room already exists
    activeGames[roomId] = activeGames[roomId] || {
      players: [],
      questions: [
        {
          question: "Who is captain america?", 
          answer: "nick"
        }, 
        {
          question: "Who is nick?", 
          answer: "parker"
        }],
      currentQuestionIndex: 0,
      //states: 0: waiting for players, 1: playing, 2: ended
      state: 0
    };

    //add player to game
    activeGames[roomId].players.push({username: userName, score: 0, isReady: false});

    //notify players that a new player has joined
    const message = {
      roomId: roomId,
      user: "Server",
      msg: `${userName} has joined the room`,
      time: new Date().getTime(),
    }
    io.to(roomId).emit("message_receiver", message );
    io.to(roomId).emit("server_status", activeGames[roomId].players.length)

    //start game if there are 2 players
    if(activeGames[roomId].players.length === 2) {
      //set state to playing
      activeGames[roomId].state = 1;
      //notify players that the game is starting
      io.to(roomId).emit("game_ready");
      console.log("game ready");
      startGame(roomId);
    }
  });


  socket.on("answer_question", (data) => {
    const {roomId, msg, user} = data;
    const currentPlayer = activeGames[roomId].players.find(player => player.username === user);
    if(currentPlayer) {
      //current answer - 1
      const correctAnswer = activeGames[roomId].questions[activeGames[roomId].currentQuestionIndex -1].answer;
      console.log("inside" + msg);
      console.log("inside" + correctAnswer);
      if(correctAnswer === msg) {
        currentPlayer.score += 1;
        //notify players that the answer was correct
        const playerGuessedMessage = {
          roomId: roomId,
          user: user,
          msg: `${user} guessed, correct answer was "${msg}"`,
          time: new Date().getTime(),
        }
        io.to(roomId).emit("message_receiver", playerGuessedMessage);
        //send the next question
        sendNextQuestion(roomId);
      }
    }
    console.log("cuurrent player" + currentPlayer);
    console.log("player id" + activeGames[roomId].players[0].username + " " + activeGames[roomId].players[1].username);
    console.log("socket id" + user);
    console.log("outside" + msg);

  });

  socket.on("user_disconnected", ({roomId, username}) => {
    //remove player from game when it disconnects
    if(activeGames[roomId]) {
      activeGames[roomId].players = activeGames[roomId].players.filter(player => player.username !== username);
      //update the client "players" let with the new players 
      io.to(roomId).emit("server_status", activeGames[roomId].players)
    }
  })

  socket.on("player_ready", ({roomId, username}) => {
    if(activeGames[roomId]) {
      const player = activeGames[roomId].players.find(player => player.username === username);
      if(player) {
        console.log("player found " + player.username);
        player.isReady = true;
      }
      //send the players that are ready
      io.to(roomId).emit("restart_status", activeGames[roomId].players.filter(player => player.isReady === true).length)
      //check if all players are ready
      if(activeGames[roomId].players.every(player => player.isReady === true)) {
        io.to(roomId).emit("game_ready");
        console.log("game ready");
        //set all players isReady to false
        activeGames[roomId].players.forEach(player => player.isReady = false);
        startGame(roomId);
      }
      activeGames[roomId].players.forEach(element => console.log(element));
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
}); 

function startGame(roomId) {
  //send the start game message to all players inside a room
  const message = {
    roomId: roomId,
    user: "Server",
    msg: "Game will start in 2 seconds",
    time: new Date().getTime(),
  }
  io.to(roomId).emit("message_receiver", message);
  //send the first question after 2 seconds
  setTimeout(() => {
    sendNextQuestion(roomId);
  }, 2000);
}

function sendNextQuestion(roomId) {
  // send the current question to all players inside a room
  if(activeGames[roomId].currentQuestionIndex <= activeGames[roomId].questions.length -1) {
    const question = {
      roomId: roomId,
      user: "Server",
      msg: activeGames[roomId].questions[activeGames[roomId].currentQuestionIndex].question,
      time: new Date().getTime(),
    }
    io.to(roomId).emit("message_receiver", question)
    //increment the current question index or game over if no more questions
    activeGames[roomId].currentQuestionIndex += 1;
  } else {
    activeGames[roomId].state = 2;
    gameOver(roomId);
  }
}



function gameOver(roomId) {
  //send the final score to all players inside a room
  const message = {
    roomId: roomId,
    user: "Server",
    msg: "Game ended " + JSON.stringify(activeGames[roomId].players),
    time: new Date().getTime(),
  }
  setTimeout(() => {
    io.to(roomId).emit("game_over", message)
    //reset the current question index
    activeGames[roomId].currentQuestionIndex = 0;
  }, 1500);
  setTimeout(() => {

  }, 2000);
}

//get request to know the status of the game
app.get("/game/:roomId", (req, res) => {
  try {
    const roomId = req.params.roomId;
    if(activeGames[roomId]) {
      res.status(200).send(activeGames[roomId]);
    } else {
      res.status(404).send("Game not found");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});



