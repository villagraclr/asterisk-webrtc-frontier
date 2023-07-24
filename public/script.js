const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Connect to the signaling server using WebSocket
const socket = io();

// Handler for when a new user connects
socket.on('connect', () => {
  console.log('Connected to signaling server');
});

// Handler for when a new user disconnects
socket.on('disconnect', () => {
  console.log('Disconnected from signaling server');
});

// Handler for receiving SDP offer/answer from the server
socket.on('answer', async (answer) => {
  try {
    // Set the received SDP answer as the remote description
    await peerConnection.setRemoteDescription(answer);
  } catch (error) {
    console.error('Error setting remote description:', error.message);
  }
});

// Handler for receiving ICE candidate from the server
socket.on('icecandidate', async (candidate) => {
  try {
    // Add the received ICE candidate to the peer connection
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('Error adding ICE candidate:', error.message);
  }
});

// Function to create a peer connection and set up media streams
async function createPeerConnection() {
  try {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnection = new RTCPeerConnection(configuration);

    // Add local media stream to the peer connection
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    // Set local video element source
    localVideo.srcObject = stream;

    // Event handlers for gathering ICE candidates
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // Send ICE candidate to the server
        socket.emit('icecandidate', event.candidate);
      }
    };

    // Set up remote video element source when a remote stream is added
    peerConnection.ontrack = event => {
      remoteVideo.srcObject = event.streams[0];
    };

    console.log('Peer connection created');
  } catch (error) {
    console.error('Error creating peer connection:', error.message);
  }
}

// Function to initiate a call
async function initiateCall() {
  try {
    // Create a new peer connection
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

// Function to hang up the call
function hangupCall() {
  if (peerConnection) {
    // Close the peer connection and reset the video elements
    peerConnection.close();
    peerConnection = null;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    // Inform the server about the hangup
    socket.disconnect();
  }
}

// Event handler for the call button
callButton.addEventListener('click', initiateCall);

// Event handler for the hangup button
hangupButton.addEventListener('click', hangupCall);

let peerConnection;
