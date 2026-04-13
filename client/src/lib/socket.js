import { io } from "socket.io-client";

const DEFAULT_SOCKET_PORT = "5003";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const normalizeRole = (value) => String(value || "").trim().toLowerCase();

const normalizeUrlOrigin = (value, fallbackOrigin = window.location.origin) => {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, fallbackOrigin).origin;
  } catch {
    return String(value).trim();
  }
};

const inferLocalSocketOrigin = (value) => {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value, window.location.origin);

    if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
      return "";
    }

    parsed.port =
      import.meta.env.VITE_SOCKET_PORT || parsed.port || DEFAULT_SOCKET_PORT;

    if (!parsed.port || parsed.port === window.location.port) {
      parsed.port = DEFAULT_SOCKET_PORT;
    }

    return parsed.origin;
  } catch {
    return "";
  }
};

const resolveSocketUrl = () => {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const configuredSocketPort =
    import.meta.env.VITE_SOCKET_PORT || DEFAULT_SOCKET_PORT;

  if (configuredSocketUrl) {
    return normalizeUrlOrigin(configuredSocketUrl);
  }

  const configuredBase =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

  if (configuredBase) {
    const inferredLocalSocketOrigin = inferLocalSocketOrigin(configuredBase);

    if (inferredLocalSocketOrigin) {
      return inferredLocalSocketOrigin;
    }

    return normalizeUrlOrigin(configuredBase);
  }

  if (LOCAL_HOSTNAMES.has(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:${configuredSocketPort}`;
  }

  return window.location.origin;
};

const SOCKET_URL = resolveSocketUrl();

let socket;
let activeConsumers = 0;
let disconnectTimer = null;
let joinedUserId = "";
let joinedUserRole = "";
const DISCONNECT_GRACE_MS = 350;

const resolveSocketIdentity = (userOrId, explicitRole = "") => {
	const isObjectInput =
		typeof userOrId === "object" && userOrId !== null && !Array.isArray(userOrId);

	return {
		userId: String(
			isObjectInput ? userOrId.id ?? userOrId.userId ?? "" : userOrId ?? ""
		).trim(),
		role: normalizeRole(isObjectInput ? userOrId.role : explicitRole),
	};
};

const applySocketAuth = () => {
	if (!socket) {
		return;
	}

	// Get the JWT token from sessionStorage
	const token = sessionStorage.getItem("token");

	socket.auth = {
		...(token ? { token } : {}),
		...(joinedUserId ? { user_id: joinedUserId } : {}),
		...(joinedUserRole ? { role: joinedUserRole } : {}),
	};
};

const clearPendingDisconnect = () => {
	if (disconnectTimer) {
		window.clearTimeout(disconnectTimer);
		disconnectTimer = null;
	}
};

const ensureSocket = () => {
	if (!socket) {
		// Get the JWT token from sessionStorage
		const token = sessionStorage.getItem("token");
		
		socket = io(SOCKET_URL, {
			autoConnect: false,
			transports: ["websocket", "polling"],
			auth: {
				token: token || undefined,
				user_id: joinedUserId || undefined,
				role: joinedUserRole || undefined,
			},
		});

		socket.on("connect", () => {
			if (joinedUserId) {
				socket.emit("join", {
					userId: joinedUserId,
					role: joinedUserRole,
				});
			}
		});

		socket.on("connect_error", (error) => {
			console.error("Socket connection error:", error.message);
		});
	}

	applySocketAuth();
	clearPendingDisconnect();

	if (!socket.connected && !socket.active) {
		socket.connect();
	}

	return socket;
};

export const initiateSocketConnection = (userOrId, role = "") => {
	activeConsumers += 1;
	const identity = resolveSocketIdentity(userOrId, role);

	if (identity.userId) {
		joinedUserId = identity.userId;
	}

	if (identity.role) {
		joinedUserRole = identity.role;
	}

	const instance = ensureSocket();

	if (joinedUserId) {
		if (instance.connected) {
			instance.emit("join", {
				userId: joinedUserId,
				role: joinedUserRole,
			});
		}
	}

	return instance;
};

export const disconnectSocket = () => {
	activeConsumers = Math.max(0, activeConsumers - 1);

	if (!socket || activeConsumers > 0) {
		return;
	}

	clearPendingDisconnect();

	disconnectTimer = window.setTimeout(() => {
		if (!socket || activeConsumers > 0) {
			return;
		}

		socket.disconnect();
		socket = null;
		joinedUserId = "";
		joinedUserRole = "";
		disconnectTimer = null;
	}, DISCONNECT_GRACE_MS);
};

export const subscribeToBookingUpdates = (cb) => {
	if (!socket) return () => {};

	const handler = (data) => cb(null, data);
	socket.on("booking_updated", handler);
	socket.on("booking_created", handler);
	socket.on("bookingStatusUpdate", handler);

	return () => {
		socket?.off("booking_updated", handler);
		socket?.off("booking_created", handler);
		socket?.off("bookingStatusUpdate", handler);
	};
};

export const subscribeToNewMessages = (cb) => {
	if (!socket) return () => {};

	const handler = (data) => cb(null, data);
	socket.on("message_sent", handler);
	socket.on("message:new", handler);

	return () => {
		socket?.off("message_sent", handler);
		socket?.off("message:new", handler);
	};
};

export const subscribeToReadReceipts = (cb) => {
	if (!socket) return () => {};

	const handler = (data) => cb(null, data);
	socket.on("message_read", handler);
	socket.on("message:read", handler);

	return () => {
		socket?.off("message_read", handler);
		socket?.off("message:read", handler);
	};
};

export const subscribeToNotifications = (cb) => {
  if (!socket) return () => {};

	const handler = (data) => cb(null, data);
	socket.on("notification_created", handler);
	socket.on("notification:new", handler);

	return () => {
		socket?.off("notification_created", handler);
		socket?.off("notification:new", handler);
  };
};

export const subscribeToTransactions = (cb) => {
  if (!socket) return () => {};

  const handler = (data) => cb(null, data);
  socket.on("transaction_created", handler);
  socket.on("payment_completed", handler);

  return () => {
    socket?.off("transaction_created", handler);
    socket?.off("payment_completed", handler);
  };
};

export const subscribeToDisputes = (cb) => {
  if (!socket) return () => {};

  const handler = (data) => cb(null, data);
  socket.on("dispute_created", handler);
  socket.on("dispute:created", handler);

  return () => {
    socket?.off("dispute_created", handler);
    socket?.off("dispute:created", handler);
  };
};

export const subscribeToNotificationReads = (cb) => {
	if (!socket) return () => {};

	const handler = (data) => cb(null, data);
	socket.on("notification_read", handler);
	socket.on("notification:read", handler);

	return () => {
		socket?.off("notification_read", handler);
		socket?.off("notification:read", handler);
	};
};

export const subscribeToUserStatusUpdates = (cb) => {
  if (!socket) return () => {};

  const handler = (data) => cb(null, data);
  socket.on("user_updated", handler);
  socket.on("user_status_updated", handler);

  return () => {
    socket?.off("user_updated", handler);
    socket?.off("user_status_updated", handler);
  };
};

export const subscribeToProviderUpdates = (cb) => {
  if (!socket) return () => {};

  const handler = (data) => cb(null, data);
  socket.on("providers_updated", handler);

  return () => {
    socket?.off("providers_updated", handler);
  };
};

export const getSocket = () => socket;
