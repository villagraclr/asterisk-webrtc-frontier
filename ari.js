const axios = require('axios');
// Load environment variables from .env file
require('dotenv').config();

// Your Asterisk ARI credentials
const asteriskUsername = process.env.ARI_USERNAME;
const asteriskPassword = process.env.ARI_PASSWORD;
const asteriskBaseUrl = process.env.ARI_BASE_URL;

// Authenticate with Asterisk ARI using HTTP Basic Authentication
async function authenticateWithAsterisk() {
  try {
    const response = await axios.post(
      `${asteriskBaseUrl}/apiKey`,
      {},
      {
        auth: {
          username: asteriskUsername,
          password: asteriskPassword,
        },
      }
    );
    return response.data.apiKey;
  } catch (error) {
    console.error('Failed to authenticate with Asterisk ARI:', error.message);
    return null;
  }
}

// Function to create a new channel in Asterisk
async function createChannel(endpoint) {
  try {
    const apiKey = await authenticateWithAsterisk();
    if (!apiKey) {
      throw new Error('Authentication with Asterisk ARI failed');
    }

    const response = await axios.post(
      `${asteriskBaseUrl}/channels`,
      {
        endpoint: endpoint, // Replace with the desired SIP endpoint
        app: 'webphone',
        appArgs: 'dialed', // Replace with your dialplan context
      },
      {
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    console.log('Channel created:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Failed to create channel:', error.message);
    return null;
  }
}

// Create a new endpoint in Asterisk ARI
async function createEndpoint() {
    try {
      const apiKey = await authenticateWithAsterisk();
      if (!apiKey) {
        console.log('Failed to create endpoint: Authentication failed');
        return;
      }
  
      const response = await axios.post(
        `${asteriskBaseUrl}/endpoints`,
        {
          technology: 'PJSIP', // Replace with the desired technology (e.g., 'PJSIP' or 'SIP')
          endpoint: '1001', // Replace with the desired endpoint name
          context: 'default', // Replace with the desired context
          disallow: 'all',
          allow: 'ulaw',
        },
        {
          headers: {
            Authorization: `Basic ${apiKey}`,
          },
        }
      );
  
      console.log('Endpoint created:', response.data.technology, response.data.resource);
      return response.data.resource;
    } catch (error) {
      console.error('Failed to create endpoint:', error.message);
    }
  }
  
// Function to create a new bridge in Asterisk
async function createBridge() {
  try {
    const apiKey = await authenticateWithAsterisk();
    if (!apiKey) {
      throw new Error('Authentication with Asterisk ARI failed');
    }

    const response = await axios.post(
      `${asteriskBaseUrl}/bridges`,
      {},
      {
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    console.log('Bridge created:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Failed to create bridge:', error.message);
    return null;
  }
}

// Function to continue a channel in the dialplan and connect it to a bridge
async function connectChannelToBridge(channelId, bridgeId) {
  try {
    const apiKey = await authenticateWithAsterisk();
    if (!apiKey) {
      throw new Error('Authentication with Asterisk ARI failed');
    }

    const response = await axios.post(
      `${asteriskBaseUrl}/channels/${channelId}/continueInDialplan`,
      {
        app: 'bridge',
        appArgs: `both_bridges,${bridgeId}`,
      },
      {
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    console.log('Channel continued in dialplan:', response.data);
  } catch (error) {
    console.error('Failed to continue channel in dialplan:', error.message);
    throw error;
  }
}

// Function to handle SDP offer and initiate the call setup
async function handleOffer(socket, offer) {
  try {
    // Create a new channel when the first user initiates a call
    let endpoint = process.env.ARI_ENDPOINT_CHANNEL;
    const channelId = await createChannel(endpoint);
    if (!channelId) {
      throw new Error('Failed to create channel');
    }

    // Create a new bridge when the first user initiates a call
    const bridgeId = await createBridge();
    if (!bridgeId) {
      throw new Error('Failed to create bridge');
    }

    // Store the channel ID and bridge ID in the socket's context
    socket.channelId = channelId;
    socket.bridgeId = bridgeId;

    // Add the second user to the bridge
    await connectChannelToBridge(channelId, bridgeId);

    // TODO: Handle WebRTC signaling and ICE candidate exchange
    // You need to exchange SDP answers and ICE candidates with the other client

    return null; // Replace null with the SDP answer for the caller
  } catch (error) {
    console.error('Error setting up call:', error.message);
    throw error;
  }
}

// Function to handle SDP answer from the callee
async function handleAnswer(socket, answer) {
  try {
    // TODO: Handle SDP answer from the callee
    // Set the received SDP answer as the remote description of the peer connection

    return null; // Replace null with the SDP answer for the caller
  } catch (error) {
    console.error('Error handling SDP answer:', error.message);
    throw error;
  }
}

// Function to handle ICE candidate exchange
async function handleIceCandidate(socket, candidate) {
  try {
    // TODO: Handle ICE candidate exchange
    // Add the received ICE candidate to the peer connection

    return null; // Replace null with the ICE candidate for the caller
  } catch (error) {
    console.error('Error handling ICE candidate:', error.message);
    throw error;
  }
}

// Function to clean up resources on call termination
async function cleanup(socket) {
  try {
    const channelId = socket.channelId;
    const bridgeId = socket.bridgeId;

    // Remove the channel from the bridge
    if (channelId && bridgeId) {
      await removeChannelFromBridge(channelId, bridgeId);
    }

    // Destroy the bridge
    if (bridgeId) {
      await destroyBridge(bridgeId);
    }

    // TODO: Clean up any other resources, e.g., close peer connection, close media streams

    console.log('Clean up resources');
  } catch (error) {
    console.error('Error cleaning up:', error.message);
  }
}

// Function to remove a channel from a bridge
async function removeChannelFromBridge(channelId, bridgeId) {
  try {
    const apiKey = await authenticateWithAsterisk();
    if (!apiKey) {
      throw new Error('Authentication with Asterisk ARI failed');
    }

    await axios.delete(
      `${asteriskBaseUrl}/bridges/${bridgeId}/removeChannel`,
      {
        data: { channel: channelId },
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    console.log('Channel removed from bridge');
  } catch (error) {
    console.error('Error removing channel from bridge:', error.message);
    throw error;
  }
}

// Function to destroy a bridge
async function destroyBridge(bridgeId) {
  try {
    const apiKey = await authenticateWithAsterisk();
    if (!apiKey) {
      throw new Error('Authentication with Asterisk ARI failed');
    }

    await axios.post(
      `${asteriskBaseUrl}/bridges/${bridgeId}/destroy`,
      {},
      {
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    console.log('Bridge destroyed');
  } catch (error) {
    console.error('Error destroying bridge:', error.message);
    throw error;
  }
}

module.exports = {
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  cleanup,
};
