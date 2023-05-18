let videoGrid;
let myPeer;
let myVideo;
let myVideoStream;
const peers = {};
const SOCKET_IO_PORT = 4000;

// seperate chat from user

$(() => {
  const socket = io(`ws://localhost:${SOCKET_IO_PORT}`);
  videoGrid = document.getElementById("video-grid");
  myVideo = document.createElement("video");
  myVideo.muted = true;

  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      console.log("Video Stream Acquired");

      myPeer = new Peer(USER_ID, {
        path: "/peerjs",
        host: "/",
        port: "3030",
      });

      myPeer.on("call", (call) => {
        call.answer(stream);
        const video = document.createElement("video");
        call.on("stream", (userVideoStream) => {
          addVideoStream(video, userVideoStream);
        });
      });

      myPeer.on("open", (id) => {
        console.info(`User - ${id} is joining room ${ROOM_ID}`);
        socket.emit("join-room", ROOM_ID, id);
      });

      myPeer.on("error", (error) => console.error(error));

      socket.on("user-connected", (userId) => {
        console.info(`User - ${userId} is Connecting`);
        connectToNewUser(userId, stream);
      });

      myVideoStream = stream;
      addVideoStream(myVideo, stream);
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
  if (myPeer) {
    const call = myPeer.call(userId, stream);
    console.log(call);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream);
    });
    call.on("close", () => {
      video.remove();
    });
    peers[userId] = call;
  } else {
    console.error("My Peer not initialised");
  }
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
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
    } else {
      setStopVideo();
      myVideoStream.getVideoTracks()[0].enabled = true;
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
