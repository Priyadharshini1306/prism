import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
          }
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Manage Socket Connection based on Auth state
  useEffect(() => {
    let socketInstance = null;
    
    if (user) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      socketInstance = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Socket connected to server');
        socketInstance.emit('register_user', user._id || user.id);
      });

      socketInstance.on('new_notification', (notification) => {
        toast.success(notification.message, {
          duration: 5000,
          icon: '🔔',
          style: {
            background: '#111118',
            color: '#f8fafc',
            border: '1px solid #2a2a38',
          }
        });
      });

      setSocket(socketInstance);
    }

    return () => {
      if (socketInstance) {
        console.log('🔌 Disconnecting socket');
        socketInstance.disconnect();
      }
    };
  }, [user]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    }
  };

  const register = async (username, email, password, role = 'user') => {
    const { data } = await api.post('/auth/register', { username, email, password, role });
    if (data.success) {
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    }
  };

  const logout = async () => {
    await api.get('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          setUser(res.data.user);
        }
      } catch (err) {
        console.error('Failed to refresh user data', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, socket, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
