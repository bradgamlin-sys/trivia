const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
let teams = [];

app.use(express.static("public"));

io.on("connection", (socket) => {
  socket.emit("updateTeams", teams);

  socket.on("updateTeams", (updatedTeams) => {
    teams = updatedTeams;
    io.emit("updateTeams", teams);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
