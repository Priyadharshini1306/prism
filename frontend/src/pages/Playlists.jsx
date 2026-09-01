import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { FolderHeart, Play, Trash2, ArrowLeft, Loader2, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const Playlists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/playlists');
      if (data.success) {
        setPlaylists(data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/playlists', { name: newPlaylistName });
      if (data.success) {
        toast.success('Playlist created successfully!');
        setPlaylists((prev) => [data.data, ...prev]);
        setNewPlaylistName('');
      }
    } catch (err) {
      toast.error('Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId, e) => {
    e.stopPropagation(); // prevent opening detailed view
    try {
      const { data } = await api.delete(`/playlists/${playlistId}`);
      if (data.success) {
        toast.success('Playlist deleted');
        setPlaylists((prev) => prev.filter(p => p._id !== playlistId));
        if (selectedPlaylist?._id === playlistId) {
          setSelectedPlaylist(null);
        }
      }
    } catch (err) {
      toast.error('Failed to delete playlist');
    }
  };

  const handleRemoveVideo = async (playlistId, videoId, e) => {
    e.stopPropagation();
    try {
      const { data } = await api.put(`/playlists/${playlistId}`, {
        videoId,
        action: 'remove'
      });
      if (data.success) {
        toast.success('Video removed from playlist');
        // Update local state
        setPlaylists((prev) => prev.map(p => p._id === playlistId ? {
          ...p,
          videos: p.videos.filter(v => (v._id || v) !== videoId)
        } : p));
        
        if (selectedPlaylist?._id === playlistId) {
          setSelectedPlaylist(prev => ({
            ...prev,
            videos: prev.videos.filter(v => v._id !== videoId)
          }));
        }
      }
    } catch (err) {
      toast.error('Failed to remove video');
    }
  };

  const handleOpenPlaylistDetails = async (playlistId) => {
    try {
      const { data } = await api.get(`/playlists/${playlistId}`);
      if (data.success) {
        setSelectedPlaylist(data.data);
      }
    } catch (err) {
      toast.error('Failed to load playlist details');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 flex justify-center text-white">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="pt-24 px-6 md:px-12 pb-20 max-w-7xl mx-auto min-h-screen bg-[#0a0a0f] text-white flex flex-col lg:flex-row gap-8">
      {/* Left / Main Section: List Playlists */}
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Your Playlists
            </h1>
            <p className="text-gray-400 text-xs mt-1">Organize your favorite stream videos</p>
          </div>
        </div>

        {/* Create playlist box */}
        <form onSubmit={handleCreatePlaylist} className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl flex gap-3 max-w-xl">
          <input
            type="text"
            required
            placeholder="Playlist name (e.g. Learning Java)..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
          />
          <button 
            type="submit"
            disabled={creating}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-xs flex items-center gap-1 active:scale-95"
          >
            <Plus size={16} />
            <span>Create</span>
          </button>
        </form>

        {/* Playlists grid */}
        {playlists.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <FolderHeart className="mx-auto text-gray-500 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white">No playlists found</h3>
            <p className="text-gray-400 mt-2 text-xs">Create a playlist above or save videos to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <div 
                key={playlist._id}
                onClick={() => handleOpenPlaylistDetails(playlist._id)}
                className={`bg-white/5 border p-5 rounded-3xl backdrop-blur-xl hover:border-purple-500/50 cursor-pointer transition-all flex justify-between items-start gap-4 ${
                  selectedPlaylist?._id === playlist._id ? 'border-purple-500' : 'border-white/10'
                }`}
              >
                <div className="space-y-2 overflow-hidden">
                  <h3 className="text-white font-bold truncate text-sm">{playlist.name}</h3>
                  <p className="text-purple-400 text-xs font-semibold">{playlist.videos?.length || 0} videos</p>
                  <p className="text-gray-500 text-[10px]">{new Date(playlist.createdAt).toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={(e) => handleDeletePlaylist(playlist._id, e)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl transition-all"
                  title="Delete playlist"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Section: Playlist Details / Selected Playlist */}
      <div className="w-full lg:w-96 bg-white/5 border border-white/10 rounded-3xl flex flex-col h-[550px] overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 bg-white/2">
          <h3 className="text-sm font-bold text-white">Playlist Details</h3>
        </div>

        {selectedPlaylist ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-white/2 border-b border-white/5">
              <h4 className="font-bold text-white text-sm">{selectedPlaylist.name}</h4>
              <p className="text-xs text-gray-500 mt-1">{selectedPlaylist.videos.length} videos inside</p>
            </div>

            {/* Videos List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedPlaylist.videos.length === 0 ? (
                <p className="text-center py-20 text-gray-500 text-xs">No videos in this playlist yet</p>
              ) : (
                selectedPlaylist.videos.map((vid, idx) => (
                  <div 
                    key={vid._id}
                    onClick={() => {
                      navigate(`/watch/${vid._id}?playlist=${selectedPlaylist._id}`);
                    }}
                    className="flex gap-2 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group justify-between items-center"
                  >
                    <div className="flex gap-2 items-center overflow-hidden">
                      <span className="text-[10px] text-gray-500 font-mono w-4">{idx + 1}</span>
                      <div className="overflow-hidden">
                        <p className="text-white font-medium text-xs truncate group-hover:text-purple-400 transition-colors">
                          {vid.title}
                        </p>
                        <p className="text-gray-500 text-[10px] truncate">{vid.creator?.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button 
                        onClick={(e) => handleRemoveVideo(selectedPlaylist._id, vid._id, e)}
                        className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove from playlist"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedPlaylist.videos.length > 0 && (
              <div className="p-4 border-t border-white/5 bg-white/2">
                <Link 
                  to={`/watch/${selectedPlaylist.videos[0]._id}?playlist=${selectedPlaylist._id}`}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-purple-600/25"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Play Sequence</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 text-xs">
            <AlertCircle className="mb-2 text-gray-600" size={32} />
            <span>Select a playlist to view details and start watching.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlists;
