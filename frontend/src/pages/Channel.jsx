import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import VideoCard from '../components/video/VideoCard';
import { Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Channel = () => {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannelData = async () => {
      setLoading(true);
      try {
        const userRes = await api.get(`/auth/user/${id}`);
        if (userRes.data.success) {
          setCreator(userRes.data.user);
        }

        const videosRes = await api.get('/videos', {
          params: { creator: id }
        });
        if (videosRes.data.success) {
          setVideos(videosRes.data.data);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load channel details');
      } finally {
        setLoading(false);
      }
    };
    fetchChannelData();
  }, [id]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }
    try {
      const { data } = await api.post(`/auth/subscribe/${id}`);
      if (data.success) {
        toast.success(data.isSubscribed ? `Subscribed to ${creator.username}` : `Unsubscribed from ${creator.username}`);
        
        setCreator(prev => ({
          ...prev,
          subscribers: data.isSubscribed
            ? [...prev.subscribers, user._id || user.id]
            : prev.subscribers.filter(subId => subId !== (user._id || user.id))
        }));

        await refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 flex justify-center text-white">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 text-center text-white">
        <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
        <p className="text-gray-400">Creator not found.</p>
      </div>
    );
  }

  const isCreatorSelf = user && (user._id || user.id) === creator._id;
  const isSubscribed = user && user.subscribedTo?.some(sub => (sub._id || sub) === creator._id);

  return (
    <div className="pt-24 px-6 md:px-12 pb-20 max-w-7xl mx-auto min-h-screen bg-[#0a0a0f] text-white">
      {/* Banner / Header details */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/30 border border-white/10 rounded-3xl p-8 md:p-12 mb-10 backdrop-blur-xl flex flex-col md:flex-row items-center gap-8 justify-between">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img 
            src={creator.avatar} 
            alt={creator.username} 
            className="w-24 h-24 rounded-full border-4 border-purple-500/30 object-cover shadow-2xl" 
          />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              {creator.username}
            </h1>
            <p className="text-purple-400 text-sm font-semibold capitalize mt-1">{creator.role}</p>
            <div className="flex items-center gap-4 text-gray-400 text-sm mt-3 justify-center md:justify-start">
              <span>{creator.subscribers ? creator.subscribers.length : 0} subscribers</span>
              <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
              <span>{videos.length} videos</span>
            </div>
          </div>
        </div>

        <div>
          {!isCreatorSelf && (
            <button 
              onClick={handleSubscribe}
              className={`px-8 py-3.5 rounded-2xl font-bold transition-all border ${
                isSubscribed 
                  ? 'bg-transparent border-white/20 text-gray-300 hover:bg-white/5 hover:border-white/40 hover:text-white' 
                  : 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      {/* Videos Section */}
      <div className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white tracking-tight border-b-2 border-purple-500 w-fit pb-4 -mb-[18px]">
            Videos
          </h2>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <h3 className="text-lg font-semibold text-white">No videos uploaded yet</h3>
            <p className="text-gray-400 mt-1">This creator hasn't published any content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Channel;
