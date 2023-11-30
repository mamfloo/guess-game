const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const httpServer = http.createServer();

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

  socket.on("join_room", (roomId) => {
    console.log("A user connected:", socket.id);
    if(activeGames[roomId] && activeGames[roomId].players.length === 2) {
      //notify player that the room is full
      socket.emit("room_full");
      return false;
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
    };

    //add player to game
    activeGames[roomId].players.push({id: socket.id, score: 0});

    //start game if there are 3 players
    if(activeGames[roomId].players.length === 2) {
      io.to(roomId).emit("game_ready");
      console.log("game ready");
      startGame(roomId);
    }

    //notify players that a new player has joined
    io.to(roomId).emit("user_joined", activeGames[roomId].players);
  });


  socket.on("answer_question", (data) => {
    const {roomId, answer} = data;
    const currentPlayer = activeGames[roomId].players.find(player => player.id === socket.id);
    if(currentPlayer) {
      const correctAnswer = activeGames[roomId].questions[activeGames[roomId].currentQuestionIndex].answer;
      if(correctAnswer === answer) {
        currentPlayer.score += 1;
        //notify players that the answer was correct
        io.to(roomId).emit("answer_correct", currentPlayer);
        //send the next question
        sendNextQuestion(roomId);
      }
    }

  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
}); 

function startGame(roomId) {
  //send the start game event to all players inside a room
  io.to(roomId).emit("start_game");
  //send the first question
  //wait 4 seconds then start the game
  setTimeout(() => {
    sendNextQuestion(roomId);
  }, 4000);
}

function sendNextQuestion(roomId) {
  // send the current question to all players inside a room
  const question = {
    roomId: roomId,
    user: "admin",
    msg: activeGames[roomId].questions[activeGames[roomId].currentQuestionIndex].question,
    time: new Date().getTime(),
  }
  io.to(roomId).emit("next_question", question)
  //increment the current question index
  if(activeGames[roomId].currentQuestionIndex < activeGames[roomId].questions.length - 1){
    activeGames[roomId].currentQuestionIndex += 1;
  } else {
    gameOver(roomId);
  }
}

function gameOver(roomId) {
  //send the final score to all players inside a room
  io.to(roomId).emit("game_over", activeGames[roomId].players)
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});

