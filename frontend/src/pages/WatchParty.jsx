import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Send, Users, Play, Pause, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const WatchParty = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('video');
  const navigate = useNavigate();
  const { user, socket } = useAuth();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [notifications, setNotifications] = useState([]);

  const videoRef = useRef(null);
  const ignoreEvents = useRef(false);
  const chatEndRef = useRef(null);

  // 1. Fetch Video Details
  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        toast.error('No video specified for watch party');
        navigate('/');
        return;
      }
      try {
        const { data } = await api.get(`/videos/${videoId}`);
        if (data.success) {
          setVideo(data.data);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load video');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId, navigate]);

  // 2. Manage Sockets Sync
  useEffect(() => {
    if (!socket || !user || !video) return;

    // Join room
    socket.emit('join_party', {
      partyId: roomId,
      username: user.username,
      userId: user._id || user.id,
    });

    // Listeners
    socket.on('party_play', ({ time }) => {
      console.log('🔌 Recv Socket Play at', time);
      if (videoRef.current) {
        ignoreEvents.current = true;
        const diff = Math.abs(videoRef.current.currentTime - time);
        if (diff > 1.5) {
          videoRef.current.currentTime = time;
        }
        videoRef.current.play().catch(e => console.error(e));
      }
    });

    socket.on('party_pause', () => {
      console.log('🔌 Recv Socket Pause');
      if (videoRef.current && !videoRef.current.paused) {
        ignoreEvents.current = true;
        videoRef.current.pause();
      }
    });

    socket.on('party_seek', ({ time }) => {
      console.log('🔌 Recv Socket Seek to', time);
      if (videoRef.current) {
        ignoreEvents.current = true;
        videoRef.current.currentTime = time;
      }
    });

    socket.on('party_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('party_notification', (notif) => {
      setNotifications((prev) => [...prev, notif]);
      toast(notif.text, { icon: '🎉' });
    });

    return () => {
      socket.off('party_play');
      socket.off('party_pause');
      socket.off('party_seek');
      socket.off('party_message');
      socket.off('party_notification');
    };
  }, [socket, user, video, roomId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. User Interaction Handlers (HTML5 Video Event Callbacks)
  const onPlay = () => {
    if (ignoreEvents.current) {
      ignoreEvents.current = false;
      return;
    }
    if (socket && socket.connected && videoRef.current) {
      console.log('📤 Emit Play at', videoRef.current.currentTime);
      socket.emit('party_play', { time: videoRef.current.currentTime });
    }
  };

  const onPause = () => {
    if (ignoreEvents.current) {
      ignoreEvents.current = false;
      return;
    }
    if (socket && socket.connected && videoRef.current) {
      console.log('📤 Emit Pause');
      socket.emit('party_pause');
    }
  };

  const onSeeked = () => {
    if (ignoreEvents.current) {
      ignoreEvents.current = false;
      return;
    }
    if (socket && socket.connected && videoRef.current) {
      console.log('📤 Emit Seek to', videoRef.current.currentTime);
      socket.emit('party_seek', { time: videoRef.current.currentTime });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !socket.connected) return;
    socket.emit('party_message', { messageText: messageInput });
    setMessageInput('');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/party/${roomId}?video=${videoId}`;
    navigator.clipboard.writeText(link);
    toast.success('Room invite link copied!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 flex justify-center text-white">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!video) return <div className="min-h-screen bg-[#0a0a0f] pt-32 text-center text-white">Video not found</div>;

  // Use relative /api path so Vite proxy forwards correctly to backend
  const streamUrl = `/api/videos/stream/${video._id}`;

  return (
    <div className="pt-24 px-6 md:px-12 pb-20 max-w-7xl mx-auto min-h-screen bg-[#0a0a0f] text-white flex flex-col lg:flex-row gap-8">
      {/* Left Column: Sync Player & Controls */}
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
              <span>Watch Party: {video.title}</span>
            </h1>
            <p className="text-gray-400 text-xs mt-1">Host room code: <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">{roomId}</span></p>
          </div>
        </div>

        {/* Sync HTML5 Video Player */}
        <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            onPlay={onPlay}
            onPause={onPause}
            onSeeked={onSeeked}
            className="w-full h-full"
            controlsList="nodownload"
          />
        </div>

        {/* Room info bar */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-xl flex items-center gap-3">
          <Users size={18} className="text-purple-400 shrink-0" />
          <span className="text-sm text-gray-300">Share the room code <span className="font-mono font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg mx-1">{roomId}</span> so friends can join!</span>
        </div>

        {/* Party Notifications log */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl max-h-36 overflow-y-auto">
          <h4 className="text-xs text-gray-500 font-bold uppercase mb-2">Room Activity Log</h4>
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No activity yet.</p>
          ) : (
            notifications.map((n, i) => (
              <p key={i} className="text-xs text-purple-300 leading-relaxed">
                [{new Date(n.timestamp).toLocaleTimeString()}] {n.text}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Party Chat */}
      <div className="w-full lg:w-96 bg-white/5 border border-white/10 rounded-3xl flex flex-col h-[550px] overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 bg-white/2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Party Chat</h3>
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>

        {/* Chat message feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, i) => {
            const isSelf = user && (user._id || user.id) === msg.userId;
            return (
              <div key={i} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-gray-400 font-semibold">{msg.username}</span>
                  <span className="text-[8px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                  isSelf 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-xs">
              Say hello to the party!
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
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

export default WatchParty;
