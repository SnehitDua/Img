import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import bg from './bg.jpeg';

axios.defaults.withCredentials = true; // Send cookies

function App() {
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [caption, setCaption] = useState('');
  const fileInputRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showHearts, setShowHearts] = useState(false);
  const [reactions, setReactions] = useState({});
  const [showPickerFor, setShowPickerFor] = useState(null);
  const [selectedEmojiUsers, setSelectedEmojiUsers] = useState([]);
  const [showUserListFor, setShowUserListFor] = useState(null);
  const emojiPickerRef = React.useRef(null);
  const userListPopupRef = React.useRef(null);


  useEffect(() => {
    axios.get('https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/me', {
      withCredentials: true
    })
      .then(res => {
        if (res.data.loggedIn) {
          setLoggedIn(true);
          setUser(res.data.username); // 👈 Save username
        }
      });
  }, []);

  const loadMoreImages = useCallback((customPage) => {
    if (loading) return;
  
    setLoading(true);
    const nextPage = customPage ?? page;
  
    axios.get(`https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/images?page=${nextPage}`, {
      withCredentials: 'include'
    })
    .then(async res => {
      if (res.data.length === 0) {
        setHasMore(false);
      } else {
        const imgs = res.data;
        setImages(prev => [...prev, ...imgs]);
        setPage(prev => prev + 1);

        // Fetch reactions for each image
        for (const img of imgs) {
          await fetchReactions(img._id);
        }
      }
    })
      .catch(err => console.error('Error loading images:', err))
      .finally(() => setLoading(false));
  }, [loading, page]);

  useEffect(() => {
    if (loggedIn && images.length === 0) {
      loadMoreImages(1);
    }
  }, [loggedIn, images.length, loadMoreImages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
  
    let isScrolling = false;
  
    const handleScroll = () => {
      if (isScrolling) return;
  
      if (Math.abs(container.scrollTop) + 50 >= container.scrollHeight - container.clientHeight && hasMore && !loading) {
        isScrolling = true;
        loadMoreImages();
  
        // Reset the scrolling flag after a small delay (debounce)
        setTimeout(() => {
          isScrolling = false;
        }, 0); // Adjust the delay (in milliseconds) as needed
      }
    };
  
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadMoreImages]);

  const handleLogin = async () => {
    try {
      await axios.post('https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/login', form, {
        withCredentials: true
      });
      setLoggedIn(true);
      setUser(form.username); // 👈 Save username
    } catch (error){
      alert('Login failed:', error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('caption', caption);
    formData.append('user', user);
  
    try {
      await axios.post('https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/upload', formData, {
        withCredentials: true
      });
      setFile(null);
      setCaption('');
      fileInputRef.current.value = '';
      setImages([]);
      setPage(1);
      setHasMore(true);
      loadMoreImages(1); // 👈 fix: force reloading first page
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 10000); // show hearts for 10 seconds
    } catch {
      alert('Upload failed');
    }
  };

  const logout = async () => {
    await axios.post('https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/logout', {
      withCredentials: true
    });
    setLoggedIn(false);
    setImages([]);
    setPage(1);
    setHasMore(true);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowPickerFor(null);
      }
  
      if (
        userListPopupRef.current &&
        !userListPopupRef.current.contains(event.target)
      ) {
        setShowUserListFor(null);
      }
    }
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchReactions = async (imageId) => {
    const res = await axios.get(`https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/reactions/${imageId}`, {
      withCredentials: true
    });
    setReactions(prev => ({ ...prev, [imageId]: res.data }));
  };

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
  
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
  
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
    if (isToday) {
      return time;
    }
  
    const datePart = date.toLocaleDateString([], { day: 'numeric', month: 'short' }); // e.g. "9 May"
    return `${datePart}, ${time}`;
  }
  

