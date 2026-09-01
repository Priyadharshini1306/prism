import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Play, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const RecentlyViewed = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/recent');
      if (data.success) setItems(data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOne = async (videoId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api.delete(`/recent/${videoId}`);
      setItems((prev) => prev.filter((item) => item.video._id !== videoId));
      toast.success('Removed from history');
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await api.delete('/recent');
      setItems([]);
      toast.success('History cleared');
    } catch (err) {
      toast.error('Failed to clear history');
    } finally {
      setClearing(false);
    }
  };

  // Group by date
  const grouped = items.reduce((acc, item) => {
    const dateKey = new Date(item.watchedAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  return (
    <div className="pt-24 px-6 md:px-12 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <History size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Watch History</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {items.length} video{items.length !== 1 ? 's' : ''} watched
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all"
          >
            <Trash2 size={15} />
            {clearing ? 'Clearing…' : 'Clear All'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-8">
          {[...Array(2)].map((_, g) => (
            <div key={g} className="space-y-4">
              <div className="h-4 bg-white/5 rounded w-40 animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-40 aspect-video bg-white/5 rounded-xl flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-white/[0.03] rounded-3xl border border-white/10"
        >
          <div className="w-20 h-20 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <History size={36} className="text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No watch history</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
            Videos you watch will appear here so you can easily pick up where you left off.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-600/30"
          >
            <Play size={18} />
            Start Watching
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([date, videos], gIdx) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gIdx * 0.06 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Clock size={14} className="text-purple-400" />
                <span className="text-gray-400 text-sm font-semibold">{date}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {videos.map((item) => {
                    const video = item.video;
                    return (
                      <motion.div
                        key={item._id}
                        layout
                        exit={{ opacity: 0, x: -20 }}
                        className="group flex gap-4 p-3 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition-all cursor-pointer"
                      >
                        <Link to={`/watch/${video._id}`} className="flex gap-4 flex-1 min-w-0">
                          {/* Thumbnail */}
                          <div className="relative w-40 aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/5">
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                              onError={(e) => {
                                e.target.src = `https://placehold.co/320x180/111118/9333ea?text=Video`;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play size={20} className="text-white ml-1" />
                            </div>
                            {video.duration && video.duration !== '0:00' && (
                              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                                {video.duration}
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 py-1">
                            <h3 className="text-white text-sm font-semibold line-clamp-2 group-hover:text-purple-400 transition-colors">
                              {video.title}
                            </h3>
                            <p className="text-gray-500 text-xs mt-1">{video.creator?.username}</p>
                            <p className="text-gray-600 text-xs mt-1">
                              {video.views?.toLocaleString()} views
                            </p>
                          </div>
                        </Link>

                        {/* Remove from history */}
                        <button
                          onClick={(e) => handleRemoveOne(video._id, e)}
                          className="self-start mt-1 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          title="Remove from history"
                        >
                          <X size={15} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;
