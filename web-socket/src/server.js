require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 5003);
const EMIT_AUTH_TOKEN = String(process.env.EMIT_AUTH_TOKEN || "").trim();
const DEFAULT_BOOKING_SCOPE = String(
  process.env.DEFAULT_BOOKING_SCOPE || "0"
).trim();

const SOCKET_EVENTS = {
  BOOKING_CREATED: "booking_created",
  BOOKING_UPDATED: "booking_updated",
  MESSAGE_SENT: "message_sent",
  MESSAGE_READ: "message_read",
  TRANSACTION_CREATED: "transaction_created",
  DISPUTE_CREATED: "dispute_created",
  USER_UPDATED: "user_updated",
  USER_STATUS_UPDATED: "user_status_updated",
  NOTIFICATION_CREATED: "notification_created",
  NOTIFICATION_READ: "notification_read",
};

const LEGACY_EVENT_ALIASES = {
  [SOCKET_EVENTS.BOOKING_UPDATED]: ["bookingStatusUpdate"],
  [SOCKET_EVENTS.MESSAGE_SENT]: ["message:new"],
  [SOCKET_EVENTS.MESSAGE_READ]: ["message:read"],
  [SOCKET_EVENTS.USER_UPDATED]: [SOCKET_EVENTS.USER_STATUS_UPDATED],
  [SOCKET_EVENTS.NOTIFICATION_CREATED]: ["notification:new"],
  [SOCKET_EVENTS.NOTIFICATION_READ]: ["notification:read"],
};

const toIdString = (value) => String(value || "").trim();
const normalizeRole = (value) => String(value || "").trim().toLowerCase();

const getUserRoom = (userId) => `user_${toIdString(userId)}`;
const getRoleRoom = (role) => `role_${normalizeRole(role) || "user"}`;
const getNotificationRoom = (userId) => `notifications_${toIdString(userId)}`;
const getAdminNotificationRoom = () => "notifications_admin";
const getConversationRoom = (conversationId) =>
  `conversation_${toIdString(conversationId)}`;
const getBookingRoom = (bookingId = DEFAULT_BOOKING_SCOPE) =>
  `booking_${toIdString(bookingId) || DEFAULT_BOOKING_SCOPE}`;

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

const runtimeStats = {
  startedAt: new Date().toISOString(),
  connectionAttempts: 0,
  totalConnections: 0,
  totalDisconnects: 0,
  totalHttpEmits: 0,
};

const connectedUsers = new Map();

const resolveEventNames = (eventName, includeLegacyAliases = true) => {
  const names = includeLegacyAliases
    ? [eventName, ...(LEGACY_EVENT_ALIASES[eventName] || [])]
    : [eventName];

  return [...new Set(names.filter(Boolean))];
};

const emitToRooms = (roomNames = [], eventName, payload) => {
  const uniqueRooms = [...new Set(roomNames.map(toIdString).filter(Boolean))];

  if (!uniqueRooms.length) {
    return 0;
  }

  let emitter = io.to(uniqueRooms[0]);
  uniqueRooms.slice(1).forEach((roomName) => {
    emitter = emitter.to(roomName);
  });
  emitter.emit(eventName, payload);

  return uniqueRooms.length;
};

