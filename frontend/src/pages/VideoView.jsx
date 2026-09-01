import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/video/VideoPlayer';
import api from '../api/axios';
import {
  ThumbsUp, ThumbsDown, Share2, Users, ListPlus,
  Bookmark, BookmarkCheck, Flag, X, AlertTriangle, Loader2,
  Copy, Check, LogIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/* ─── Report Modal ─────────────────────────────────── */
const REPORT_REASONS = [
  'Spam or misleading',
  'Hateful or abusive content',
  'Harmful or dangerous acts',
  'Child abuse',
  'Promotes terrorism',
  'Nudity or sexual content',
  'Copyright infringement',
  'Other',
];

const ReportModal = ({ onClose, onSubmit }) => {
  const [reason,  setReason]  = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { toast.error('Please select a reason'); return; }
    setSending(true);
    await onSubmit(reason, details);
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-yellow-400" />
            <h3 className="text-white font-bold text-lg">Report Video</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Reason *</label>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className={`text-sm transition-colors ${reason === r ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {r}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-300">Additional details (optional)</label>
            <textarea
              rows={2}
              placeholder="Describe the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !reason}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
              {sending ? 'Submitting…' : 'Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════ */
const VideoView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get('playlist');

  const [video,                setVideo]                = useState(null);
  const [recommendations,      setRecommendations]      = useState([]);
  const [comments,             setComments]             = useState([]);
  const [newComment,           setNewComment]           = useState('');
  const [playlists,            setPlaylists]            = useState([]);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [newPlaylistName,      setNewPlaylistName]      = useState('');
  const [loading,              setLoading]              = useState(true);
  const [savedToWL,            setSavedToWL]            = useState(false);
  const [wlLoading,            setWlLoading]            = useState(false);
  const [subscribeLoading,     setSubscribeLoading]     = useState(false);
  const [showReportModal,      setShowReportModal]      = useState(false);
  const [showPartyModal,       setShowPartyModal]       = useState(false);
  const [partyRoomId,          setPartyRoomId]          = useState('');
  const [joinRoomCode,         setJoinRoomCode]         = useState('');
  const [copiedLink,           setCopiedLink]           = useState(false);

  const watchStartRef = useRef(Date.now());

  /* Fetch video + recommendations */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      watchStartRef.current = Date.now();
      try {
        const [videoRes, recsRes] = await Promise.all([
          api.get(`/videos/${id}`),
          api.get('/videos', { params: { limit: 10 } }),
        ]);
        setVideo(videoRes.data.data);
        setRecommendations((recsRes.data.data || []).filter((v) => v._id !== id));

        // Log to recently viewed (fire-and-forget)
        if (user) {
          api.post(`/recent/${id}`).catch(() => {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  /* Fetch comments */
  useEffect(() => {
    api.get(`/comments/${id}`)
      .then(({ data }) => { if (data.success) setComments(data.data); })
      .catch(console.error);
  }, [id]);

  /* Fetch playlists */
  useEffect(() => {
    if (user) {
      api.get('/playlists')
        .then(({ data }) => { if (data.success) setPlaylists(data.data); })
        .catch(console.error);
    }
  }, [user]);

  /* Check Watch Later status */
  useEffect(() => {
    if (user && id) {
      api.get(`/watch-later/check/${id}`)
        .then(({ data }) => { if (data.success) setSavedToWL(data.saved); })
        .catch(() => {});
    }
  }, [user, id]);

  /* Analytics: track watch time on unmount */
  useEffect(() => {
    return () => {
      if (user && id) {
        const watchDuration = Math.floor((Date.now() - watchStartRef.current) / 1000);
        if (watchDuration > 3) {
          const ua = navigator.userAgent.toLowerCase();
          const device = /mobile|android|iphone/.test(ua) ? 'mobile'
            : /tablet|ipad/.test(ua) ? 'tablet' : 'desktop';
          api.post('/analytics', { videoId: id, watchDuration, device }).catch(() => {});
        }
      }
    };
  }, [user, id]);

  const handleLike = async () => {
    if (!user) { toast.error('Please login to like this video'); return; }
    try {
      const { data } = await api.post(`/videos/${video._id}/like`);
      if (data.success) setVideo((prev) => ({ ...prev, likes: data.likes, dislikes: data.dislikes }));
    } catch { toast.error('Failed to like video'); }
  };

  const handleDislike = async () => {
    if (!user) { toast.error('Please login to dislike this video'); return; }
    try {
      const { data } = await api.post(`/videos/${video._id}/dislike`);
      if (data.success) setVideo((prev) => ({ ...prev, likes: data.likes, dislikes: data.dislikes }));
    } catch { toast.error('Failed to dislike video'); }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error('Please login to subscribe'); return; }
    setSubscribeLoading(true);
    try {
      const { data } = await api.post(`/auth/subscribe/${video.creator._id}`);
      if (data.success) {
        toast.success(data.isSubscribed
          ? `Subscribed to ${video.creator.username}`
          : `Unsubscribed from ${video.creator.username}`);
        // Update subscriber count using server-returned value
        setVideo((prev) => ({
          ...prev,
          creator: {
            ...prev.creator,
            subscribers: Array(data.subscribersCount).fill(null),
          },
        }));
        await refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed');
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post(`/comments/${id}`, { message: newComment });
      if (data.success) {
        setComments((prev) => [data.data, ...prev]);
        setNewComment('');
        toast.success('Comment posted!');
      }
    } catch { toast.error('Failed to post comment'); }
  };

  const handlePlaylistToggle = async (playlistId, isInPlaylist) => {
    try {
      const { data } = await api.put(`/playlists/${playlistId}`, {
        videoId: video._id,
        action: isInPlaylist ? 'remove' : 'add',
      });
      if (data.success) {
        toast.success(isInPlaylist ? 'Removed from playlist' : 'Added to playlist');
        setPlaylists((prev) =>
          prev.map((p) =>
            p._id === playlistId
              ? {
                  ...p,
                  videos: isInPlaylist
                    ? p.videos.filter((vId) => vId.toString() !== video._id.toString())
                    : [...p.videos, video._id],
                }
              : p
          )
        );
      }
    } catch { toast.error('Failed to update playlist'); }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const { data } = await api.post('/playlists', { name: newPlaylistName, videoId: video._id });
      if (data.success) {
        toast.success('Playlist created and video added!');
        setPlaylists((prev) => [...prev, data.data]);
        setNewPlaylistName('');
      }
    } catch { toast.error('Failed to create playlist'); }
  };

  const handleWatchLater = async () => {
    if (!user) { toast.error('Please login to save videos'); return; }
    setWlLoading(true);
    try {
      if (savedToWL) {
        await api.delete(`/watch-later/${video._id}`);
        setSavedToWL(false);
        toast.success('Removed from Watch Later');
      } else {
        await api.post(`/watch-later/${video._id}`);
        setSavedToWL(true);
        toast.success('Saved to Watch Later');
      }
    } catch { toast.error('Failed to update Watch Later'); } 
    finally { setWlLoading(false); }
  };

  const handleCreateWatchParty = () => {
    const roomId = Math.random().toString(36).substring(2, 9);
    setPartyRoomId(roomId);
    setJoinRoomCode('');
    setCopiedLink(false);
    setShowPartyModal(true);
  };

  const handleStartParty = () => {
    if (!partyRoomId) return;
    setShowPartyModal(false);
    navigate(`/party/${partyRoomId}?video=${video._id}`);
  };

  const handleJoinParty = (e) => {
    e.preventDefault();
    const code = joinRoomCode.trim();
    if (!code) { toast.error('Please enter a room code'); return; }
    setShowPartyModal(false);
    navigate(`/party/${code}?video=${video._id}`);
  };

  const handleCopyPartyLink = () => {
    const link = `${window.location.origin}/party/${partyRoomId}?video=${video._id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const handleVideoEnded = async () => {
    if (!playlistId) return;
    try {
      const { data } = await api.get(`/playlists/${playlistId}`);
      if (data.success && data.data.videos) {
        const playlistVideos = data.data.videos;
        const currentIndex = playlistVideos.findIndex((v) => v._id === video._id);
        if (currentIndex !== -1 && currentIndex < playlistVideos.length - 1) {
          const nextVideo = playlistVideos[currentIndex + 1];
          toast.success(`Playing next: ${nextVideo.title}`, { duration: 3000 });
          navigate(`/watch/${nextVideo._id}?playlist=${playlistId}`);
        } else {
          toast('Playlist ended');
        }
      }
    } catch (err) { console.error('Autoplay next video failed', err); }
  };

  const handleReport = async (reason, details) => {
    try {
      const { data } = await api.post(`/videos/${video._id}/report`, { reason, details });
      if (data.success) {
        toast.success('Report submitted. Thank you for keeping PRISM safe.');
        setShowReportModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard!'));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!video) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 text-center text-white">Video not found</div>
  );

  const myId        = (user?._id || user?.id || '').toString();
  const hasLiked    = user && video.likes?.some(id => (id._id || id)?.toString() === myId);
  const hasDisliked = user && video.dislikes?.some(id => (id._id || id)?.toString() === myId);
  // Convert both sides to strings for reliable ObjectId comparison
  const isCreatorSelf = user && myId && video.creator._id?.toString() === myId;
  // Handle both populated objects { _id } and plain string IDs
  const isSubscribed = user && user.subscribedTo?.some((sub) => {
    const subId = (sub._id || sub)?.toString();
    return subId === video.creator._id?.toString();
  });

  return (
    <>
      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <ReportModal
            onClose={() => setShowReportModal(false)}
            onSubmit={handleReport}
          />
        )}
      </AnimatePresence>

      {/* Watch Party Modal */}
      <AnimatePresence>
        {showPartyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPartyModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                    <Users size={17} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">Watch Party</h3>
                    <p className="text-gray-500 text-xs">Watch together in sync</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPartyModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 mb-6" />

              <div className="mb-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Start a New Party</p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Your Room Code</span>
                    <span className="font-mono font-bold text-white text-lg tracking-[0.2em] bg-purple-600/15 border border-purple-500/30 px-3 py-1 rounded-xl select-all">
                      {partyRoomId}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">Share this code with friends so they can join your party.</p>
                  <button
                    onClick={handleStartParty}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-purple-600/20 active:scale-95"
                  >
                    <Users size={14} />
                    Start Party
                  </button>
                </div>
              </div>

              {/* Join section */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Join an Existing Party</p>
                <form onSubmit={handleJoinParty} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-gray-500 text-xs">Enter the room code shared by the host to join their party.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter room code..."
                      value={joinRoomCode}
                      onChange={(e) => setJoinRoomCode(e.target.value.trim().toLowerCase())}
                      maxLength={20}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
                    >
                      <LogIn size={14} />
                      Join
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-24 px-6 md:px-12 max-w-7xl mx-auto mb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <VideoPlayer videoId={video._id} mimeType={video.mimeType} onEnded={handleVideoEnded} />

          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-white">{video.title}</h1>

            <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-white/5 text-gray-300">
              {/* Creator info */}
              <div className="flex items-center gap-4">
                <Link to={`/channel/${video.creator._id}`} className="flex-shrink-0">
                  <img
                    src={video.creator.avatar}
                    alt={video.creator.username}
                    className="w-12 h-12 rounded-full border border-white/10 hover:border-purple-500/50 transition-all object-cover"
                  />
                </Link>
                <div>
                  <Link to={`/channel/${video.creator._id}`} className="text-white font-semibold hover:text-purple-400 transition-colors">
                    {video.creator.username}
                  </Link>
                  <p className="text-gray-500 text-sm">
                    {video.creator.subscribers ? video.creator.subscribers.length : 0} subscribers
                  </p>
                </div>
                {!isCreatorSelf && (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribeLoading}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ml-4 border flex items-center gap-2 disabled:opacity-70 ${
                      isSubscribed
                        ? 'bg-transparent border-white/20 text-gray-300 hover:bg-white/5 hover:border-white/40 hover:text-white'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    {subscribeLoading && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Like / Dislike */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-l-full transition-colors border-r border-white/10 ${hasLiked ? 'text-purple-400' : 'text-gray-400'}`}
                  >
                    <ThumbsUp size={20} fill={hasLiked ? 'currentColor' : 'none'} />
                    <span>{video.likes?.length || 0}</span>
                  </button>
                  <button
                    onClick={handleDislike}
                    className={`px-4 py-2 hover:bg-white/5 rounded-r-full transition-colors ${hasDisliked ? 'text-purple-400' : 'text-gray-400'}`}
                  >
                    <ThumbsDown size={20} fill={hasDisliked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Watch Party */}
                {user && (
                  <button
                    onClick={handleCreateWatchParty}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 rounded-full font-bold text-xs transition-all shadow-lg shadow-purple-600/20 active:scale-95 text-white"
                  >
                    <Users size={16} />
                    <span>Start Party</span>
                  </button>
                )}

                {/* Watch Later */}
                {user && (
                  <button
                    onClick={handleWatchLater}
                    disabled={wlLoading}
                    title={savedToWL ? 'Remove from Watch Later' : 'Save to Watch Later'}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs transition-all border disabled:opacity-50 ${
                      savedToWL
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300'
                    }`}
                  >
                    {wlLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : savedToWL ? (
                      <BookmarkCheck size={16} />
                    ) : (
                      <Bookmark size={16} />
                    )}
                    <span className="hidden sm:inline">{savedToWL ? 'Saved' : 'Watch Later'}</span>
                  </button>
                )}

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 hover:text-white transition-colors"
                >
                  <Share2 size={18} />
                  <span className="text-sm font-semibold hidden sm:inline">Share</span>
                </button>

                {/* Save to playlist */}
                {user && (
                  <div className="relative">
                    <button
                      onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 hover:border-purple-500/60 rounded-full text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      <ListPlus size={18} />
                      <span className="text-sm font-semibold hidden sm:inline">Add to Playlist</span>
                    </button>
                    {showPlaylistDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-50">
                        <h4 className="text-white font-bold text-sm mb-3">Save video to...</h4>
                        <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                          {playlists.map((p) => {
                            const isInPlaylist = p.videos.some((vid) => (vid._id || vid).toString() === video._id.toString());
                            return (
                              <label key={p._id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
                                <input
                                  type="checkbox"
                                  checked={isInPlaylist}
                                  onChange={() => handlePlaylistToggle(p._id, isInPlaylist)}
                                  className="rounded bg-black border-white/10 text-purple-600 focus:ring-0"
                                />
                                <span>{p.name}</span>
                              </label>
                            );
                          })}
                          {playlists.length === 0 && (
                            <p className="text-gray-500 text-xs">No playlists found.</p>
                          )}
                        </div>
                        <form onSubmit={handleCreatePlaylist} className="border-t border-white/5 pt-3">
                          <input
                            type="text"
                            placeholder="Create new playlist..."
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 mb-2"
                          />
                          <button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 rounded-lg text-[10px] transition-all"
                          >
                            Create
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* Report */}
                {user && !isCreatorSelf && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition-all"
                    title="Report video"
                  >
                    <Flag size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex gap-4 text-sm font-semibold text-white mb-2">
                <span>{video.views.toLocaleString()} views</span>
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                {video.category && (
                  <span className="text-purple-400">#{video.category}</span>
                )}
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{video.description}</p>
              {video.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {video.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-purple-600/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-lg font-bold text-white">Comments ({comments.length})</h3>
              {user ? (
                <form onSubmit={handleCommentSubmit} className="flex gap-3">
                  <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a public comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all active:scale-95"
                    >
                      Comment
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-gray-500 text-sm">
                  Please <Link to="/login" className="text-purple-400 font-semibold hover:underline">login</Link> to comment.
                </p>
              )}

              <div className="space-y-4 divide-y divide-white/5 pt-2">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No comments yet. Start the conversation!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment._id} className="flex gap-3 pt-4 first:pt-0">
                      <img src={comment.userId.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-white/10 object-cover flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm">{comment.userId.username}</span>
                          <span className="text-[10px] text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{comment.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Recommendations */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-4">Up Next</h3>
          {recommendations.length === 0 ? (
            <p className="text-gray-500 text-sm">No recommended videos yet</p>
          ) : (
            recommendations.slice(0, 10).map((rec) => (
              <Link key={rec._id} to={`/watch/${rec._id}`} className="flex gap-3 group cursor-pointer">
                <div className="w-40 aspect-video bg-white/5 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 relative">
                  <img
                    src={rec.thumbnailUrl}
                    alt={rec.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = 'https://placehold.co/320x180/111118/9333ea?text=Video'; }}
                  />
                  <div className="absolute bottom-1 right-1 px-1 bg-black/80 rounded text-[9px] font-bold text-white uppercase">
                    {rec.duration}
                  </div>
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-purple-400 transition-colors">
                    {rec.title}
                  </h4>
                  <p className="text-gray-500 text-xs truncate">{rec.creator.username}</p>
                  <p className="text-gray-500 text-xs">
                    {rec.views} views · {new Date(rec.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default VideoView;
