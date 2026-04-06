require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 5003);
const EMIT_AUTH_TOKEN = String(process.env.EMIT_AUTH_TOKEN || "").trim();

const SOCKET_EVENTS = {
  BOOKING_UPDATED: "booking_updated",
  MESSAGE_SENT: "message_sent",
  MESSAGE_READ: "message_read",
  NOTIFICATION_CREATED: "notification_created",
  NOTIFICATION_READ: "notification_read",
};

const LEGACY_EVENT_ALIASES = {
  [SOCKET_EVENTS.BOOKING_UPDATED]: ["bookingStatusUpdate"],
  [SOCKET_EVENTS.MESSAGE_SENT]: ["message:new"],
  [SOCKET_EVENTS.MESSAGE_READ]: ["message:read"],
  [SOCKET_EVENTS.NOTIFICATION_CREATED]: ["notification:new"],
  [SOCKET_EVENTS.NOTIFICATION_READ]: ["notification:read"],
};

const toIdString = (value) => String(value || "");
const getUserRoom = (userId) => `user_${toIdString(userId)}`;
const getConversationRoom = (conversationId) =>
  `conversation_${toIdString(conversationId)}`;

const parseAllowedOrigins = () =>
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const allowedOrigins = parseAllowedOrigins();

const allowRequestOrigin = (origin, callback) => {
  if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
};

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: allowRequestOrigin,
    methods: ["GET", "POST"],
  })
);
app.use(express.json({ limit: "5mb" }));

const io = new Server(server, {
  cors: {
    origin: allowRequestOrigin,
    methods: ["GET", "POST"],
  },
});

const resolveEventNames = (eventName, includeLegacyAliases = true) => {
  const names = includeLegacyAliases
    ? [eventName, ...(LEGACY_EVENT_ALIASES[eventName] || [])]
    : [eventName];

  return [...new Set(names.filter(Boolean))];
};

const emitSocketEvent = ({
  userIds = [],
  conversationIds = [],
  eventName,
  payload,
  includeLegacyAliases = true,
} = {}) => {
  const names = resolveEventNames(eventName, includeLegacyAliases);
  const uniqueUserIds = [...new Set(userIds.map(toIdString).filter(Boolean))];
  const uniqueConversationIds = [
    ...new Set(conversationIds.map(toIdString).filter(Boolean)),
  ];

  uniqueUserIds.forEach((userId) => {
    names.forEach((name) => {
      io.to(userId).emit(name, payload);
      io.to(getUserRoom(userId)).emit(name, payload);
    });
  });

  uniqueConversationIds.forEach((conversationId) => {
    names.forEach((name) => {
      io.to(getConversationRoom(conversationId)).emit(name, payload);
    });
  });

  return {
    eventNames: names,
    userRoomCount: uniqueUserIds.length,
    conversationRoomCount: uniqueConversationIds.length,
  };
};

const requireEmitToken = (req, res, next) => {
  if (!EMIT_AUTH_TOKEN) {
    next();
    return;
  }

  const providedToken = String(req.get("x-socket-token") || "").trim();

  if (providedToken !== EMIT_AUTH_TOKEN) {
    res.status(401).json({
      success: false,
      message: "Unauthorized emit request.",
    });
    return;
  }

  next();
};

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GoLocal web-socket service is running.",
    port: PORT,
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    port: PORT,
  });
});

// Internal bridge used by the backend API to publish real-time events.
app.post("/emit", requireEmitToken, (req, res) => {
  const { eventName } = req.body || {};

  if (!eventName) {
    res.status(400).json({
      success: false,
      message: "eventName is required.",
    });
    return;
  }

  const result = emitSocketEvent(req.body || {});

  res.status(202).json({
    success: true,
    data: result,
  });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (payload) => {
    const userId =
      typeof payload === "object" && payload !== null
        ? payload.userId
        : payload;
    const conversationIds = Array.isArray(payload?.conversationIds)
      ? payload.conversationIds
      : [];

    if (userId) {
      socket.join(String(userId));
      socket.join(getUserRoom(userId));
      console.log(`User ${userId} joined personal rooms`);
    }

    conversationIds.forEach((conversationId) => {
      socket.join(getConversationRoom(conversationId));
    });
  });

  socket.on("join:conversation", (conversationId) => {
    if (!conversationId) {
      return;
    }

    socket.join(getConversationRoom(conversationId));
  });

  socket.on("leave:conversation", (conversationId) => {
    if (!conversationId) {
      return;
    }

    socket.leave(getConversationRoom(conversationId));
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket service running on port ${PORT}`);
});
