function formatTime(timestamp) {
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function MessageList({ messages, currentClientId }) {
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <p>No messages yet.</p>
        <span>Send the first one to begin the conversation.</span>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const ownMessage = message.senderId === currentClientId;

        return (
          <article
            className={`message-card ${ownMessage ? 'message-own' : 'message-received'}`}
            key={message.id}
          >
            <div className="message-meta">
              <strong>{ownMessage ? 'You' : message.senderName}</strong>
              <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
            </div>
            <p>{message.text}</p>
          </article>
        );
      })}
    </div>
  );
}
