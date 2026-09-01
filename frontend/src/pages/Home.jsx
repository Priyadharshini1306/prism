import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import VideoCard from '../components/video/VideoCard';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Flame, ChevronRight } from 'lucide-react';

/* Skeleton card */
const SkeletonCard = () => (
  <div className="space-y-4 animate-pulse">
    <div className="aspect-video bg-white/5 rounded-2xl" />
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  </div>
);

/* Small trending card */
const TrendingCard = ({ video, rank }) => (
  <Link
    to={`/watch/${video._id}`}
    className="group flex gap-3 p-2.5 rounded-2xl hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all"
  >
    <div className="relative w-28 aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-white/5">
      <img
        src={video.thumbnailUrl}
        alt={video.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
        onError={(e) => {
          e.target.src = `https://placehold.co/200x112/111118/9333ea?text=${rank}`;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <span className="absolute bottom-1 left-1.5 text-white font-black text-lg leading-none drop-shadow-lg">
        {rank}
      </span>
    </div>
    <div className="min-w-0 py-0.5">
      <h4 className="text-white text-xs font-semibold line-clamp-2 group-hover:text-purple-400 transition-colors leading-snug">
        {video.title}
      </h4>
      <p className="text-gray-500 text-[10px] mt-1 truncate">{video.creator?.username}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <Flame size={9} className="text-orange-400" />
        <span className="text-orange-300/80 text-[10px] font-semibold">
          {video.views?.toLocaleString()} views
        </span>
      </div>
    </div>
  </Link>
);

/* ════════════════════════════════════════════════════════════ */
const Home = () => {
  const [videos,        setVideos]        = useState([]);
  const [trending,      setTrending]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [trendLoading,  setTrendLoading]  = useState(true);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [searchParams,  setSearchParams]  = useSearchParams();

  const searchVal       = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || 'All';

  /* Fetch trending once on mount */
  useEffect(() => {
    const fetchTrending = async () => {
      setTrendLoading(true);
      try {
        const { data } = await api.get('/videos/trending', { params: { limit: 5 } });
        if (data.success) setTrending(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrending();
  }, []);

  /* Fetch main grid — reset on filter/search change */
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setPage(1);
      try {
        const { data } = await api.get('/videos', {
          params: { search: searchVal, category: currentCategory, page: 1, limit: 20 },
        });
        setVideos(data.data || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [searchVal, currentCategory]);

  /* Load more */
  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { data } = await api.get('/videos', {
        params: { search: searchVal, category: currentCategory, page: nextPage, limit: 20 },
      });
      setVideos((prev) => [...prev, ...(data.data || [])]);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const categories = ['All', 'Entertainment', 'Gaming', 'Education', 'Music', 'Tech', 'Vlogs'];

  const handleCategoryClick = (cat) => {
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'All') newParams.delete('category');
    else newParams.set('category', cat);
    setSearchParams(newParams);
  };

  const showTrending = !searchVal && currentCategory === 'All' && trending.length > 0;

  return (
    <div className="pt-24 px-6 md:px-12 pb-20">
      {/* Trending section */}
      <AnimatePresence>
        {showTrending && (
          <motion.section
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
                  <TrendingUp size={16} className="text-orange-400" />
                </div>
                <h2 className="text-white font-bold text-xl">Trending Now</h2>
                <span className="text-[10px] bg-orange-500/15 text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold ml-1">
                  HOT
                </span>
              </div>
              <Link
                to="/?category=All"
                className="text-xs text-gray-400 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>

            {trendLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {trending.map((video, i) => (
                  <TrendingCard key={video._id} video={video} rank={i + 1} />
                ))}
              </div>
            )}

            <div className="mt-8 border-t border-white/5" />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Category Pills */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide mb-8">
        {categories.map((cat) => {
          const isActive = currentCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Video grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {videos.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
              <h2 className="text-xl text-white font-semibold">No videos found</h2>
              <p className="text-gray-400 mt-2">Be the first to upload one!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                <AnimatePresence>
                  {videos.map((video, i) => (
                    <motion.div
                      key={video._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    >
                      <VideoCard video={video} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Load more button */}
              {page < totalPages && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-full transition-all disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Loading…
                      </>
                    ) : (
                      `Load more videos`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Home;