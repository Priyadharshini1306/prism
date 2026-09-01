const socketIO = require('socket.io');

// Active user socket map: userId -> Set of socketIds
const userSockets = new Map();

let io = null;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Map user socket session
    socket.on('register_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        console.log(`👤 Registered User ${userId} on socket ${socket.id}`);
      }
    });

    // --- WATCH PARTY SYNC ---
    socket.on('join_party', ({ partyId, username, userId }) => {
      socket.join(`party-${partyId}`);
      socket.partyId = partyId;
      socket.username = username;
      socket.partyUserId = userId;

      console.log(`🎉 User ${username} joined Watch Party: ${partyId}`);

      // Broadcast join message
      io.to(`party-${partyId}`).emit('party_notification', {
        text: `${username} joined the party!`,
        timestamp: new Date(),
      });
    });

    socket.on('party_play', ({ time }) => {
      if (socket.partyId) {
        console.log(`▶️ Play command at ${time}s in room ${socket.partyId}`);
        socket.to(`party-${socket.partyId}`).emit('party_play', { time });
      }
    });

    socket.on('party_pause', () => {
      if (socket.partyId) {
        console.log(`⏸️ Pause command in room ${socket.partyId}`);
        socket.to(`party-${socket.partyId}`).emit('party_pause');
      }
    });

    socket.on('party_seek', ({ time }) => {
      if (socket.partyId) {
        console.log(`⏭️ Seek command to ${time}s in room ${socket.partyId}`);
        socket.to(`party-${socket.partyId}`).emit('party_seek', { time });
      }
    });

    socket.on('party_message', ({ messageText }) => {
      if (socket.partyId) {
        io.to(`party-${socket.partyId}`).emit('party_message', {
          userId: socket.partyUserId,
          username: socket.username,
          text: messageText,
          timestamp: new Date(),
        });
      }
    });

    // --- WEBRTC LIVE STREAM SIGNALING & CHAT ---
    socket.on('join_stream', ({ creatorId, role, username }) => {
      const roomName = `stream-${creatorId}`;
      socket.join(roomName);
      socket.streamRoom = roomName;
      socket.streamCreatorId = creatorId;
      socket.streamRole = role; // 'broadcaster' or 'watcher'
      socket.username = username;

      console.log(`📡 Socket ${socket.id} joined stream ${creatorId} as ${role}`);

      if (role === 'watcher') {
        // Notify the broadcaster that a watcher has joined
        socket.to(roomName).emit('watcher_joined', { socketId: socket.id, username });
      }
    });

    // Broadcaster relays SDP offer to a specific watcher
    socket.on('webrtc_offer', ({ targetSocketId, sdp }) => {
      console.log(`📤 Relay WebRTC offer from broadcaster ${socket.id} to watcher ${targetSocketId}`);
      io.to(targetSocketId).emit('webrtc_offer', {
        broadcasterSocketId: socket.id,
        sdp,
      });
    });

    // Watcher sends SDP answer back to the broadcaster
    socket.on('webrtc_answer', ({ targetSocketId, sdp }) => {
      console.log(`📥 Relay WebRTC answer from watcher ${socket.id} to broadcaster ${targetSocketId}`);
      io.to(targetSocketId).emit('webrtc_answer', {
        watcherSocketId: socket.id,
        sdp,
      });
    });

    // Relay ICE candidate between peer connections
    socket.on('ice_candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice_candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // Live Stream Chat Message
    socket.on('stream_message', ({ messageText }) => {
      if (socket.streamRoom) {
        io.to(socket.streamRoom).emit('stream_message', {
          username: socket.username,
          text: messageText,
          timestamp: new Date(),
        });
      }
    });

    // Handle Disconnections
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      // Cleanup user registration map
      if (socket.userId && userSockets.has(socket.userId)) {
        const sockets = userSockets.get(socket.userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(socket.userId);
        }
      }

      // Cleanup Watch Party room notifications
      if (socket.partyId && socket.username) {
        socket.to(`party-${socket.partyId}`).emit('party_notification', {
          text: `${socket.username} left the party.`,
          timestamp: new Date(),
        });
      }

      // Cleanup Stream watchers
      if (socket.streamRoom && socket.streamRole === 'watcher') {
        socket.to(socket.streamRoom).emit('watcher_left', { socketId: socket.id });
      }
    });
  });

  return io;
};

// Push real-time notification to active client sockets
const sendRealTimeNotification = (userId, notification) => {
  if (!io) return;
  const userSocketsSet = userSockets.get(userId.toString());
  if (userSocketsSet && userSocketsSet.size > 0) {
    console.log(`🔔 Pushing real-time notification to user ${userId}`);
    userSocketsSet.forEach((socketId) => {
      io.to(socketId).emit('new_notification', notification);
    });
  }
};

module.exports = {
  initSocket,
  sendRealTimeNotification,
};
