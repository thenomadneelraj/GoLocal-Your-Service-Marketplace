# GoLocal Web Socket Service

This folder contains the standalone Socket.IO service for GoLocal.

## Run

```bash
npm install
npm run start
```

For development with auto-restart:

```bash
npm run server
```

Startup now uses the root `server.js` entrypoint, so the console output shows:

```text
==================================================
WebSocket server running on http://localhost:5003
Health check: http://localhost:5003/health
Stats: http://localhost:5003/stats
==================================================
```

## Default local setup

- Backend API: `http://localhost:5001`
- WebSocket service: `http://localhost:5003`
- Frontend Vite app: `http://localhost:5173`

The frontend now auto-targets `http://localhost:5003` during local development
when no explicit `VITE_SOCKET_URL` is provided, so running this folder with
`npm run start` is enough for the standalone socket service side.

## Available endpoints

- `GET /health`
- `GET /stats`
- `POST /emit`

## Socket handshake

The client now sends `user_id` and `role` during the Socket.IO handshake, so
the server can log connection attempts and auto-join role, notification, and
default booking update rooms.

## Internal emit endpoint

The backend sends real-time events to this service using:

- `POST /emit`

If `EMIT_AUTH_TOKEN` is set, the backend must send the same value in the
`x-socket-token` header.

`POST /emit` accepts both the current GoLocal payload shape and room-based
payloads such as:

```json
{
  "room": "booking_22",
  "event": "receive_message",
  "data": {
    "message": "Hello"
  }
}
```
