export default function MessageInput({ value, onChange, onSubmit, disabled }) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <label className="field composer-field">
        <span>Message</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={disabled ? 'Add your name to start chatting' : 'Type your message'}
        />
      </label>

      <button type="submit" disabled={disabled || value.trim().length === 0}>
        Send
      </button>
    </form>
  );
}
