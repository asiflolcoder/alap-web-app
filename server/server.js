import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { generateAnonName, distanceMeters, makeId } from "./utils.js";

const PORT = process.env.PORT || 4000;
const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours
const NEARBY_TICK_MS = 3000; // recompute nearby lists every 3s

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---- In-memory state ----
// userId -> { id, socketId, name, lat, lng, radius, roomId }
const users = new Map();
// roomId -> { id, name, creatorId, lat, lng, createdAt, expiresAt, members:Set<userId>, messages:[], timer }
const rooms = new Map();

app.get("/health", (_req, res) => {
  res.json({ ok: true, users: users.size, rooms: rooms.size });
});

function publicUser(u) {
  return { id: u.id, name: u.name };
}

function publicRoom(r, distance = null) {
  return {
    id: r.id,
    name: r.name,
    creatorId: r.creatorId,
    memberCount: r.members.size,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    distance,
  };
}

function deleteRoom(roomId, reason = "expired") {
  const room = rooms.get(roomId);
  if (!room) return;
  clearTimeout(room.timer);
  io.to(roomId).emit("room-closed", { roomId, reason });
  // detach members
  for (const memberId of room.members) {
    const u = users.get(memberId);
    if (u && u.roomId === roomId) u.roomId = null;
  }
  rooms.delete(roomId);
}

function recomputeNearbyForUser(user) {
  if (user.lat == null || user.lng == null) return;

  const nearbyUsers = [];
  for (const other of users.values()) {
    if (other.id === user.id) continue;
    if (other.lat == null || other.lng == null) continue;
    const d = distanceMeters(user.lat, user.lng, other.lat, other.lng);
    if (d <= user.radius) {
      nearbyUsers.push({ ...publicUser(other), distance: Math.round(d) });
    }
  }
  nearbyUsers.sort((a, b) => a.distance - b.distance);

  const nearbyRooms = [];
  for (const room of rooms.values()) {
    const d = distanceMeters(user.lat, user.lng, room.lat, room.lng);
    if (d <= user.radius) {
      nearbyRooms.push(publicRoom(room, Math.round(d)));
    }
  }
  nearbyRooms.sort((a, b) => a.distance - b.distance);

  const socket = io.sockets.sockets.get(user.socketId);
  if (socket) {
    socket.emit("nearby-update", { users: nearbyUsers, rooms: nearbyRooms });
  }
}

// Periodic broadcast loop
setInterval(() => {
  for (const user of users.values()) {
    recomputeNearbyForUser(user);
  }
}, NEARBY_TICK_MS);

io.on("connection", (socket) => {
  let userId = null;

  socket.on("register", () => {
    userId = makeId("u");
    const name = generateAnonName();
    users.set(userId, {
      id: userId,
      socketId: socket.id,
      name,
      lat: null,
      lng: null,
      radius: 2000,
      roomId: null,
    });
    socket.emit("registered", { id: userId, name });
  });

  socket.on("update-location", ({ lat, lng, radius }) => {
    const u = users.get(userId);
    if (!u) return;
    if (typeof lat === "number") u.lat = lat;
    if (typeof lng === "number") u.lng = lng;
    if (typeof radius === "number" && radius > 0) u.radius = radius;
    recomputeNearbyForUser(u);
  });

  socket.on("create-room", ({ name }) => {
    const u = users.get(userId);
    if (!u) return socket.emit("error-message", "Not registered yet.");
    if (u.lat == null || u.lng == null)
      return socket.emit("error-message", "Turn on location first.");

    const roomId = makeId("r");
    const now = Date.now();
    const room = {
      id: roomId,
      name: name?.trim() || `${u.name}'s room`,
      creatorId: u.id,
      lat: u.lat,
      lng: u.lng,
      createdAt: now,
      expiresAt: now + ROOM_LIFETIME_MS,
      members: new Set([u.id]),
      messages: [],
      timer: null,
    };
    room.timer = setTimeout(() => deleteRoom(roomId, "expired"), ROOM_LIFETIME_MS);
    rooms.set(roomId, room);

    u.roomId = roomId;
    socket.join(roomId);
    socket.emit("room-created", {
      roomId,
      name: room.name,
      expiresAt: room.expiresAt,
      members: [publicUser(u)],
      messages: [],
    });
  });

  socket.on("join-room", ({ roomId }) => {
    const u = users.get(userId);
    const room = rooms.get(roomId);
    if (!u) return socket.emit("error-message", "Not registered yet.");
    if (!room) return socket.emit("error-message", "Room no longer exists.");

    room.members.add(u.id);
    u.roomId = roomId;
    socket.join(roomId);

    const memberList = [...room.members]
      .map((id) => users.get(id))
      .filter(Boolean)
      .map(publicUser);

    socket.emit("room-joined", {
      roomId,
      name: room.name,
      expiresAt: room.expiresAt,
      members: memberList,
      messages: room.messages,
    });
    socket.to(roomId).emit("member-joined", publicUser(u));
    io.to(roomId).emit("member-list", memberList);
  });

  socket.on("leave-room", ({ roomId }) => {
    const u = users.get(userId);
    const room = rooms.get(roomId);
    if (!u || !room) return;
    room.members.delete(u.id);
    u.roomId = null;
    socket.leave(roomId);
    io.to(roomId).emit("member-left", publicUser(u));
    if (room.members.size === 0) {
      deleteRoom(roomId, "empty");
    } else {
      const memberList = [...room.members]
        .map((id) => users.get(id))
        .filter(Boolean)
        .map(publicUser);
      io.to(roomId).emit("member-list", memberList);
    }
  });

  socket.on("send-message", ({ roomId, text }) => {
    const u = users.get(userId);
    const room = rooms.get(roomId);
    if (!u || !room) return;
    if (!room.members.has(u.id)) return;
    if (!text || !text.trim()) return;

    const message = {
      id: makeId("m"),
      senderId: u.id,
      senderName: u.name,
      text: text.trim().slice(0, 2000),
      timestamp: Date.now(),
    };
    room.messages.push(message);
    if (room.messages.length > 500) room.messages.shift(); // cap memory use
    io.to(roomId).emit("new-message", message);
  });

  socket.on("disconnect", () => {
    const u = userId ? users.get(userId) : null;
    if (!u) return;
    if (u.roomId) {
      const room = rooms.get(u.roomId);
      if (room) {
        room.members.delete(u.id);
        io.to(u.roomId).emit("member-left", publicUser(u));
        if (room.members.size === 0) deleteRoom(u.roomId, "empty");
      }
    }
    users.delete(userId);
  });
});

server.listen(PORT, () => {
  console.log(`alap.com server running on http://localhost:${PORT}`);
});
