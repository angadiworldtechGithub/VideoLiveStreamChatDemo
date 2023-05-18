let userVideo;
let videoGrid;
let myPeer;
let myVideo;
let myVideoStream;
const peers = {};
const streamCalled = {}; // Since streams are called twice
const SOCKET_IO_PORT = 4000;

// close peer connection when the browser closes

$(() => {
  const socket = io(`ws://localhost:${SOCKET_IO_PORT}`);
  userVideo = document.getElementById("user-video");
  videoGrid = document.getElementById("video-grid");
  myVideo = document.createElement("video");
  myVideo.muted = true;

  navigator.mediaDevices
    .getUserMedia({
      video: { width: 1200, height: 1000 },
      audio: true,
    })
    .then((stream) => {
      console.log("Video Stream Acquired");

      myPeer = new Peer(USER_ID, {
        path: "/peerjs",
        host: "/",
        port: "3030",
      });

      myPeer.on("open", (id) => {
        console.info(`User - ${id} is joining room ${ROOM_ID}`);
        socket.emit("join-room", ROOM_ID, id);
      });

      myPeer.on("call", (call) => {
        console.log("Receiving a call");
        call.answer(stream);
        const video = document.createElement("video");
        call.on("stream", streamHandler(video));
      });

      myPeer.on("error", (error) => console.error(error));

      socket.on("user-connected", (userId) => {
        console.info(`User - ${userId} is Connecting`);
        connectToNewUser(userId, stream);
      });

      myVideoStream = stream;
      addVideoStream(myVideo, stream, "user");
    })
    .catch((error) => {
      // code to show that the feed is broken.
      console.error(error);
    });

  socket.on("user-disconnected", (userId) => {
    if (peers[userId]) peers[userId].close();
  });

  // input value
  let text = $("input");
  // when press enter send message
  $("html").keydown(function (e) {
    if (e.which == 13 && text.val().length !== 0) {
      socket.emit("message", text.val(), USER_ID);
      text.val("");
    }
  });
  socket.on("createMessage", (message, userId) => {
    $("ul").append(
      `<li class="message"><b>User - <span class="user_id">${userId}</span></b><br/>${message}</li>`
    );
    scrollToBottom();
  });
});

function connectToNewUser(userId, stream) {
  console.log("Connecting to New User Peer");
  if (myPeer) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement("video");
    call.on("stream", streamHandler(video));

    call.on("close", () => {
      console.log("Call closing");
      video.parentElement.remove();
      video.remove();
    });
    peers[userId] = call;
  } else {
    console.error("My Peer not initialised");
  }
}

function addVideoStream(video, stream, type) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });

  if (type === "user") {
    userVideo.prepend(video);
  } else if (type === "caller") {
    const div = document.createElement("div");
    div.classList.add("video-pip");
    div.append(video);
    videoGrid.append(div);
  }
}

function streamHandler(video) {
  return function (userVideoStream) {
    if (!streamCalled[userVideoStream]) {
      addVideoStream(video, userVideoStream, "caller");
      streamCalled[userVideoStream] = true;
    }
  };
}

const scrollToBottom = () => {
  var d = $(".main__chat_window");
  d.scrollTop(d.prop("scrollHeight"));
};

const muteUnmute = () => {
  if (myVideoStream) {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getAudioTracks()[0].enabled = false;
      setUnmuteButton();
    } else {
      setMuteButton();
      myVideoStream.getAudioTracks()[0].enabled = true;
    }
  } else {
    console.error("Video not Enabled");
  }
};

const playStop = () => {
  if (myVideoStream) {
    console.log("Video Stopped");
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getVideoTracks()[0].enabled = false;
      setPlayVideo();
      // add user id inplace of video or do it via html
    } else {
      setStopVideo();
      myVideoStream.getVideoTracks()[0].enabled = true;
      // remove user id inplace of video or do it via html
    }
  } else {
    console.error("Video not Enabled");
  }
};

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};
