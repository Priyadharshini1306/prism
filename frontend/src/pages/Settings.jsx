import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Globe, Monitor, Smartphone, Tablet,
  Shield, LogOut, Save, Loader2, CheckCircle2, AlertTriangle,
  Camera, Image as ImageIcon, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Device icon helper ────────────────────────────── */
const DeviceIcon = ({ ua = '' }) => {
  const lower = ua.toLowerCase();
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone'))
    return <Smartphone size={16} className="text-purple-400" />;
  if (lower.includes('tablet') || lower.includes('ipad'))
    return <Tablet size={16} className="text-indigo-400" />;
  return <Monitor size={16} className="text-blue-400" />;
};

/* ─── Section wrapper ───────────────────────────────── */
const Section = ({ title, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-6"
  >
    <div className="flex items-center gap-3 pb-4 border-b border-white/5">
      <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center">
        <Icon size={17} className="text-purple-400" />
      </div>
      <h2 className="text-white font-bold text-lg">{title}</h2>
    </div>
    {children}
  </motion.div>
);

/* ─── Input field ───────────────────────────────────── */
const Field = ({ label, placeholder, value, onChange, type = 'text', maxLength, hint }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-gray-300">{label}</label>
    {type === 'textarea' ? (
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all resize-none"
      />
    ) : (
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-all"
      />
    )}
    {hint && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════════ */
const Settings = () => {
  const { user, refreshUser } = useAuth();

  /* Profile text state */
  const [bio,     setBio]     = useState('');
  const [website, setWebsite] = useState('');

  /* Preview URLs (could be object URLs or Drive URLs) */
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');

  /* Staged files for upload */
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  /* Sessions state */
  const [sessions,        setSessions]        = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking,        setRevoking]        = useState(null);

  /* File input refs */
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  /* Load existing profile data */
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setWebsite(user.website || '');
      setAvatarPreview(user.avatar || '');
      setBannerPreview(user.bannerImage || '');
    }
  }, [user]);

  /* Load sessions */
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await api.get('/auth/sessions');
        if (data.success) setSessions(data.data);
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  /* Handle image file selection — create local preview */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let updatedUser = null;

      /* If image files are staged, use multipart upload endpoint */
      if (avatarFile || bannerFile) {
        const formData = new FormData();
        if (avatarFile) formData.append('avatar', avatarFile);
        if (bannerFile) formData.append('banner', bannerFile);
        formData.append('bio', bio);
        formData.append('website', website);

        const { data } = await api.patch('/auth/profile/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data.success) {
          updatedUser = data.user;
        } else if (data.partialSuccess) {
          // Bio/website saved but image upload failed (e.g. expired Drive token)
          updatedUser = data.user;
          toast.error(data.message, { duration: 6000 });
        }
      } else {
        /* Text-only update (bio, website) */
        const { data } = await api.patch('/auth/profile', { bio, website });
        if (data.success) updatedUser = data.user;
      }

      if (updatedUser) {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, ...updatedUser }));
        await refreshUser();
        /* Clear staged files after successful upload */
        setAvatarFile(null);
        setBannerFile(null);
        setSaved(true);
        // Only show generic success if no image errors were present
        const hadImageError = (avatarFile || bannerFile);
        if (!hadImageError) toast.success('Profile updated!');
        else if (updatedUser.bio !== undefined || updatedUser.website !== undefined) {
          // partial: text was saved above via toast.error for images, confirm text
          toast.success('Bio & website saved!');
        }
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    try {
      await api.delete('/auth/sessions');
      setSessions((prev) => prev.slice(0, 1));
      toast.success('All other sessions revoked');
    } catch {
      toast.error('Failed to revoke sessions');
    }
  };

  const formatSessionTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  return (
    <div className="pt-24 px-6 md:px-12 max-w-3xl mx-auto pb-20">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
          <User size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your profile and security</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Profile Preview (live) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden border border-white/10"
        >
          {/* Banner */}
          <div
            className="h-36 relative group cursor-pointer"
            style={
              bannerPreview
                ? { backgroundImage: `url(${bannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: 'linear-gradient(135deg, #3b0764 0%, #1e1b4b 50%, #4c0519 100%)' }
            }
            onClick={() => bannerInputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Camera size={20} className="text-white" />
              <span className="text-white text-sm font-semibold">Change Banner</span>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
            {/* Banner change badge */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 pointer-events-none">
              <ImageIcon size={10} />
              Edit Banner
            </div>
          </div>

          {/* Avatar + info */}
          <div className="px-6 pb-5">
            <div className="-mt-10 flex items-end gap-4 mb-3">
              {/* Instagram-style avatar with overlay */}
              <div
                className="relative group cursor-pointer flex-shrink-0"
                onClick={() => avatarInputRef.current?.click()}
              >
                <img
                  src={avatarPreview || defaultAvatar}
                  alt={user?.username}
                  className="w-20 h-20 rounded-full border-4 border-[#0a0a0a] object-cover bg-zinc-900"
                  onError={(e) => { e.target.src = defaultAvatar; }}
                />
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
                <div className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-purple-600 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center">
                  <Camera size={10} className="text-white" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="pb-1">
                <h3 className="text-white font-bold text-lg">{user?.username}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  user?.role === 'creator'
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {user?.role?.toUpperCase()}
                </span>
              </div>
            </div>
            {bio && <p className="text-gray-400 text-sm">{bio}</p>}

            {/* Staged file indicators */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {avatarFile && (
                <div className="flex items-center gap-1.5 text-[10px] bg-purple-600/15 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-full font-semibold">
                  <Camera size={10} />
                  New avatar ready
                  <button onClick={() => { setAvatarFile(null); setAvatarPreview(user?.avatar || ''); }} className="ml-1 hover:text-white transition-colors">
                    <X size={10} />
                  </button>
                </div>
              )}
              {bannerFile && (
                <div className="flex items-center gap-1.5 text-[10px] bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-full font-semibold">
                  <ImageIcon size={10} />
                  New banner ready
                  <button onClick={() => { setBannerFile(null); setBannerPreview(user?.bannerImage || ''); }} className="ml-1 hover:text-white transition-colors">
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Profile Edit Form ── */}
        <Section title="Profile Information" icon={User}>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Upload hint cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-purple-500/40 rounded-2xl transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-500/30">
                  <img
                    src={avatarPreview || defaultAvatar}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = defaultAvatar; }}
                  />
                </div>
                <div>
                  <p className="text-white text-xs font-bold">Profile Photo</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Click to change</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 rounded-2xl transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border-2 border-indigo-500/30 bg-gradient-to-br from-purple-900/60 to-pink-900/60 flex items-center justify-center">
                  {bannerPreview
                    ? <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon size={14} className="text-indigo-400" />
                  }
                </div>
                <div>
                  <p className="text-white text-xs font-bold">Channel Banner</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">1280×360px recommended</p>
                </div>
              </button>
            </div>

            <Field
              label="Bio"
              placeholder="Tell your audience about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              type="textarea"
              maxLength={300}
              hint={`${bio.length}/300 characters`}
            />
            <Field
              label="Website"
              placeholder="https://yourwebsite.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              type="url"
              hint="Your personal or professional website"
            />
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/25 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
              </button>
              {saving && (avatarFile || bannerFile) && (
                <span className="text-purple-400 text-xs font-semibold animate-pulse">
                  Uploading to Drive…
                </span>
              )}
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 text-sm font-semibold"
                  >
                    Profile updated ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </form>
        </Section>

        {/* ── Account Info ── */}
        <Section title="Account Information" icon={Shield}>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Username</span>
              <span className="text-white font-semibold text-sm">@{user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Email</span>
              <span className="text-white font-semibold text-sm">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400 text-sm">Role</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                user?.role === 'creator' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              }`}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-2 p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl flex gap-3 items-start">
            <AlertTriangle size={15} className="text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-200/70 text-xs">
              To change your email or password, contact support. Username changes are not available.
            </p>
          </div>
        </Section>

        {/* ── Active Sessions ── */}
        <Section title="Active Sessions" icon={Monitor}>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No sessions found</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeAll}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Revoke all others
                  </button>
                )}
              </div>
              <AnimatePresence>
                {sessions.map((session, idx) => (
                  <motion.div
                    key={session._id}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <DeviceIcon ua={session.userAgent} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {session.userAgent?.split('/')[0] || 'Unknown Device'}
                        {idx === 0 && (
                          <span className="ml-2 text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-bold">
                            CURRENT
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-gray-500 text-xs truncate">{session.ipAddress}</p>
                        <span className="text-gray-600 text-xs">·</span>
                        <p className="text-gray-500 text-xs whitespace-nowrap">
                          {formatSessionTime(session.expiresAt ? new Date(session.expiresAt - 7 * 24 * 60 * 60 * 1000) : session.createdAt)}
                        </p>
                      </div>
                    </div>
                    {idx !== 0 && (
                      <button
                        onClick={() => handleRevokeSession(session._id)}
                        disabled={revoking === session._id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 flex-shrink-0"
                        title="Revoke this session"
                      >
                        {revoking === session._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <LogOut size={14} />
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

export default Settings;
