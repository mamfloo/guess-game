const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const express = require("express");
const app = express();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const he = require("he");
const appConfig = require("../appConfig.json");

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
    if(activeGames[roomId] && activeGames[roomId].players.length === appConfig.maxPlayers) {
      //notify player that the room is full
      socket.emit("cannot_join", "Room is full");
      return;
    }
    if(activeGames[roomId] && activeGames[roomId].players.find(player => player.username === userName)){
      //notify player that the username is already taken
      socket.emit("cannot_join", "Username already taken");
      return;
    }
    socket.join(roomId);
    console.log(`user with id-${socket.id} joined room - ${roomId}`);

    //initialize game or check if game for that room already exists
    if(activeGames[roomId] === undefined || activeGames[roomId].state === 2) {
      activeGames[roomId] = {
        players: activeGames[roomId] ? activeGames[roomId].players : [],
        questions: [],
        currentQuestionIndex: 0,
        //states: 0: waiting for players, 1: playing, 2: ended
        state: 0
      };
      console.log("questions fetched", activeGames[roomId].questions)
    } 

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
      io.to(roomId).emit("message_receiver", data)
      const correctAnswer = activeGames[roomId].questions[activeGames[roomId].currentQuestionIndex -1].answer;
      if(correctAnswer.toLowerCase() === msg.toLowerCase()) {
        currentPlayer.score += 1;
        //notify players that the answer was correct
        const playerGuessedMessage = {
          roomId: roomId,
          user: "Server",
          msg: `${user} guessed, correct answer was "${msg}"`,
          time: new Date().getTime(),
        }
        io.to(roomId).emit("message_receiver", playerGuessedMessage);
        //send the next question
        sendNextQuestion(roomId);
      }
    }
  });

  socket.on("user_disconnected", ({roomId, username}) => {
    //remove player from game when it disconnects
    if(activeGames[roomId]) {
      activeGames[roomId].players = activeGames[roomId].players.filter(player => player.username !== username);
      //update the client "players" let with the new players 
      io.to(roomId).emit("server_status", activeGames[roomId].players)
      if(activeGames[roomId].players.length === 0) {
        delete activeGames[roomId];
      }
    }
  })

  socket.on("player_ready", ({roomId, username}) => {
    if(activeGames[roomId]) {
      const player = activeGames[roomId].players.find(player => player.username === username);
      if(player) {
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

async function startGame(roomId) {
  //make a request to the trivia api to get the questions
  const questionData = await fetch(`https://opentdb.com/api.php?amount=${appConfig.questionsPerGame}&type=multiple`);
  const questions = await questionData.json();
  questions.results.forEach(question => {
    question.question = he.decode(question.question);
    question.correct_answer = he.decode(question.correct_answer);
    question.incorrect_answers = question.incorrect_answers.map(answer => he.decode(answer));})
  //set the questions
  activeGames[roomId].questions = questions.results.map(question => {
    return {
      question: question.question,
      answer: question.correct_answer,
      incorrectAnswers: question.incorrect_answers
    }
  });
  //send the start game message to all players inside a room
  const message = {
    roomId: roomId,
    user: "Server",
    msg: "Game will start in 2 seconds",
    time: new Date().getTime(),
  }
  io.to(roomId).emit("message_receiver", message);
  //set the state to playing
  activeGames[roomId].state = 1;
  //send the first question after 2 seconds
  setTimeout(() => {
    sendNextQuestion(roomId);
  }, 2000);
}

function sendNextQuestion(roomId) {
  const currentQuestionIndex = activeGames[roomId].currentQuestionIndex;
  //increment the current question index or game over if no more questions
  activeGames[roomId].currentQuestionIndex += 1;
  // send the current question to all players inside a room
  if(activeGames[roomId].currentQuestionIndex <= activeGames[roomId].questions.length) {
    //order the answers randomly alphabetically
    const answerShuffled = [activeGames[roomId].questions[currentQuestionIndex].answer, ...activeGames[roomId].questions[currentQuestionIndex].incorrectAnswers].sort();
    const question = {
      roomId: roomId,
      user: "Server",
      msg: activeGames[roomId].questions[currentQuestionIndex].question + " \n a) "  + answerShuffled[0] + "\n b) " 
      + answerShuffled[1] + "\n c) " + answerShuffled[2]  + "\n d) " + answerShuffled[3],
      time: new Date().getTime(),
    }
    io.to(roomId).emit("message_receiver", question)
  } else {
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
    activeGames[roomId].state = 2;
    activeGames[roomId].questions = [];
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



