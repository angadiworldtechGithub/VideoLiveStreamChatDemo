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

const IP_ADD = "192.168.0.103";

const key = fs.readFileSync("./cert.key");
const cert = fs.readFileSync("./cert.crt");

const app = express();
const ioServer = new HttpsServer({ key, cert });
const io = new SocketIOServer(ioServer, {
  cors: {
    origin: "*",
  },
});

// Only if it on local
const httpsServer = new HttpsServer({ key, cert }, app);

const peerServer = ExpressPeerServer(httpsServer, {
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
  res.redirect("/room");
});
app.get("/room", (req, res) => {
  res.redirect(`/room/${uuidV4()}/${uuidV4()}`);
});
app.get("/room/:roomId", (req, res) => {
  res.redirect(`/room/${req.params.roomId}/${uuidV4()}`);
});
app.get("/room/:roomId/:userId", (req, res) => {
  res.render("room", { roomId: req.params.roomId, userId: req.params.userId });
});
app.get("/disconnected_page", (req, res) => {
  res.send(
    "<body style='display:flex;justify-content:center;align-items:center'><h1>Disconnected</h1></body>"
  );
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

httpsServer.listen(EXPRESS_PORT, IP_ADD, () => {
  console.log("Server is running");
});

ioServer.listen(SOCKET_IO_PORT, IP_ADD, () => {
  console.log("Socketio server is running");
});

// Users can join the room
// Users can open a peer connection and call other users.
// Initial communication happens via socket.io
// When new user joins, every other user calls that user with his/her userId