const emitSocketEvent = ({
  userIds = [],
  conversationIds = [],
  bookingIds = [],
  room = "",
  rooms = [],
  eventName,
  payload,
  includeLegacyAliases = true,
} = {}) => {
  const names = resolveEventNames(eventName, includeLegacyAliases);
  const directRooms = [
    ...new Set(
      [
        room,
        ...(Array.isArray(rooms) ? rooms : []),
        ...bookingIds.map((bookingId) => getBookingRoom(bookingId)),
      ]
        .map(toIdString)
        .filter(Boolean)
    ),
  ];
  const userRooms = [...new Set(userIds.map(toIdString).filter(Boolean))].flatMap(
    (userId) => [userId, getUserRoom(userId)]
  );
  const conversationRooms = [
    ...new Set(conversationIds.map(toIdString).filter(Boolean)),
  ].map((conversationId) => getConversationRoom(conversationId));
  const allRooms = [...new Set([...directRooms, ...userRooms, ...conversationRooms])];

  names.forEach((name) => {
    emitToRooms(allRooms, name, payload);
  });

  return {
    eventNames: names,
    roomCount: allRooms.length,
    directRoomCount: directRooms.length,
    userRoomCount: userRooms.length,
    conversationRoomCount: conversationRooms.length,
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

const getHandshakeValue = (socket, keys = []) => {
  const auth = socket.handshake?.auth || {};
  const query = socket.handshake?.query || {};

  for (const key of keys) {
    const authValue = auth[key];
    if (authValue !== undefined && authValue !== null && authValue !== "") {
      return authValue;
    }

    const queryValue = query[key];
    if (queryValue !== undefined && queryValue !== null && queryValue !== "") {
      return queryValue;
    }
  }

  return "";
};

const getSocketLabel = (socket) => {
  const userId = toIdString(socket.data?.userId);
  return userId || "guest";
};

const joinRoomWithLog = (socket, roomName, message) => {
  if (!roomName) {
    return;
  }

  socket.join(roomName);

  if (message) {
    console.log(message);
  }
};

const leaveRoomWithLog = (socket, roomName, message) => {
  if (!roomName) {
    return;
  }

  socket.leave(roomName);

  if (message) {
    console.log(message);
  }
};

const markUserOnline = (userId, socketId, role) => {
  if (!userId) {
    return false;
  }

  const existing =
    connectedUsers.get(userId) || { role: normalizeRole(role), socketIds: new Set() };
  const wasOffline = existing.socketIds.size === 0;

  existing.role = normalizeRole(role) || existing.role || "user";
  existing.socketIds.add(socketId);
  connectedUsers.set(userId, existing);

  return wasOffline;
};

const markUserOffline = (userId, socketId) => {
  if (!userId || !connectedUsers.has(userId)) {
    return false;
  }

  const current = connectedUsers.get(userId);
  current.socketIds.delete(socketId);

  if (current.socketIds.size > 0) {
    connectedUsers.set(userId, current);
    return false;
  }

  connectedUsers.delete(userId);
  return true;
};

const getRoomStats = () =>
  [...io.sockets.adapter.rooms.entries()]
    .filter(([roomName]) => !io.sockets.sockets.has(roomName))
    .map(([roomName, sockets]) => ({
      room: roomName,
      size: sockets.size,
    }))
    .sort((left, right) => right.size - left.size);

const assignSocketIdentity = (socket, payload = {}) => {
  const nextUserId = toIdString(payload.userId || payload.user_id || socket.data?.userId);
  const nextRole = normalizeRole(payload.role || socket.data?.role || "user");

  if (!nextUserId) {
    return { userId: "", role: nextRole };
  }

  if (!socket.data?.userId) {
    socket.data.userId = nextUserId;
    socket.data.role = nextRole;
    socket.join(nextUserId);
    socket.join(getUserRoom(nextUserId));
  }

  return { userId: nextUserId, role: nextRole };
};

const joinRoleScopedRooms = (socket, userId, role, bookingScope) => {
  if (!userId) {
    return;
  }

  const normalizedRole = normalizeRole(role) || "user";
  socket.data.userId = userId;
  socket.data.role = normalizedRole;

  socket.join(userId);
  socket.join(getUserRoom(userId));

  if (normalizedRole === "provider") {
    joinRoomWithLog(
      socket,
      getRoleRoom("provider"),
      `User ${userId} auto-joined provider room`
    );
  } else if (normalizedRole === "client") {
    joinRoomWithLog(
      socket,
      getRoleRoom("client"),
      `User ${userId} auto-joined client room`
    );
  } else if (normalizedRole === "admin") {
    joinRoomWithLog(
      socket,
      getRoleRoom("admin"),
      `User ${userId} auto-joined admin room`
    );
  } else {
    joinRoomWithLog(
      socket,
      getRoleRoom(normalizedRole),
      `User ${userId} auto-joined user room`
    );
  }

  const isNowOnline = markUserOnline(userId, socket.id, normalizedRole);
  if (isNowOnline) {
    console.log(`User ${userId} is now online`);
  }

  joinRoomWithLog(
    socket,
    getNotificationRoom(userId),
    `User ${userId} joined notification room`
  );

  if (normalizedRole === "admin") {
    joinRoomWithLog(
      socket,
      getAdminNotificationRoom(),
      "User joined admin notification room"
    );
  }

  const bookingRoom = getBookingRoom(bookingScope);
  joinRoomWithLog(
    socket,
    bookingRoom,
    `User ${userId} (${normalizedRole}) joined booking updates room ${bookingRoom}`
  );
};

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GoLocal web-socket service is running.",
    port: PORT,
    statsUrl: `http://localhost:${PORT}/stats`,
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    port: PORT,
    connectedUsers: connectedUsers.size,
    connectedSockets: io.engine.clientsCount,
  });
});

