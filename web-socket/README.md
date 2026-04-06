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

## Default local setup

- Backend API: `http://localhost:5001`
- WebSocket service: `http://localhost:5003`
- Frontend Vite app: `http://localhost:5173`

## Internal emit endpoint

The backend sends real-time events to this service using:

- `POST /emit`

If `EMIT_AUTH_TOKEN` is set, the backend must send the same value in the
`x-socket-token` header.
