import { useEffect, useState, useCallback } from "react";
import { socket } from "./lib/socket.js";
import LocationSetup from "./components/LocationSetup.jsx";
import NearbyPanel from "./components/NearbyPanel.jsx";
import ChatRoom from "./components/ChatRoom.jsx";

// view: "connecting" | "location" | "nearby" | "room"
export default function App() {
  const [view, setView] = useState("connecting");
  const [identity, setIdentity] = useState(null); // { id, name }
  const [radius, setRadius] = useState(2000);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [nearbyRooms, setNearbyRooms] = useState([]);
  const [room, setRoom] = useState(null); // { id, name, expiresAt }
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onRegistered({ id, name }) {
      setIdentity({ id, name });
      setView("location");
    }
    function onNearbyUpdate({ users, rooms }) {
      setNearbyUsers(users);
      setNearbyRooms(rooms);
    }
    function onRoomCreated({ roomId, name, expiresAt, messages }) {
      setRoom({ id: roomId, name, expiresAt });
      setMessages(messages);
      setView("room");
    }
    function onRoomJoined({ roomId, name, expiresAt, messages }) {
      setRoom({ id: roomId, name, expiresAt });
      setMessages(messages);
      setView("room");
    }
    function onNewMessage(msg) {
      setMessages((prev) => [...prev, msg]);
    }
    function onRoomClosed({ reason }) {
      setRoom(null);
      setMessages([]);
      setView("nearby");
      setError(
        reason === "expired"
          ? "That room's 2-hour window ended and it was deleted."
          : null
      );
    }
    function onErrorMessage(msg) {
      setError(msg);
    }

    socket.on("connect", () => socket.emit("register"));
    socket.on("registered", onRegistered);
    socket.on("nearby-update", onNearbyUpdate);
    socket.on("room-created", onRoomCreated);
    socket.on("room-joined", onRoomJoined);
    socket.on("new-message", onNewMessage);
    socket.on("room-closed", onRoomClosed);
    socket.on("error-message", onErrorMessage);

    if (socket.connected) socket.emit("register");

    return () => {
      socket.off("connect");
      socket.off("registered", onRegistered);
      socket.off("nearby-update", onNearbyUpdate);
      socket.off("room-created", onRoomCreated);
      socket.off("room-joined", onRoomJoined);
      socket.off("new-message", onNewMessage);
      socket.off("room-closed", onRoomClosed);
      socket.off("error-message", onErrorMessage);
    };
  }, []);

  const handleLocationReady = useCallback(({ lat, lng, radius }) => {
    setRadius(radius);
    socket.emit("update-location", { lat, lng, radius });
    setView("nearby");
  }, []);

  const handleRadiusChange = useCallback((r) => {
    setRadius(r);
    socket.emit("update-location", { radius: r });
  }, []);

  const handleCreateRoom = useCallback((name) => {
    setError(null);
    socket.emit("create-room", { name });
  }, []);

  const handleJoinRoom = useCallback((roomId) => {
    setError(null);
    socket.emit("join-room", { roomId });
  }, []);

  const handleSend = useCallback(
    (text) => {
      if (!room) return;
      socket.emit("send-message", { roomId: room.id, text });
    },
    [room]
  );

  const handleLeave = useCallback(() => {
    if (room) socket.emit("leave-room", { roomId: room.id });
    setRoom(null);
    setMessages([]);
    setView("nearby");
  }, [room]);

  return (
    <div className="app-shell">
      <div className="brand">
        <span className="brand-mark">alap</span>
        <span className="brand-tag">talk to who's around</span>
      </div>

      {view === "connecting" && (
        <div className="card" style={{ textAlign: "center" }}>
          Connecting…
        </div>
      )}

      {view === "location" && (
        <LocationSetup onLocationReady={handleLocationReady} />
      )}

      {view === "nearby" && identity && (
        <NearbyPanel
          name={identity.name}
          radius={radius}
          onRadiusChange={handleRadiusChange}
          nearbyUsers={nearbyUsers}
          nearbyRooms={nearbyRooms}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {view === "room" && room && (
        <ChatRoom
          room={room}
          messages={messages}
          selfId={identity?.id}
          onSend={handleSend}
          onLeave={handleLeave}
        />
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