app.get("/stats", (req, res) => {
  res.json({
    success: true,
    data: {
      port: PORT,
      startedAt: runtimeStats.startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      connectionAttempts: runtimeStats.connectionAttempts,
      totalConnections: runtimeStats.totalConnections,
      totalDisconnects: runtimeStats.totalDisconnects,
      totalHttpEmits: runtimeStats.totalHttpEmits,
      connectedUsers: connectedUsers.size,
      connectedSockets: io.engine.clientsCount,
      rooms: getRoomStats(),
    },
  });
});

app.post("/emit", requireEmitToken, (req, res) => {
  const eventName = String(req.body?.eventName || req.body?.event || "").trim();
  const payload =
    req.body?.payload !== undefined ? req.body.payload : req.body?.data;

  if (!eventName) {
    res.status(400).json({
      success: false,
      message: "eventName or event is required.",
    });
    return;
  }

  const roomNames = [
    req.body?.room,
    ...(Array.isArray(req.body?.rooms) ? req.body.rooms : []),
  ]
    .map(toIdString)
    .filter(Boolean);

  roomNames.forEach((roomName) => {
    console.log(`[HTTP-emit] room=${roomName} event=${eventName}`);
  });

  runtimeStats.totalHttpEmits += 1;

  const result = emitSocketEvent({
    userIds: Array.isArray(req.body?.userIds) ? req.body.userIds : [],
    conversationIds: Array.isArray(req.body?.conversationIds)
      ? req.body.conversationIds
      : [],
    bookingIds: Array.isArray(req.body?.bookingIds) ? req.body.bookingIds : [],
    room: req.body?.room,
    rooms: req.body?.rooms,
    eventName,
    payload,
    includeLegacyAliases: req.body?.includeLegacyAliases !== false,
  });

  res.status(202).json({
    success: true,
    data: result,
  });
});

