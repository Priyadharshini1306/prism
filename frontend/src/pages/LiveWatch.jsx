import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Radio, Send, Users, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const LiveWatch = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const { user, socket } = useAuth();

  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [streamActive, setStreamActive] = useState(false);

  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // 1. Fetch Creator details
  useEffect(() => {
    const fetchCreatorDetails = async () => {
      try {
        const { data } = await api.get(`/auth/user/${creatorId}`);
        if (data.success) {
          setCreator(data.user);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load channel details');
      } finally {
        setLoading(false);
      }
    };
    fetchCreatorDetails();
  }, [creatorId]);

  // 2. Configure Sockets and WebRTC Listening
  useEffect(() => {
    if (!socket || !user || !creator) return;

    console.log(`📡 Connecting to stream: ${creatorId}`);

    // Join room as watcher
    socket.emit('join_stream', {
      creatorId,
      role: 'watcher',
      username: user.username,
    });

    // Broadcaster sends Offer SDP -> Create Peer Connection & Respond with Answer
    socket.on('webrtc_offer', async ({ broadcasterSocketId, sdp }) => {
      console.log('📥 Received WebRTC Offer. Setting up remote connection description...');
      
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle remote tracks addition (plays broadcaster camera feed)
      pc.ontrack = (event) => {
        console.log('🎬 Received remote video tracks');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStreamActive(true);
        }
      };

      // Handle ICE Candidates from remote
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            targetSocketId: broadcasterSocketId,
            candidate: event.candidate,
          });
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', {
          targetSocketId: broadcasterSocketId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Failed to set SDP descriptions', err);
      }
    });

    // Received ICE candidates from broadcaster
    socket.on('ice_candidate', async ({ senderSocketId, candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Failed to apply ICE Candidate', err);
        }
      }
    });

    // Broadcaster ended stream
    socket.on('watcher_left', () => {
      // Broadcaster disconnected
      setStreamActive(false);
      toast.error('Stream has ended.');
    });

    // Live Stream Chat Message
    socket.on('stream_message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('ice_candidate');
      socket.off('watcher_left');
      socket.off('stream_message');

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      setStreamActive(false);
    };
  }, [socket, user, creator, creatorId]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('stream_message', { messageText: chatInput });
    setChatInput('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 flex justify-center text-white">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!creator) return <div className="min-h-screen bg-[#0a0a0f] pt-32 text-center text-white">Creator not found</div>;

  return (
    <div className="pt-24 px-6 md:px-12 pb-20 max-w-7xl mx-auto min-h-screen bg-[#0a0a0f] text-white flex flex-col lg:flex-row gap-8">
      {/* Left Column: Live Stream Player */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-white/5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Watching: {creator.username}</span>
            </h1>
            <p className="text-gray-400 text-xs mt-1">Live camera WebRTC stream broadcast</p>
          </div>
        </div>

        {/* Video feed player container */}
        <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {streamActive && (
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Radio size={12} />
              <span>Live</span>
            </div>
          )}

          {!streamActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-gray-400 gap-3">
              <Radio className="text-gray-600 animate-pulse" size={48} />
              <p className="text-sm font-semibold">Broadcaster is currently offline</p>
              <p className="text-xs text-gray-600">Waiting for live video feed to start...</p>
            </div>
          )}
        </div>

        {/* Creator Channel profile */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={creator.avatar} alt={creator.username} className="w-12 h-12 rounded-full border border-white/10" />
            <div>
              <p className="text-white font-bold">{creator.username}</p>
              <p className="text-gray-500 text-xs">{creator.subscribers ? creator.subscribers.length : 0} subscribers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Stream Chat */}
      <div className="w-full lg:w-96 bg-white/5 border border-white/10 rounded-3xl flex flex-col h-[550px] overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 bg-white/2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Live Chat</h3>
          <span className={`h-2 w-2 rounded-full ${streamActive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-purple-400 font-bold">{msg.username}</span>
                <span className="text-[8px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="p-3 bg-white/5 text-gray-200 border border-white/10 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[85%]">
                {msg.text}
              </div>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-xs">
              Welcome to the live chat!
            </div>
          )}
        </div>

        <form onSubmit={handleSendChat} className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-all"
          />
          <button 
            type="submit"
            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveWatch;
