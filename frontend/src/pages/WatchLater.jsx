import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Trash2, Play, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const WatchLater = () => {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWatchLater();
  }, []);

  const fetchWatchLater = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/watch-later');
      if (data.success) setItems(data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Watch Later list');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (videoId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api.delete(`/watch-later/${videoId}`);
      setItems((prev) => prev.filter((item) => item.video._id !== videoId));
      toast.success('Removed from Watch Later');
    } catch (err) {
      toast.error('Failed to remove video');
    }
  };

  return (
    <div className="pt-24 px-6 md:px-12 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
          <Bookmark size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Watch Later</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {items.length} video{items.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="aspect-video bg-white/5 rounded-2xl" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-white/[0.03] rounded-3xl border border-white/10"
        >
          <div className="w-20 h-20 rounded-full bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Bookmark size={36} className="text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No saved videos yet</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
            Save videos to watch them later. Click the bookmark icon on any video.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-600/30"
          >
            <Play size={18} />
            Browse Videos
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {items.map((item, index) => {
              const video = item.video;
              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.04 }}
                  className="group relative"
                >
                  <Link to={`/watch/${video._id}`} className="block space-y-3">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/640x360/111118/9333ea?text=${encodeURIComponent(video.title?.slice(0, 20) || 'Video')}`;
                        }}
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                          <Play size={24} className="text-white ml-1" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      {video.duration && video.duration !== '0:00' && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {video.duration}
                        </span>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={(e) => handleRemove(video._id, e)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-red-500/80 backdrop-blur-sm border border-white/10 hover:border-red-500/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                        title="Remove from Watch Later"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>

                    {/* Video info */}
                    <div className="flex gap-3 px-1">
                      <img
                        src={video.creator?.avatar}
                        alt={video.creator?.username}
                        className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0 object-cover"
                      />
                      <div className="overflow-hidden">
                        <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2 group-hover:text-purple-400 transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-gray-500 text-xs mt-1 truncate">{video.creator?.username}</p>
                        <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
                          <span>{video.views?.toLocaleString()} views</span>
                          <span>·</span>
                          <Clock size={10} />
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default WatchLater;
