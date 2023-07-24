const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const getMediaButton = document.getElementById('getMediaButton');
const messageContainer = document.getElementById('receivedMessages');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessageButton');

let localStream; // Store the local media stream
let peerConnection; // The WebRTC peer connection
let dataChannel; // The RTC data channel for text messages

let isMuted = false;
let isOnHold = false;
let isVideoEnabled = true;

// Connect to the signaling server using WebSocket
const socket = io();

// Handler for when a new user connects
socket.on('connect', () => {
  console.log('Connected to signaling server');
  getMediaButton.disabled = false; // Enable the "Get User Media" button when connected
});

// Handler for when a new user disconnects
socket.on('disconnect', () => {
  console.log('Disconnected from signaling server');
  getMediaButton.disabled = true; // Disable the "Get User Media" button when disconnected
  hangupCall(); // Hang up the call if disconnected from the signaling server
});

// Handler for user registration success
socket.on('registration_success', (user) => {
  console.log('Registration successful:', user.username);
  // You can store user data or show a success message to the user
});

// Handler for user registration error
socket.on('registration_error', (error) => {
  console.error('Registration error:', error);
  // Show an error message to the user
});

// Function to get the user's media (camera and microphone)
async function getUserMedia() {
  try {
    // Get the user's media stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStream = stream;
    // Display the local media stream on the local video element
    localVideo.srcObject = stream;
    // Enable the "Call" button after getting the media
    callButton.disabled = false;
    console.log('User media obtained');
  } catch (error) {
    console.error('Error getting user media:', error.message);
    alert('Failed to get user media. Please check your camera and microphone permissions.');
  }
}

// Function to create a new peer connection and handle media streams
async function createPeerConnection() {
  try {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnection = new RTCPeerConnection(configuration);

    // Add local media stream to the peer connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Set up remote video element source when a remote stream is added
    peerConnection.ontrack = event => {
      remoteVideo.srcObject = event.streams[0];
    };

    // Create and set up the RTC data channel
    dataChannel = peerConnection.createDataChannel('chat');
    dataChannel.onopen = handleDataChannelOpen;
    dataChannel.onmessage = handleDataChannelMessage;

    console.log('Peer connection created');
  } catch (error) {
    console.error('Error creating peer connection:', error.message);
    throw error;
  }
}

// Function to handle the RTC data channel open event
function handleDataChannelOpen() {
  console.log('RTC Data Channel is open');
  sendMessageButton.disabled = false; // Enable the "Send Message" button when the data channel is open
}

// Function to handle incoming messages on the RTC data channel
function handleDataChannelMessage(event) {
  const message = event.data;
  displayMessage(message);
}

// Function to display a received message
function displayMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageContainer.appendChild(messageElement);
}

// Function to send a message via the RTC data channel
function sendMessage() {
  const message = messageInput.value.trim();
  if (message !== '') {
    dataChannel.send(message);
    displayMessage('You: ' + message); // Display the sent message
    messageInput.value = ''; // Clear the input field
  }
}

// Function to initiate a call
async function initiateCall() {
  try {
    // Create a new peer connection and handle media streams
    await createPeerConnection();

    // Create an SDP offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send the SDP offer to the server
    socket.emit('offer', offer);
  } catch (error) {
    console.error('Error initiating call:', error.message);
    // Clean up resources and display error message
    hangupCall();
    alert('Failed to initiate call.');
  }
}

// Function to handle SDP offer and initiate the call setup
socket.on('offer', async (offer) => {
  try {
    // Create a new peer connection and handle media streams
    await createPeerConnection();

    // Set the received SDP offer as the remote description
    await peerConnection.setRemoteDescription(offer);

    // Create an SDP answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Send the SDP answer to the server
    socket.emit('answer', answer);
  } catch (error) {
    console.error('Error handling SDP offer:', error.message);
    // Clean up resources and display error message
    hangupCall();
    alert('Failed to handle call offer.');
  }
});

// Function to handle SDP answer from the callee
socket.on('answer', async (answer) => {
  try {
    // Set the received SDP answer as the remote description
    await peerConnection.setRemoteDescription(answer);
  } catch (error) {
    console.error('Error handling SDP answer:', error.message);
  }
});

// Function to handle ICE candidate exchange
socket.on('icecandidate', async (candidate) => {
  try {
    // Add the received ICE candidate to the peer connection
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('Error handling ICE candidate:', error.message);
  }
});

// Function to hang up the call
function hangupCall() {
  if (peerConnection) {
    // Close the peer connection
    peerConnection.close();
    peerConnection = null;
  }

  // Stop the local media stream and remove it from the local video element
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
    localStream = null;
  }

  // Reset the remote video element source
  remoteVideo.srcObject = null;

  // Inform the server about the hangup
  socket.disconnect();

  // Disable the "Call" and "Hangup" buttons after hanging up the call
  callButton.disabled = true;
  hangupButton.disabled = true;
  sendMessageButton.disabled = true; // Disable the "Send Message" button after hanging up the call
}
// Function to toggle mute state
function toggleMute() {
    if (peerConnection) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        isMuted = !isMuted;
        audioTracks[0].enabled = !isMuted;
      }
    }
  }
  
  // Function to toggle hold state
  function toggleHold() {
    if (peerConnection) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        isOnHold = !isOnHold;
        videoTracks[0].enabled = !isOnHold;
      }
    }
  }
  // Function to toggle local video
  function toggleVideo() {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        isVideoEnabled = !isVideoEnabled;
        videoTracks[0].enabled = isVideoEnabled;
        // Show/hide local video element based on video state
        localVideo.style.display = isVideoEnabled ? 'block' : 'none';
      }
    }
  }
// Event handler for the "Get User Media" button
getMediaButton.addEventListener('click', getUserMedia);

// Event handler for the "Call" button
callButton.addEventListener('click', initiateCall);

// Event handler for the "Hangup" button
hangupButton.addEventListener('click', hangupCall);

// Event handler for the "Send Message" button
sendMessageButton.addEventListener('click', sendMessage);

// Event handler for the "Toggle Mute" button
toggleMuteButton.addEventListener('click', toggleMute);

// Event handler for the "Toggle Hold" button
toggleHoldButton.addEventListener('click', toggleHold);

// Event handler for the "Toggle Video" button
toggleVideoButton.addEventListener('click', toggleVideo);