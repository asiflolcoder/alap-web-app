import { useEffect, useRef, useState } from "react";

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function ChatRoom({
  room,
  messages,
  selfId,
  onSend,
  onLeave,
}) {
  const [text, setText] = useState("");
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const remaining = room.expiresAt - now;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="room-shell">
      <div className="room-header">
        <div>
          <div className="room-title">{room.name}</div>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: 12, marginTop: 6 }}
            onClick={onLeave}
          >
            ← Leave room
          </button>
        </div>
        <span className="timer-chip">
          self-destructs in {formatClock(remaining)}
        </span>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-hint">
            No messages yet. Say hi to whoever's around.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message ${m.senderId === selfId ? "mine" : ""}`}
          >
            {m.senderId !== selfId && (
              <div className="sender">{m.senderName}</div>
            )}
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <input
          className="text-input"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button className="btn btn-primary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
