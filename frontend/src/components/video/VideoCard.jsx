import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

const FallbackThumbnail = ({ title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/60 via-black to-blue-900/40">
    {/* PRISM Logo Mark */}
    <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center mb-3">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <polygon points="12,2 22,20 2,20" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" fill="rgba(168,85,247,0.15)" />
        <line x1="12" y1="8" x2="12" y2="16" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="14" x2="16" y2="14" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
    <span className="text-purple-400/80 text-xs font-semibold tracking-widest uppercase">PRISM</span>
  </div>
);

const VideoCard = ({ video }) => {
  const [imgError, setImgError] = useState(false);

  // Detect if thumbnailUrl is the ugly placehold.co placeholder or empty
  const isPlaceholder =
    !video.thumbnailUrl ||
    video.thumbnailUrl.includes('placehold.co') ||
    video.thumbnailUrl.includes('placeholder');

  const showFallback = isPlaceholder || imgError;

  // Format duration: if undefined/null/0 show nothing; else show as-is
  const durationLabel = video.duration && video.duration !== '0:00' ? video.duration : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="group cursor-pointer"
    >
      <Link to={`/watch/${video._id}`}>
        {/* Thumbnail Container */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/30 to-black border border-white/10 group-hover:border-purple-500/50 transition-all">
          {showFallback ? (
            <FallbackThumbnail title={video.title} />
          ) : (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 bg-purple-600/80 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-600/40">
              <Play fill="white" size={20} className="ml-1" />
            </div>
          </div>

          {/* Duration badge — only if we have a real duration */}
          {durationLabel && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[10px] font-bold text-white">
              {durationLabel}
            </div>
          )}
        </div>

        {/* Info Row */}
        <div className="mt-3 flex gap-3">
          {video.creator?.avatar ? (
            <img
              src={video.creator.avatar}
              alt={video.creator.username}
              className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple-700/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-300 text-xs font-bold">
                {video.creator?.username?.[0]?.toUpperCase() || 'P'}
              </span>
            </div>
          )}
          <div className="overflow-hidden">
            <h3 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-purple-400 transition-colors leading-snug">
              {video.title}
            </h3>
            <p className="text-gray-500 text-xs mt-1">{video.creator?.username}</p>
            <div className="flex items-center gap-2 text-gray-600 text-xs mt-0.5">
              <span>{(video.views || 0).toLocaleString()} views</span>
              <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default VideoCard;
