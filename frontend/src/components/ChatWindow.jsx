import { useEffect, useRef } from 'react';
import MessageList from './MessageList';

export default function ChatWindow({ messages, currentClientId }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <section className="chat-window" aria-label="Chat window">
      <div className="chat-window-header">
        <h2>Messages</h2>
        <span>{messages.length} total</span>
      </div>

      <MessageList messages={messages} currentClientId={currentClientId} />
      <div ref={endRef} />
    </section>
  );
}
