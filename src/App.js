import React, { useState, useEffect } from 'react';
import { LogOut, Send, Upload, Users, MessageCircle, Settings, Check } from 'lucide-react';
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

  // Messaging
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');

  // Admin
  const [pendingUsers, setPendingUsers] = useState([]);

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

    if (token) {
      fetchUserProfile();
      setCurrentPage('dashboard');
    }
  }, [token]);

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
          sender: { username: user.username, avatar: user.avatar }
        }
      ]);
      setMessageContent('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const fetchConversation = async (selectedUserId) => {
    try {
      const res = await fetch(`${API_URL}/messages/conversation/${selectedUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.ok) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/pending-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.ok) {
        setPendingUsers(data.pending);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  const approveUser = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/auth/approve-user/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.ok) {
        setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      }
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentPage('login');
  };

  // Login Page
  if (!token) {
    return (
      <div
        style={{
          background: wallpaper ? `url('${wallpaper}')` : THEME.bg,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: THEME.text,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Segoe UI', sans-serif"
        }}
      >
        <div
          style={{
            background: THEME.surface,
            padding: '40px',
            borderRadius: '8px',
            border: `1px solid ${THEME.border}`,
            maxWidth: '400px',
            width: '100%'
          }}
        >
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '10px', letterSpacing: '1px' }}>
            SCREENER
          </h1>
          <p style={{ color: THEME.textSecondary, marginBottom: '40px', fontSize: '14px' }}>
            Professional Stock Screening
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: THEME.accent, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '4px',
                  color: THEME.text,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: THEME.accent, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '4px',
                  color: THEME.text,
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: THEME.accent,
                color: THEME.surface,
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer'
              }}
            >
              {isRegistering ? 'REGISTER' : 'SIGN IN'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: THEME.textSecondary }}>
              {isRegistering ? 'Already have account? ' : "Don't have account? "}
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: THEME.accent,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {isRegistering ? 'Sign in' : 'Register'}
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Username Setup Modal
  if (showUsernameSetup) {
    return (
      <div
        style={{
          background: THEME.bg,
          color: THEME.text,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Segoe UI', sans-serif"
        }}
      >
        <div
          style={{
            background: THEME.surface,
            padding: '40px',
            borderRadius: '8px',
            border: `1px solid ${THEME.border}`,
            maxWidth: '400px',
            width: '100%'
          }}
        >
          <h2 style={{ marginBottom: '20px', color: THEME.accent }}>Set Your Username</h2>

          <form onSubmit={handleSetUsername}>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Your username (3+ characters)"
              style={{
                width: '100%',
                padding: '12px 14px',
                marginBottom: '20px',
                background: THEME.card,
                border: `1px solid ${THEME.border}`,
                borderRadius: '4px',
                color: THEME.text,
                fontSize: '14px'
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: THEME.accent,
                color: THEME.surface,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '700',
                marginBottom: '10px'
              }}
            >
              Continue
            </button>
          </form>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: THEME.danger,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Header
  const Header = () => (
    <div
      style={{
        background: THEME.surface,
        borderBottom: `1px solid ${THEME.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: THEME.accent, margin: 0, letterSpacing: '2px' }}>
        SCREENER
      </h1>

      <div style={{ display: 'flex', gap: '20px' }}>
        {user?.isAdmin && (
          <button
            onClick={() => setCurrentPage('admin')}
            style={{
              background: currentPage === 'admin' ? THEME.accent : 'none',
              color: currentPage === 'admin' ? THEME.surface : THEME.textSecondary,
              border: 'none',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}
          >
            <Settings size={16} style={{ marginRight: '6px' }} />
            ADMIN
          </button>
        )}

        <button
          onClick={() => setCurrentPage('messages')}
          style={{
            background: currentPage === 'messages' ? THEME.accent : 'none',
            color: currentPage === 'messages' ? THEME.surface : THEME.textSecondary,
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}
        >
          <MessageCircle size={16} style={{ marginRight: '6px' }} />
          MESSAGES
        </button>

        <button
          onClick={() => setCurrentPage('dashboard')}
          style={{
            background: currentPage === 'dashboard' ? THEME.accent : 'none',
            color: currentPage === 'dashboard' ? THEME.surface : THEME.textSecondary,
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}
        >
          <Users size={16} style={{ marginRight: '6px' }} />
          PROFILE
        </button>

        <button
          onClick={handleLogout}
          style={{
            background: THEME.danger,
            color: 'white',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <LogOut size={14} /> LOGOUT
        </button>
      </div>
    </div>
  );

  // Dashboard (Profile)
  if (currentPage === 'dashboard') {
    return (
      <div style={{ background: THEME.bg, color: THEME.text, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
        <Header />

        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ background: THEME.surface, padding: '24px', borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: THEME.accent }}>
              YOUR PROFILE
            </h2>

            {/* Avatar */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              {user?.avatar ? (
                <img
                  src={`${SOCKET_URL}${user.avatar}`}
                  alt="avatar"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    marginBottom: '12px',
                    border: `2px solid ${THEME.accent}`
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: THEME.card,
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    border: `2px solid ${THEME.accent}`
                  }}
                >
                  👤
                </div>
              )}

              <label style={{ display: 'inline-block', marginTop: '8px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => document.querySelector('input[type=file]').click()}
                  style={{
                    padding: '8px 14px',
                    background: THEME.accent,
                    color: THEME.surface,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={14} /> UPLOAD PHOTO
                </button>
              </label>
            </div>

            {/* Profile Info */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: THEME.textSecondary, textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                EMAIL
              </p>
              <p style={{ fontSize: '16px', color: THEME.text }}>{user?.email}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: THEME.textSecondary, textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                USERNAME
              </p>
              <p style={{ fontSize: '16px', color: THEME.accent, fontWeight: '600' }}>@{user?.username}</p>
            </div>

            <div>
              <p style={{ fontSize: '12px', color: THEME.textSecondary, textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                STATUS
              </p>
              <p style={{ fontSize: '14px', color: THEME.success }}>✓ Active</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Messages
  if (currentPage === 'messages') {
    return (
      <div style={{ background: THEME.bg, color: THEME.text, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <Header />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Users List */}
          <div style={{ width: '300px', background: THEME.surface, borderRight: `1px solid ${THEME.border}`, padding: '20px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: THEME.accent, textTransform: 'uppercase' }}>
              USERS
            </h3>

            <button
              onClick={() => {
                loadUsers();
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: THEME.accent,
                color: THEME.surface,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '12px',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              Load Users
            </button>

            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  fetchConversation(u.id);
                }}
                style={{
                  padding: '12px',
                  background: selectedUser?.id === u.id ? THEME.accent : THEME.card,
                  borderRadius: '4px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                {u.avatar ? (
                  <img src={`${SOCKET_URL}${u.avatar}`} alt={u.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: THEME.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    👤
                  </div>
                )}
                <span style={{ fontSize: '13px', color: selectedUser?.id === u.id ? THEME.surface : THEME.text, fontWeight: '600' }}>
                  @{u.username || u.email}
                </span>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedUser ? (
              <>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedUser.avatar ? (
                    <img src={`${SOCKET_URL}${selectedUser.avatar}`} alt={selectedUser.username} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: THEME.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      👤
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: THEME.accent }}>
                      @{selectedUser.username || selectedUser.email}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: THEME.textSecondary }}>Online</p>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        maxWidth: '60%',
                        alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start',
                        padding: '12px 14px',
                        background: msg.senderId === user.id ? THEME.accent : THEME.card,
                        borderRadius: '8px',
                        color: msg.senderId === user.id ? THEME.surface : THEME.text,
                        fontSize: '13px'
                      }}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div style={{ padding: '16px 24px', borderTop: `1px solid ${THEME.border}`, display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') sendMessage();
                    }}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      background: THEME.card,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: '4px',
                      color: THEME.text,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    style={{
                      padding: '12px 14px',
                      background: THEME.accent,
                      color: THEME.surface,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: THEME.textSecondary, fontSize: '14px' }}>Select a user to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin Panel
  if (currentPage === 'admin' && user?.isAdmin) {
    return (
      <div style={{ background: THEME.bg, color: THEME.text, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
        <Header />

        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: THEME.accent, textTransform: 'uppercase' }}>
            ADMIN PANEL
          </h2>

          {/* Wallpaper Upload */}
          <div style={{ background: THEME.surface, padding: '24px', borderRadius: '8px', border: `1px solid ${THEME.border}`, marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: THEME.accent }}>
              CHANGE WALLPAPER
            </h3>

            <label style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleWallpaperUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => document.querySelector('input[type=file]').click()}
                style={{
                  padding: '12px 14px',
                  background: THEME.accent,
                  color: THEME.surface,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} /> UPLOAD WALLPAPER
              </button>
            </label>

            {wallpaper && (
              <div style={{ marginTop: '16px' }}>
                <img
                  src={wallpaper}
                  alt="wallpaper"
                  style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }}
                />
              </div>
            )}
          </div>

          {/* Pending Users */}
          <div style={{ background: THEME.surface, padding: '24px', borderRadius: '8px', border: `1px solid ${THEME.border}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: THEME.accent }}>
              PENDING APPROVALS
            </h3>

            <button
              onClick={fetchPendingUsers}
              style={{
                padding: '10px 14px',
                background: THEME.accent,
                color: THEME.surface,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '12px',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              REFRESH
            </button>

            {pendingUsers.length === 0 ? (
              <p style={{ color: THEME.textSecondary }}>No pending users</p>
            ) : (
              pendingUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: THEME.card,
                    padding: '12px 14px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: THEME.text }}>
                      {u.email}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: THEME.textSecondary }}>
                      {new Date(u.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => approveUser(u.id)}
                      style={{
                        padding: '6px 12px',
                        background: THEME.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={14} /> APPROVE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
