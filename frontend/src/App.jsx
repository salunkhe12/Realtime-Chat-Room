import { useEffect, useMemo, useRef, useState } from 'react';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';

function getDefaultWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = import.meta.env.VITE_WS_PORT || '8080';
  return `${protocol}//${host}:${port}`;
}

function getStoredName() {
  return window.localStorage.getItem('chat-name') || '';
}

export default function App() {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState(getStoredName);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Connecting');
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || getDefaultWebSocketUrl();
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setStatus('Connected');
      setError('');
    });

    socket.addEventListener('close', () => {
      setStatus('Disconnected');
    });

    socket.addEventListener('error', () => {
      setStatus('Connection error');
      setError(`Unable to connect to the WebSocket server at ${socketUrl}.`);
    });

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'welcome') {
        setClientId(payload.clientId);
        return;
      }

      if (payload.type === 'history') {
        setMessages(payload.messages || []);
        return;
      }

      if (payload.type === 'message') {
        setMessages((current) => [...current, payload.message]);
        return;
      }

      if (payload.type === 'error') {
        setError(payload.message);
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  const canSend = useMemo(() => {
    return status === 'Connected' && name.trim().length >= 2 && draft.trim().length > 0;
  }, [draft, name, status]);

  function handleNameChange(event) {
    const nextName = event.target.value;
    setName(nextName);
    window.localStorage.setItem('chat-name', nextName);
  }

  function handleSend(event) {
    event.preventDefault();

    if (!canSend || !socketRef.current) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        name: name.trim(),
        text: draft.trim(),
      })
    );

    setDraft('');
    setError('');
  }

  return (
    <main className="page-shell">
      <section className="chat-layout">
        <header className="hero-panel">
          <p className="eyebrow">React + Node + WebSocket</p>
          <h1>Realtime Chat Room</h1>
          <p className="hero-copy">
            Open this app in two browser windows to chat instantly with message history loaded from
            a local file.
          </p>

          <div className="identity-grid">
            <label className="field">
              <span>Your name</span>
              <input
                value={name}
                onChange={handleNameChange}
                placeholder="Enter at least 2 characters"
                maxLength={24}
              />
            </label>

            <div className="status-card">
              <span className="status-label">Connection</span>
              <strong className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                {status}
              </strong>
            </div>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}
        </header>

        <ChatWindow messages={messages} currentClientId={clientId} />

        <MessageInput
          value={draft}
          onChange={setDraft}
          onSubmit={handleSend}
          disabled={status !== 'Connected' || name.trim().length < 2}
        />
      </section>
    </main>
  );
}
