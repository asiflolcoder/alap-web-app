# alap — talk to who's around

Anonymous, location-based, ephemeral chat rooms. Prototype built for local
testing.

## How it works

- On connect, the server hands out a random anonymous name (e.g.
  `QuietFalcon42`) — no signup, no password.
- The browser asks for location permission and a search radius (500m–20km).
- The server keeps everyone's last known lat/lng in memory and, every 3
  seconds, recalculates who and what is within each user's chosen radius
  (Haversine distance) and pushes it over a WebSocket.
- Anyone can open a room, which becomes visible to nearby users in real
  time. Chat inside a room is broadcast over Socket.io.
- Every room is deleted automatically 2 hours after creation — messages,
  membership, everything.

Nothing is persisted to disk. Restarting the server clears all users and
rooms — this is intentional for a prototype but would need Redis/Postgres
(with PostGIS for the geo queries) if you deploy this for real, especially
once you run more than one server process.

## Project layout

```
alap-app/
  server/   Node + Express + Socket.io backend
  client/   React (Vite) frontend
```

## Running it locally

You'll need Node.js 18+ installed.

**1. Start the backend**

```bash
cd server
npm install
npm run dev
```

This runs on `http://localhost:4000`. Check `http://localhost:4000/health`
to confirm it's alive.

**2. Start the frontend** (in a second terminal)

```bash
cd client
npm install
npm run dev
```

This runs on `http://localhost:5173`. Open it in two different browser
tabs/windows (or two devices on the same network) to simulate two users
finding each other.

> Browsers only allow geolocation over `https://` or `localhost`, so
> testing on `localhost` works out of the box. If you test across two real
> devices, you'll need HTTPS or a browser flag — see note below.

## Testing "nearby" locally

Since your two test browser tabs will report the *same* real GPS location,
they'll always be "0m" apart — which is fine for verifying the whole flow
works. To simulate two people in different places:

- Chrome DevTools → `⋮` → More tools → **Sensors** → set a custom
  latitude/longitude per tab.
- Or temporarily hardcode different `lat`/`lng` values in
  `LocationSetup.jsx` for quick testing.

## Environment variables

- `client`: set `VITE_SERVER_URL` if your backend isn't on
  `http://localhost:4000`.
- `server`: set `PORT` to change the server's port.

## Where to take this next

- Swap in-memory `Map`s for Redis (presence/nearby) + Postgres/PostGIS
  (rooms, geo radius queries) once you need more than one server process.
- Add a map view (Mapbox/Leaflet) instead of a plain list for nearby
  people/rooms.
- Add moderation (report/block, profanity filter) before any public launch
  — anonymous + location-based chat needs this from day one.
- Rate-limit `send-message` and `create-room` per socket to prevent spam.
- Add reconnection handling so a dropped WebSocket doesn't silently boot
  someone from their room.
