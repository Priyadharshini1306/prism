import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  Users, 
  Eye, 
  Clock, 
  Video, 
  Trash2, 
  Play, 
  Plus, 
  AlertCircle, 
  Loader2,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteVideoId, setDeleteVideoId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editVideo, setEditVideo] = useState(null); // { _id, title, description, category }
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/videos/creator/stats');
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      toast.error('Failed to load stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteVideoId) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/videos/${deleteVideoId}`);
      if (data.success) {
        toast.success('Video deleted successfully');
        setDeleteVideoId(null);
        fetchStats(); // reload stats
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete video');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editVideo) return;
    setEditSaving(true);
    try {
      const { data } = await api.patch(`/videos/${editVideo._id}`, {
        title: editVideo.title,
        description: editVideo.description,
        category: editVideo.category,
      });
      if (data.success) {
        toast.success('Video updated successfully');
        setEditVideo(null);
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update video');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 flex justify-center text-white">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-32 text-center text-white">
        <p className="text-gray-400">Failed to load statistics.</p>
      </div>
    );
  }

  // Chart Data preparation
  const chartLabels = stats.videoStats.map(v => v.title.length > 15 ? v.title.slice(0, 15) + '...' : v.title);
  const chartViews = stats.videoStats.map(v => v.views);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Views per Video',
        data: chartViews,
        backgroundColor: 'rgba(124, 58, 237, 0.7)', // Purple neon theme
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const chartDataConfig = chartData;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Video Views Performance',
        color: '#f8fafc',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  };

  return (
    <div className="pt-24 px-6 md:px-12 pb-20 max-w-7xl mx-auto min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Creator Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage your channel performance and upload new content</p>
        </div>
        <Link 
          to="/upload" 
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-purple-600/25 active:scale-95"
        >
          <Plus size={20} />
          <span>Upload Video</span>
        </Link>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Card 1: Subscribers */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center gap-4">
          <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase">Subscribers</p>
            <h3 className="text-2xl font-bold mt-1">{stats.subscribersCount}</h3>
          </div>
        </div>

        {/* Card 2: Total Views */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center gap-4">
          <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase">Total Views</p>
            <h3 className="text-2xl font-bold mt-1">{stats.totalViews.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 3: Watch Time */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center gap-4">
          <div className="p-4 bg-pink-500/20 rounded-2xl text-pink-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase">Avg Watch Time</p>
            <h3 className="text-2xl font-bold mt-1">
              {stats.avgWatchTime ? `${Math.floor(stats.avgWatchTime / 60)}m ${stats.avgWatchTime % 60}s` : '0s'}
            </h3>
          </div>
        </div>

        {/* Card 4: Video Count */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center gap-4">
          <div className="p-4 bg-cyan-500/20 rounded-2xl text-cyan-400">
            <Video size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase">Videos Published</p>
            <h3 className="text-2xl font-bold mt-1">{stats.totalVideos}</h3>
          </div>
        </div>
      </div>

      {/* Analytics Charts Block */}
      {stats.videoStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Views Bar Chart */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
            <div className="h-[320px] flex items-center justify-center">
              <Bar data={chartDataConfig} options={chartOptions} />
            </div>
          </div>
          
          {/* Device Pie Chart */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between">
            <div className="h-[320px] flex items-center justify-center">
              <Pie 
                data={{
                  labels: ['Desktop', 'Mobile', 'Tablet'],
                  datasets: [
                    {
                      data: [
                        stats.deviceStats?.desktop || 0,
                        stats.deviceStats?.mobile || 0,
                        stats.deviceStats?.tablet || 0
                      ],
                      backgroundColor: [
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(6, 182, 212, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                      ],
                      borderColor: [
                        'rgba(124, 58, 237, 1)',
                        'rgba(6, 182, 212, 1)',
                        'rgba(245, 158, 11, 1)',
                      ],
                      borderWidth: 1,
                    }
                  ]
                }} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#94a3b8' }
                    },
                    title: {
                      display: true,
                      text: 'Playback Device Distribution',
                      color: '#f8fafc',
                      font: { size: 16, weight: 'bold' }
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Videos List Management */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Your Published Videos</h2>
        </div>

        {stats.videoStats.length === 0 ? (
          <div className="text-center py-20 px-6">
            <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white">No videos published yet</h3>
            <p className="text-gray-400 mt-2 max-w-sm mx-auto">Click "Upload Video" above to publish your first content to PRISM!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase font-bold bg-white/2 font-mono">
                  <th className="py-4 px-6">Video Details</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Views</th>
                  <th className="py-4 px-6">Likes / Dislikes</th>
                  <th className="py-4 px-6">Published</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.videoStats.map((v) => (
                  <tr key={v._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6">
                      <Link to={`/watch/${v._id}`} className="flex items-center gap-3 group">
                        <div className="w-16 h-10 bg-gradient-to-br from-purple-900/50 to-black rounded-lg overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-purple-600/40 border border-purple-500/30 flex items-center justify-center">
                              <Play size={10} fill="white" className="text-white ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={14} fill="white" className="text-white" />
                          </div>
                        </div>
                        <span className="font-semibold text-sm group-hover:text-purple-400 transition-colors truncate max-w-[200px]">
                          {v.title}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-gray-300">
                        {v.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-sm font-semibold">{v.views.toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      <span className="text-green-400 font-semibold">{v.likes} 👍</span>
                      <span className="mx-2 text-gray-600">|</span>
                      <span className="text-red-400 font-semibold">{v.dislikes} 👎</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditVideo({ _id: v._id, title: v.title, description: v.description || '', category: v.category })}
                          className="p-2.5 bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 rounded-xl transition-all border border-white/10 hover:border-purple-500/30 active:scale-95 inline-flex items-center justify-center"
                          title="Edit video"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => setDeleteVideoId(v._id)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20 active:scale-95 inline-flex items-center justify-center"
                          title="Delete video"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteVideoId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl max-w-md w-full shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-red-500" />
              <span>Delete Video?</span>
            </h3>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              Are you sure you want to delete this video? This will permanently remove the video from PRISM and delete the media file from the server. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setDeleteVideoId(null)}
                disabled={deleting}
                className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                {deleting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {editVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Pencil size={20} className="text-purple-400" />
                Edit Video
              </h3>
              <button
                onClick={() => setEditVideo(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <X size={17} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={editVideo.title}
                  onChange={(e) => setEditVideo((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Description</label>
                <textarea
                  rows={3}
                  value={editVideo.description}
                  onChange={(e) => setEditVideo((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Category</label>
                <select
                  value={editVideo.category}
                  onChange={(e) => setEditVideo((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all"
                >
                  {['Entertainment', 'Gaming', 'Education', 'Music', 'Tech', 'Vlogs', 'Other'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditVideo(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-purple-600/20 disabled:opacity-60"
                >
                  {editSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
