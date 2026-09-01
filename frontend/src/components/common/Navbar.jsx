import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Upload, User, LogOut, Bell, Radio, FolderHeart, ChevronDown, LayoutDashboard, Bookmark, History, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import PrismLogo from './PrismLogo';

const Navbar = () => {
  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchVal, setSearchVal] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const debounceTimer = useRef(null);

  // Is the current user a creator or admin?
  const isCreator = user?.role === 'creator' || user?.role === 'admin';

  useEffect(() => {
    setSearchVal(searchParams.get('search') || '');
  }, [searchParams]);

  // Debounced search — fires 300ms after the user stops typing
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchVal(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (val.trim()) navigate(`/?search=${encodeURIComponent(val.trim())}`);
      else navigate('/');
    }, 300);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const { data } = await api.get('/notifications');
          if (data.success) setNotifications(data.data);
        } catch (err) {
          console.error('Failed to fetch notifications', err);
        }
      };
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      };
      socket.on('new_notification', handleNewNotification);
      return () => socket.off('new_notification', handleNewNotification);
    }
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setShowProfileDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowProfileDropdown(false);
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/?search=${encodeURIComponent(searchVal.trim())}`);
    else navigate('/');
  };

  const handleMarkAllRead = async () => {
    try {
      const { data } = await api.put('/notifications/read-all');
      if (data.success)
        setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const { data } = await api.put(`/notifications/${id}/read`);
      if (data.success)
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, status: 'read' } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">

        {/* ── Logo ── */}
        <Link to="/" className="flex-shrink-0">
          <PrismLogo size={38} showText textSize="text-xl" />
        </Link>

        {/* ── Search ── */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
          <input
            type="text"
            placeholder="Search videos, creators, or livestreams..."
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm"
          />
        </form>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 md:gap-4">
          {user ? (
            <>
              {/* Upload — creators only */}
              {isCreator && (
                <Link
                  to="/upload"
                  title="Upload Video"
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                >
                  <Upload size={21} />
                </Link>
              )}

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setShowNotifDropdown((v) => !v); setShowProfileDropdown(false); }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full relative"
                >
                  <Bell size={21} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-purple-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-[#0a0a0a]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-50"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
                        <h3 className="text-white font-bold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-purple-400 text-xs hover:text-purple-300 font-semibold transition-colors">
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-gray-500 text-xs text-center py-6">No notifications yet</p>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => handleMarkRead(notif._id)}
                              className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                                notif.status === 'unread'
                                  ? 'bg-purple-600/10 border-purple-500/20 hover:bg-purple-600/20'
                                  : 'bg-transparent border-white/5 hover:bg-white/5 text-gray-400'
                              }`}
                            >
                              <p className="font-medium text-gray-200 leading-snug">{notif.message}</p>
                              <span className="text-[9px] text-gray-500 mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setShowProfileDropdown((v) => !v); setShowNotifDropdown(false); }}
                  className="flex items-center gap-2 p-1 pr-2 rounded-full border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-700/40 flex items-center justify-center text-purple-300 text-sm font-bold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <ChevronDown
                    size={13}
                    className={`text-gray-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-58 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 min-w-[210px]"
                    >
                      {/* User info header */}
                      <div className="px-3 py-2.5 border-b border-white/5 mb-1">
                        <p className="text-white font-semibold text-sm truncate">{user.username}</p>
                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCreator ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {user.role?.toUpperCase()}
                        </span>
                      </div>

                      {/* Creator-only menu items */}
                      {isCreator && (
                        <>
                          <Link
                            to="/dashboard"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          >
                            <LayoutDashboard size={15} /> Creator Dashboard
                          </Link>
                          <Link
                            to="/upload"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          >
                            <Upload size={15} /> Upload Video
                          </Link>
                          <Link
                            to="/live/broadcast"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          >
                            <Radio size={15} /> Go Live Studio
                          </Link>
                        </>
                      )}

                      {/* Common menu items (all users) */}
                      <Link
                        to="/playlists"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <FolderHeart size={15} /> My Playlists
                      </Link>
                      <Link
                        to="/watch-later"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <Bookmark size={15} /> Watch Later
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <History size={15} /> Watch History
                      </Link>
                      <Link
                        to={`/channel/${user.id || user._id}`}
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <User size={15} /> My Channel
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <Settings size={15} /> Account Settings
                      </Link>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl mt-1 transition-colors"
                      >
                        <LogOut size={15} /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-white text-sm font-semibold hover:text-purple-400 transition-colors">
                Login
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-600/20">
                Join Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;