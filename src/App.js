import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, LogOut, Send, Upload, Users, MessageCircle, Settings, Edit2, Check, X } from 'lucide-react';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

const THEME = {
  bg: '#0f0f12',
  surface: '#1a1a1e',
  card: '#252529',
  border: '#3a3a3e',
  accent: '#00d9ff',
  accentHover: '#00ffff',
  text: '#e0e0e0',
  textSecondary: '#999999',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [wallpaper, setWallpaper] = useState(null);
  const [socket, setSocket] = useState(null);

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Profile setup
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  // Messaging
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const [inbox, setInbox] = useState([]);

  // Admin
  const [pendingUsers, setPendingUsers] = useState([]);
  const [wallpaperFile, setWallpaperFile] = useState(null);

  // Initialize socket
  useEffect(() => {
    if (token && user) {
      const newSocket = io(SOCKET_URL);
      newSocket.emit('join-user', user.id);
      newSocket.on('receive-message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [token, user]);

  // Fetch wallpaper
  useEffect(() => {
    const fetchWallpaper = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/wallpaper`);
        const data = await res.json();
        if (data.wallpaper) {
          setWallpaper(`${SOCKET_URL}${data.wallpaper}`);
        }
      } catch (error) {
        console.error('Error fetching wallpaper:', error);
      }
    };
    fetchWallpaper();
  }, []);

  // Fetch user data on token change
  useEffect(() => {
    if (token) {
      fetchUserProfile();
      setCurrentPage('dashboard');
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        if (!data.user.username) {
          setShowUsernameSetup(true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/auth/signup' : '/auth/login';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (data.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setCurrentPage('dashboard');
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
    setLoginEmail('');
    setLoginPassword('');
  };

  const handleSetUsername = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/users/set-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
      });

      const data = await res.json();
      if (data.ok) {
        setUser({ ...user, username: newUsername });
        setShowUsernameSetup(false);
        setNewUsername('');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error setting username: ' + error.message);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_URL}/users/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.ok) {
        setUser({ ...user, avatar: data.avatar });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    }
  };

  const handleWallpaperUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('wallpaper', file);

    try {
      const res = await fetch(`${API_URL}/admin/upload-wallpaper`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.ok) {
        setWallpaper(`${SOCKET_URL}${data.wallpaper}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedUser) return;

    try {
      const msg = {
        senderId: user.id,
        receiverId: selectedUser.id,
        content: messageContent,
        senderUsername: user.username
      };

      socket?.emit('send-message', msg);
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          createdAt: new Date(),