return (
  <div className="romantic-bg">
    {showHearts && (
  <div className="hearts-container">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="heart" style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${5 + Math.random() * 5}s`,
        transform: `scale(${0.5 + Math.random()})`
      }}>
        💖
      </div>
    ))}
  </div>
)}
  <div className="app-container">
    <header className="app-header">
    <div className="logo-container">
    <img src="/logo2.png" alt="App Logo" className="app-logo" />
          </div>
      <h2>Fotos 📸</h2>
      {loggedIn && (
        <div className="user-info">
          {/* <span>{user}</span> */}
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      )}
    </header>

    {!loggedIn ? (
      <div className="login-box" style={{ backgroundImage: `url(${bg})` }}>
        <input
          type="text"
          placeholder="Username"
          onChange={e => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={e => setForm({ ...form, password: e.target.value })}
        />
        <button onClick={handleLogin}>Login</button>
      </div>
    ) : (
      <>
        <div ref={scrollContainerRef} className="chat-feed">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`chat-message ${img.username === user ? 'chat-right' : 'chat-left'}`}
            >
              <img
                src={`data:image/jpeg;base64,${img.profilePic}`}
                alt="avatar"
                className="avatar"
              />
              <div className="message-bubble">
                <strong>{img.username}</strong>
                <img src={`data:image/jpeg;base64,${img.data}`} alt="uploaded" className="message-image" />
                <p className="caption">{img.caption}</p>
                <div className="reaction-box">
          <button className="emoji-button" onClick={() => setShowPickerFor(img._id)}>😊</button>
          {showPickerFor === img._id && (
          <div className="emoji-picker" ref={emojiPickerRef}>
            {['😍', '😂', '😢', '👍', '🔥', '💖'].map(e => (
              <span
                key={e}
                onClick={async () => {
                  await axios.post('https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/react', {
                    imageId: img._id,
                    emoji: e,
                    user: user
                  });
                  fetchReactions(img._id);
                  setShowPickerFor(null);
                }}
              >
                {e}
              </span>
            ))}
          </div>
        )}
        </div>
        <div className="emoji-summary">
        {reactions[img._id]?.length > 0 && 
          [...new Set(reactions[img._id].map(r => r.emoji))].map(emoji => {
            const users = reactions[img._id].filter(r => r.emoji === emoji).map(r => r.username);
            const youReacted = users.includes(user);

            return (
              <span
                key={emoji}
                className={`reacted-emoji ${youReacted ? 'you-reacted' : ''}`}
                onClick={() => {
                  setSelectedEmojiUsers(users);
                  setShowUserListFor({ emoji, imageId: img._id });
                }}
              >
                {emoji}
              </span>
            );
          })}
      </div>
      {showUserListFor?.imageId === img._id && (
  <div className="user-list-popup" ref={userListPopupRef}>
    <strong>{showUserListFor.emoji}</strong>
    <ul>
      {selectedEmojiUsers.map(u => (
        <li key={u}>
          {u} {u === user && (
            <button onClick={async () => {
              await axios.post('https://bee72c8c-8785-40e4-a2bd-4dc865547bc7-dev.e1-us-east-azure.choreoapis.dev/images-app/backend/v1.0/unreact', {
                imageId: img._id,
                emoji: showUserListFor.emoji,
                user: user
              });
              fetchReactions(img._id);
              setShowUserListFor(null);
            }}>
              remove
            </button>
          )}
        </li>
      ))}
    </ul>
  </div>
)}
                <span className="timestamp">{formatTimestamp(img.createdAt)}</span>
              </div>
            </div>
          ))}
          {!hasMore && <p className="end-feed">No more images</p>}
        </div>

        <div className="input-bar">
          <button className="icon-button" onClick={() => fileInputRef.current.click()}>📎</button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])}
          />
          <input
            type="text"
            placeholder="Write a caption..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="caption-input"
          />
          <button className="send-btn" onClick={handleUpload}>➤</button>
        </div>
      </>
    )}
  </div>
  </div>
);
}

export default App;
