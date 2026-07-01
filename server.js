const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let teams = [];

let gameState = {
  displayMode: "intro",
  currentSlideIndex: 0,
  finalRevealCount: 0,
  podiumRevealCount: 0
};

app.use(express.static("public"));

io.on("connection", (socket) => {
  socket.emit("updateTeams", teams);
  socket.emit("gameState", gameState);

  socket.on("updateTeams", (updatedTeams) => {
    teams = updatedTeams || [];
    io.emit("updateTeams", teams);
  });

  socket.on("gameState", (updatedState) => {
    gameState = {
      ...gameState,
      ...updatedState
    };

    io.emit("gameState", gameState);
  });

  socket.on("resetGameState", () => {
    gameState = {
      displayMode: "intro",
      currentSlideIndex: 0,
      finalRevealCount: 0,
      podiumRevealCount: 0
    };

    io.emit("gameState", gameState);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});