io.on("connection", (socket) => {
  runtimeStats.connectionAttempts += 1;

  const userId = toIdString(
    getHandshakeValue(socket, ["user_id", "userId", "id"])
  );
  const role = normalizeRole(getHandshakeValue(socket, ["role"])) || "user";
  const bookingScope = toIdString(
    getHandshakeValue(socket, ["booking_scope", "bookingScope"])
  );

  console.log(`Connection attempt: user_id=${userId || "guest"}, role=${role}`);

  if (userId) {
    runtimeStats.totalConnections += 1;
    console.log(`Client connected: ${socket.id} User: ${userId} (${role})`);
    joinRoleScopedRooms(socket, userId, role, bookingScope || DEFAULT_BOOKING_SCOPE);
  } else {
    console.log(`Client connected: ${socket.id}`);
  }

  socket.on("join", (payload) => {
    const resolvedPayload =
      typeof payload === "object" && payload !== null
        ? payload
        : { userId: payload };

    const identity = assignSocketIdentity(socket, resolvedPayload);
    const conversationIds = Array.isArray(resolvedPayload.conversationIds)
      ? resolvedPayload.conversationIds
      : [];
    const bookingIds = Array.isArray(resolvedPayload.bookingIds)
      ? resolvedPayload.bookingIds
      : [];
    const directRooms = [
      resolvedPayload.room,
      ...(Array.isArray(resolvedPayload.rooms) ? resolvedPayload.rooms : []),
    ]
      .map(toIdString)
      .filter(Boolean);

    if (identity.userId && resolvedPayload.role && !socket.data?.role) {
      socket.data.role = normalizeRole(resolvedPayload.role) || "user";
    }

    conversationIds.forEach((conversationId) => {
      const roomName = getConversationRoom(conversationId);
      joinRoomWithLog(
        socket,
        roomName,
        `User ${getSocketLabel(socket)} joined room ${roomName}`
      );
    });

    bookingIds.forEach((bookingId) => {
      const roomName = getBookingRoom(bookingId);
      joinRoomWithLog(
        socket,
        roomName,
        `User ${getSocketLabel(socket)} joined room ${roomName}`
      );
    });

    directRooms.forEach((roomName) => {
      joinRoomWithLog(
        socket,
        roomName,
        `User ${getSocketLabel(socket)} joined room ${roomName}`
      );
    });
  });

  socket.on("join:conversation", (conversationId) => {
    const roomName = getConversationRoom(conversationId);
    if (!conversationId) {
      return;
    }

    joinRoomWithLog(
      socket,
      roomName,
      `User ${getSocketLabel(socket)} joined room ${roomName}`
    );
  });

  socket.on("leave:conversation", (conversationId) => {
    const roomName = getConversationRoom(conversationId);
    if (!conversationId) {
      return;
    }

    leaveRoomWithLog(socket, roomName, `User left room ${roomName}`);
  });

  socket.on("join:booking", (bookingId) => {
    const roomName = getBookingRoom(bookingId);
    if (!bookingId && bookingId !== 0) {
      return;
    }

    joinRoomWithLog(
      socket,
      roomName,
      `User ${getSocketLabel(socket)} joined room ${roomName}`
    );
  });

  socket.on("leave:booking", (bookingId) => {
    const roomName = getBookingRoom(bookingId);
    if (!bookingId && bookingId !== 0) {
      return;
    }

    leaveRoomWithLog(socket, roomName, `User left room ${roomName}`);
  });

  socket.on("join:room", (roomName) => {
    const nextRoom = toIdString(roomName);
    if (!nextRoom) {
      return;
    }

    joinRoomWithLog(
      socket,
      nextRoom,
      `User ${getSocketLabel(socket)} joined room ${nextRoom}`
    );
  });

  socket.on("leave:room", (roomName) => {
    const nextRoom = toIdString(roomName);
    if (!nextRoom) {
      return;
    }

    leaveRoomWithLog(socket, nextRoom, `User left room ${nextRoom}`);
  });

  socket.on("disconnect", (reason) => {
    const disconnectedUserId = toIdString(socket.data?.userId);

    if (disconnectedUserId) {
      const isNowOffline = markUserOffline(disconnectedUserId, socket.id);
      if (isNowOffline) {
        console.log(`User ${disconnectedUserId} is now offline`);
      }
    }

    runtimeStats.totalDisconnects += 1;
    console.log(
      `Client disconnected: ${socket.id} User: ${
        disconnectedUserId || "guest"
      } Reason: ${reason}`
    );
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        "Another WebSocket service may already be running.\n" +
        "Windows: netstat -ano | findstr :PORT\n" +
        "Linux: lsof -i :PORT\n"
    );
    process.exit(1);
  }

  throw error;
});

const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);

  io.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(0), 5000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

server.listen(PORT, () => {
  console.log("==================================================");
  console.log(`WebSocket server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Stats: http://localhost:${PORT}/stats`);
  console.log("==================================================");
});

module.exports = { app, io, server };
