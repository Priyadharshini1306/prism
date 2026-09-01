import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Camera, Radio, Send, Users, MicOff, Mic, VideoOff, Video,
  ArrowLeft, Loader2, Download, CheckCircle2, Film, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const LiveBroadcast = () => {
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  const [stream,          setStream]          = useState(null);
  const [broadcasting,    setBroadcasting]    = useState(false);
  const [chatMessages,    setChatMessages]    = useState([]);
  const [chatInput,       setChatInput]       = useState('');
  const [watchersCount,   setWatchersCount]   = useState(0);
  const [audioEnabled,    setAudioEnabled]    = useState(true);
  const [videoEnabled,    setVideoEnabled]    = useState(true);

  // VOD save state
  const [recordedBlob,    setRecordedBlob]    = useState(null);
  const [vodTitle,        setVodTitle]        = useState('');
  const [savingVod,       setSavingVod]       = useState(false);
  const [vodSaved,        setVodSaved]        = useState(false);
  const [showVodPanel,    setShowVodPanel]    = useState(false);

  const localVideoRef    = useRef(null);
  const peerConnections  = useRef(new Map()); // socketId → RTCPeerConnection
  const streamRef        = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks   = useRef([]);
  const chatEndRef       = useRef(null);

  // ── 1. Acquire Webcam/Microphone ──────────────────────────────────────────
  useEffect(() => {
    const acquireMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        setStream(mediaStream);
        streamRef.current = mediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to access webcam or microphone. Please check permissions.');
      }
    };
    acquireMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ── 2. Scroll chat ────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── 3. Signaling Sockets when broadcasting starts ─────────────────────────
  useEffect(() => {
    if (!socket || !broadcasting || !user) return;

    socket.emit('join_stream', {
      creatorId: user._id || user.id,
      role: 'broadcaster',
      username: user.username,
    });

    socket.on('watcher_joined', async ({ socketId, username }) => {
      setWatchersCount(prev => prev + 1);
      toast(`${username} is watching your stream!`, { icon: '👁️' });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(socketId, pc);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && socket.connected) {
          socket.emit('ice_candidate', { targetSocketId: socketId, candidate: e.candidate });
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socket.connected) {
          socket.emit('webrtc_offer', { targetSocketId: socketId, sdp: offer });
        }
      } catch (err) {
        console.error('Failed to create SDP offer', err);
      }
    });

    socket.on('webrtc_answer', async ({ watcherSocketId, sdp }) => {
      const pc = peerConnections.current.get(watcherSocketId);
      if (pc) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); }
        catch (err) { console.error('Failed to set remote description', err); }
      }
    });

    socket.on('ice_candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnections.current.get(senderSocketId);
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (err) { console.error('Failed to add ICE Candidate', err); }
      }
    });

    socket.on('watcher_left', ({ socketId }) => {
      const pc = peerConnections.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(socketId);
        setWatchersCount(prev => Math.max(0, prev - 1));
      }
    });

    socket.on('stream_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('watcher_joined');
      socket.off('webrtc_answer');
      socket.off('ice_candidate');
      socket.off('watcher_left');
      socket.off('stream_message');
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      setWatchersCount(0);
    };
  }, [socket, broadcasting, user]);

  // ── 4. MediaRecorder helpers ──────────────────────────────────────────────
  const startRecording = useCallback((mediaStream) => {
    if (!mediaStream) return;
    recordedChunks.current = [];

    // Pick best supported mime type
    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ].find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType || 'video/webm' });
        setRecordedBlob(blob);
        setShowVodPanel(true);
      };
      recorder.start(1000); // collect data every second
      mediaRecorderRef.current = recorder;
      console.log('[MediaRecorder] Recording started with', mimeType || 'default');
    } catch (err) {
      console.error('[MediaRecorder] Could not start recording:', err);
      toast.error('Recording not supported in this browser.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── 5. Broadcast controls ─────────────────────────────────────────────────
  const handleStartBroadcast = async () => {
    if (!stream) { toast.error('No camera feed available. Cannot broadcast.'); return; }
    setBroadcasting(true);
    startRecording(streamRef.current);
    toast.success('Live broadcast started!');

    // Notify subscribers in background (don't block the broadcast)
    try {
      await api.post('/live/notify');
    } catch (err) {
      console.warn('[Live] Failed to notify subscribers:', err.message);
    }
  };

  const handleStopBroadcast = () => {
    setBroadcasting(false);
    stopRecording();
    toast('Broadcast stopped. You can now save the recording as a video.', { icon: '🎬' });
    if (socket && socket.connected) {
      socket.emit('end_stream', { creatorId: user?._id || user?.id });
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setWatchersCount(0);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !socket.connected) return;
    socket.emit('stream_message', { messageText: chatInput });
    setChatInput('');
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // ── 6. Save recorded stream as VOD to Google Drive ────────────────────────
  const handleSaveVod = async (e) => {
    e.preventDefault();
    if (!recordedBlob) { toast.error('No recording available'); return; }
    if (!vodTitle.trim()) { toast.error('Please enter a title for the recording'); return; }

    setSavingVod(true);
    try {
      const ext = recordedBlob.type.includes('mp4') ? '.mp4' : '.webm';
      const filename = `${vodTitle.trim()}${ext}`;
      const file = new File([recordedBlob], filename, { type: recordedBlob.type });

      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', vodTitle.trim());
      formData.append('description', `Recorded live stream on ${new Date().toLocaleString()}`);
      formData.append('category', 'Live');
      formData.append('tags', 'live,stream,vod');

      await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Large file — no default timeout
        timeout: 0,
      });

      setVodSaved(true);
      toast.success('Live recording saved as a video! 🎬');
      setTimeout(() => {
        setShowVodPanel(false);
        setRecordedBlob(null);
        setVodSaved(false);
        setVodTitle('');
        navigate('/');
      }, 2500);
    } catch (err) {
      console.error('[SaveVOD]', err);
      toast.error(err.response?.data?.message || 'Failed to save recording');
    } finally {
      setSavingVod(false);
    }
  };

  const handleDiscardVod = () => {
    setRecordedBlob(null);
    setShowVodPanel(false);
    setVodTitle('');
    setVodSaved(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pt-24 px-6 md:px-12 pb-20 max-w-7xl mx-auto min-h-screen bg-[#0a0a0f] text-white flex flex-col lg:flex-row gap-8">
      {/* Left Column: Broadcast Preview */}
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
              <span>Go Live Studio</span>
            </h1>
            <p className="text-gray-400 text-xs mt-1">Broadcast your webcam feed in real-time</p>
          </div>
        </div>

        {/* Video feed container */}
        <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />

          {broadcasting && (
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Radio size={12} />
              <span>Live</span>
            </div>
          )}

          {broadcasting && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1.5">
              <Users size={14} className="text-purple-400" />
              <span>{watchersCount} watching</span>
            </div>
          )}

          {!stream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-gray-400 gap-3">
              <Loader2 className="animate-spin text-purple-500" size={32} />
              <p className="text-sm">Acquiring media device feeds...</p>
            </div>
          )}
        </div>

        {/* Control options bar */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-2xl border transition-all ${
                audioEnabled
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-2xl border transition-all ${
                videoEnabled
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!broadcasting ? (
              <button
                onClick={handleStartBroadcast}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-purple-600/25 active:scale-95 text-sm flex items-center gap-2"
              >
                <Radio size={16} />
                <span>Go Live</span>
              </button>
            ) : (
              <button
                onClick={handleStopBroadcast}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-red-600/25 active:scale-95 text-sm flex items-center gap-2"
              >
                <VideoOff size={16} />
                <span>Stop Stream</span>
              </button>
            )}
          </div>
        </div>

        {/* ── VOD Save Panel (shown after broadcast ends) ── */}
        {showVodPanel && recordedBlob && !vodSaved && (
          <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                  <Film size={18} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Save as Video</h3>
                  <p className="text-gray-400 text-xs">Upload your live recording to PRISM (stored in Google Drive)</p>
                </div>
              </div>
              <button
                onClick={handleDiscardVod}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bg-black/20 rounded-2xl px-4 py-2.5 text-xs text-gray-400 flex items-center gap-2">
              <Download size={13} className="text-purple-400" />
              <span>
                Recording size: <span className="text-white font-semibold">{(recordedBlob.size / 1024 / 1024).toFixed(1)} MB</span>
                {' '} · Format: <span className="text-white font-semibold">{recordedBlob.type.includes('mp4') ? 'MP4' : 'WebM'}</span>
              </span>
            </div>

            <form onSubmit={handleSaveVod} className="space-y-3">
              <input
                type="text"
                placeholder="Give your recording a title..."
                value={vodTitle}
                onChange={(e) => setVodTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingVod || !vodTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-purple-600/25"
                >
                  {savingVod
                    ? <><Loader2 size={16} className="animate-spin" /> Uploading to Drive…</>
                    : <><Download size={16} /> Save Recording</>
                  }
                </button>
                <button
                  type="button"
                  onClick={handleDiscardVod}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold rounded-xl transition-all text-sm"
                >
                  Discard
                </button>
              </div>
              {savingVod && (
                <p className="text-purple-400 text-xs text-center animate-pulse">
                  Uploading recording to Google Drive… this may take a moment.
                </p>
              )}
            </form>
          </div>
        )}

        {vodSaved && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <CheckCircle2 size={20} className="text-green-400" />
            <p className="text-green-300 text-sm font-semibold">Recording saved successfully! Redirecting to home…</p>
          </div>
        )}
      </div>

      {/* Right Column: Live Chat */}
      <div className="w-full lg:w-96 bg-white/5 border border-white/10 rounded-3xl flex flex-col h-[550px] overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Live Stream Chat</h3>
          <span className={`h-2 w-2 rounded-full ${broadcasting ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-purple-400 font-bold">{msg.username}</span>
                <span className="text-[8px] text-gray-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="p-3 bg-white/5 text-gray-200 border border-white/10 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[85%]">
                {msg.text}
              </div>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-xs">
              {broadcasting ? 'Chat is quiet. Wait for viewers!' : 'Start broadcasting to open chat.'}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChat} className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            disabled={!broadcasting}
            placeholder={broadcasting ? 'Type your message...' : 'Stream offline...'}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!broadcasting}
            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveBroadcast;
