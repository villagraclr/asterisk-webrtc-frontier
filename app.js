const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ari = require('./ari');
const user = require('./user');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = process.env.PORT || 3000;

// Enable CORS if needed
// app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Example route to serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
// Middleware for parsing JSON data
app.use(express.json());

// API routes
app.post('/register', user.registerUser);
app.post('/login', user.loginUser);

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('register', (userData) => {
    // Handle user registration
    user.registerUser(userData)
      .then((user) => {
        socket.emit('registration_success', user);
      })
      .catch((error) => {
        socket.emit('registration_error', error.message);
      });
  });

  // WebSocket event handlers for signaling and media streams
  socket.on('offer', (offer) => {
    // Handle SDP offer and initiate the call setup
    ari.handleOffer(socket, offer)
      .then((answer) => {
        // Send SDP answer to the caller
        socket.emit('answer', answer);
      })
      .catch((error) => {
        socket.emit('call_error', error.message);
      });
  });

  socket.on('answer', (answer) => {
    // Handle SDP answer from the callee
    ari.handleAnswer(socket, answer)
      .catch((error) => {
        socket.emit('call_error', error.message);
      });
  });

  socket.on('icecandidate', (candidate) => {
    // Handle ICE candidate exchange
    ari.handleIceCandidate(socket, candidate)
      .catch((error) => {
        console.error('Error handling ICE candidate:', error.message);
      });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // Clean up resources on user disconnection
    ari.cleanup(socket);
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
