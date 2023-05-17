const express = require("express");
const cors = require("cors");
const { Server: HttpsServer } = require("https");
const { Server: SocketIOServer } = require("socket.io");
const fs = require("fs");

const { ExpressPeerServer } = require("peer");
const { v4: uuidV4 } = require("uuid");

const PEER_PORT = 3030;
const EXPRESS_PORT = 3030;
const SOCKET_IO_PORT = 4000;

const key = fs.readFileSync("./cert.key");
const cert = fs.readFileSync("./cert.crt");

const app = express();
const io = new SocketIOServer(undefined, {
  cors: {
    origin: [
      `http://localhost:${EXPRESS_PORT}`,
      `https://localhost:${EXPRESS_PORT}`,
    ],
  },
});
// Only if it on local
const httpServer = new HttpsServer({ key, cert }, app);

const peerServer = ExpressPeerServer(httpServer, {
  debug: true,
  port: PEER_PORT,
});

app.use(cors());
app.use("/peerjs", peerServer);
app.set("view engine", "ejs");
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});
app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  console.log("CONNECT CREATED");
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
    // messages
    socket.on("message", (message) => {
      //send message to the same room
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

httpServer.listen(EXPRESS_PORT, () => {
  console.log("Server is running");
});

io.listen(SOCKET_IO_PORT);
console.log("Socket.io is running");

httpServer.on("request", (req) => {
  console.log("Incoming Request");
  console.log(req.method);
});

// Peerjs generates the user id.
// On load the room id is generated and must be shared.
// users can join the room
// seperate the servers to fix the issue.
