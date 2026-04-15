import { useEffect, useMemo, useRef, useState } from 'react';

function formatTime(value) {
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [draftName, setDraftName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Connecting');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(buildSocketUrl());
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setStatus('Connected');
    });

    socket.addEventListener('close', () => {
      setStatus('Disconnected');
    });

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'history') {
        setMessages(payload.messages);
        return;
      }

      if (payload.type === 'message' || payload.type === 'system') {
        setMessages((current) => [...current, payload]);
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canJoin = useMemo(
    () => draftName.trim().length >= 2 && status === 'Connected' && !username,
    [draftName, status, username]
  );

  const canSend = useMemo(
    () => Boolean(username) && message.trim().length > 0 && status === 'Connected',
    [message, status, username]
  );

  function joinChat(event) {
    event.preventDefault();

    if (!canJoin) {
      return;
    }

    const trimmedName = draftName.trim();
    socketRef.current?.send(
      JSON.stringify({
        type: 'join',
        username: trimmedName,
      })
    );
    setUsername(trimmedName);
  }

  function sendMessage(event) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    socketRef.current?.send(
      JSON.stringify({
        type: 'message',
        message: message.trim(),
      })
    );
    setMessage('');
  }

  return (
    <main className="app-shell">
      <section className="chat-card">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Realtime chat</p>
            <h1>WebSocket room</h1>
          </div>
          <span className={`status-pill status-${status.toLowerCase()}`}>{status}</span>
        </header>

        {!username ? (
          <form className="join-form" onSubmit={joinChat}>
            <label htmlFor="name">Choose a name</label>
            <div className="input-row">
              <input
                id="name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Enter username"
                maxLength={24}
              />
              <button type="submit" disabled={!canJoin}>
                Join
              </button>
            </div>
          </form>
        ) : (
          <p className="welcome">Signed in as {username}</p>
        )}

        <section className="message-list" aria-label="Chat messages">
          {messages.length === 0 ? (
            <div className="empty-state">No messages yet. Start the conversation.</div>
          ) : null}

          {messages.map((entry, index) => (
            <article
              className={`message-bubble ${
                entry.type === 'system'
                  ? 'message-system'
                  : entry.username === username
                    ? 'message-own'
                    : 'message-peer'
              }`}
              key={`${entry.timestamp}-${index}`}
            >
              <div className="message-meta">
                <strong>{entry.type === 'system' ? 'System' : entry.username}</strong>
                <span>{formatTime(entry.timestamp)}</span>
              </div>
              <p>{entry.message}</p>
            </article>
          ))}
          <div ref={messagesEndRef} />
        </section>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={username ? 'Type a message' : 'Join the room to chat'}
            disabled={!username || status !== 'Connected'}
          />
          <button type="submit" disabled={!canSend}>
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
