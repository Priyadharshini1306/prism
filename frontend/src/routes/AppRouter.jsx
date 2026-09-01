import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Upload from '../pages/Upload';
import VideoView from '../pages/VideoView';
import Dashboard from '../pages/Dashboard';
import Channel from '../pages/Channel';
import WatchParty from '../pages/WatchParty';
import LiveBroadcast from '../pages/LiveBroadcast';
import LiveWatch from '../pages/LiveWatch';
import Playlists from '../pages/Playlists';
import WatchLater from '../pages/WatchLater';
import RecentlyViewed from '../pages/RecentlyViewed';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';

/* Loading spinner */
const Spinner = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

/* Route wrappers */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" />;
};

const CreatorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'creator' && user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

/* Layout wrapper — navbar + scrollable main */
const Layout = ({ children }) => (
  <>
    <Navbar />
    <main className="min-h-screen bg-[#0a0a0a]">{children}</main>
  </>
);

const AppRouter = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <Routes>
        {/* Public auth pages (no navbar) */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public pages */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/watch/:id" element={<Layout><VideoView /></Layout>} />
        <Route path="/channel/:id" element={<Layout><Channel /></Layout>} />
        <Route path="/live/watch/:creatorId" element={<Layout><LiveWatch /></Layout>} />

        {/* Protected — all logged-in users */}
        <Route path="/playlists" element={<ProtectedRoute><Layout><Playlists /></Layout></ProtectedRoute>} />
        <Route path="/watch-later" element={<ProtectedRoute><Layout><WatchLater /></Layout></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><Layout><RecentlyViewed /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/party/:roomId" element={<ProtectedRoute><Layout><WatchParty /></Layout></ProtectedRoute>} />

        {/* Creator only */}
        <Route path="/upload" element={<CreatorRoute><Layout><Upload /></Layout></CreatorRoute>} />
        <Route path="/dashboard" element={<CreatorRoute><Layout><Dashboard /></Layout></CreatorRoute>} />
        <Route path="/live/broadcast" element={<CreatorRoute><Layout><LiveBroadcast /></Layout></CreatorRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default AppRouter;