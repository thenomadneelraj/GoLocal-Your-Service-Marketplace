const SOCKET_EVENTS = {
  BOOKING_CREATED: "booking_created",
  BOOKING_UPDATED: "booking_updated",
  MESSAGE_SENT: "message_sent",
  MESSAGE_READ: "message_read",
  TRANSACTION_CREATED: "transaction_created",
  PAYMENT_COMPLETED: "payment_completed",
  DISPUTE_CREATED: "dispute_created",
  DISPUTE_UPDATED: "dispute_updated",
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

const toIdString = (value) => String(value || "");
const getUserRoom = (userId) => `user_${toIdString(userId)}`;
const getBookingRoom = (bookingId) => `booking_${toIdString(bookingId)}`;

const SOCKET_SERVICE_URL = String(
  process.env.WEBSOCKET_SERVICE_URL || "http://localhost:5003",
).trim();
const SOCKET_SERVICE_TOKEN = String(
  process.env.WEBSOCKET_SERVICE_TOKEN || "",
).trim();
const SOCKET_EMIT_TIMEOUT_MS = Number(
  process.env.SOCKET_EMIT_TIMEOUT_MS || 3000,
);

const resolveEmitUrl = () => {
  if (!SOCKET_SERVICE_URL) {
    return "";
  }

  return SOCKET_SERVICE_URL.endsWith("/emit")
    ? SOCKET_SERVICE_URL
    : `${SOCKET_SERVICE_URL.replace(/\/+$/, "")}/emit`;
};

const postSocketEvent = async (body) => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this Node runtime.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOCKET_EMIT_TIMEOUT_MS);

  try {
    const response = await fetch(resolveEmitUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SOCKET_SERVICE_TOKEN
          ? { "x-socket-token": SOCKET_SERVICE_TOKEN }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `WebSocket service responded with ${response.status}${
          errorBody ? `: ${errorBody}` : ""
        }`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
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
  if (!eventName) {
    return;
  }

  const requestBody = {
    userIds: [...new Set(userIds.map(toIdString).filter(Boolean))],
    conversationIds: [
      ...new Set(conversationIds.map(toIdString).filter(Boolean)),
    ],
    bookingIds: [...new Set(bookingIds.map(toIdString).filter(Boolean))],
    room,
    rooms,
    eventName,
    payload,
    includeLegacyAliases,
  };

  void postSocketEvent(requestBody).catch((error) => {
    console.error(`Socket emit failed for ${eventName}:`, error.message);
  });
};

module.exports = {
  SOCKET_EVENTS,
  getUserRoom,
  getBookingRoom,
  emitSocketEvent,
};
