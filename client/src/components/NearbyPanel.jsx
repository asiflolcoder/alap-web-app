import { useState } from "react";
import { formatRadius } from "./LocationSetup.jsx";

function formatDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function timeLeft(expiresAt) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expiring…";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function NearbyPanel({
  name,
  radius,
  onRadiusChange,
  nearbyUsers,
  nearbyRooms,
  onCreateRoom,
  onJoinRoom,
}) {
  const [roomName, setRoomName] = useState("");

  return (
    <div className="card stack">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="identity-pill">
          <span className="dot" /> {name}
        </span>
        <span className="distance-chip">radius {formatRadius(radius)}</span>
      </div>

      <div className="stack" style={{ flexDirection: "row" }}>
        <input
          className="text-input"
          style={{ flex: 1 }}
          placeholder="Name your room (optional)"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          maxLength={40}
        />
        <button
          className="btn btn-primary"
          style={{ whiteSpace: "nowrap" }}
          onClick={() => {
            onCreateRoom(roomName);
            setRoomName("");
          }}
        >
          Open room
        </button>
      </div>

      <div>
        <div className="section-label">
          Nearby rooms · {nearbyRooms.length}
        </div>
        {nearbyRooms.length === 0 && (
          <div className="empty-hint">
            No open rooms in range yet. Be the first to start one.
          </div>
        )}
        {nearbyRooms.map((r) => (
          <div className="list-row" key={r.id}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {r.memberCount} in room · {timeLeft(r.expiresAt)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="distance-chip">
                {formatDistance(r.distance)}
              </span>
              <button
                className="btn btn-ghost"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => onJoinRoom(r.id)}
              >
                Join
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="section-label">
          Nearby people · {nearbyUsers.length}
        </div>
        {nearbyUsers.length === 0 && (
          <div className="empty-hint">
            No one else is in range right now. Try widening your radius.
          </div>
        )}
        {nearbyUsers.map((u) => (
          <div className="list-row" key={u.id}>
            <div>
              <span className="dot" />
              {u.name}
            </div>
            <span className="distance-chip">{formatDistance(u.distance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
