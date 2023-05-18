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

peerServer.on("connection", (client) => {
  console.log(`Peer Client Connected - ${JSON.stringify(client.getId())}`);
});

app.use((req, res, next) => {
  res.append("Permissions-Policy", "camera=(self)");
  res.append("Permissions-Policy", "microphone=(self)");
  next();
});
app.use(cors());
app.use("/peerjs", peerServer);
app.set("view engine", "ejs");
app.use("/", express.static("public"));
app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}/${uuidV4()}`);
});
app.get("/:roomId", (req, res) => {
  res.redirect(`/${req.params.roomId}/${uuidV4()}`);
});
app.get("/:roomId/:userId", (req, res) => {
  res.render("room", { roomId: req.params.roomId, userId: req.params.userId });
});

io.on("connection", (socket) => {
  console.log("CONNECT CREATED");
  socket.on("join-room", (roomId, userId) => {
    console.log(`User - ${userId} connecting to ${roomId}`);

    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
    // messages
    socket.on("message", (message, userId) => {
      // send message to everyone in the same room
      io.to(roomId).emit("createMessage", message, userId);
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

// httpServer.on("request", (req) => {
//   console.log("Incoming Request");
//   console.log(req.method);
// });

// Users can join the room
// Users can open a peer connection and call other users.
// Initial communication happens via socket.io
// When new user joins, every other user calls that user with his/her userId
