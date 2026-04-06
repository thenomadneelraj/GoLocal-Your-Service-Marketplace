import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;

  if (configuredSocketUrl) {
    try {
      return new URL(configuredSocketUrl).origin;
    } catch {
      return configuredSocketUrl;
    }
  }

  const configuredBase =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

  if (configuredBase) {
    try {
      return new URL(configuredBase).origin;
    } catch {
      return configuredBase;
    }
  }

  return window.location.origin;
};

const SOCKET_URL = resolveSocketUrl();

let socket;
let activeConsumers = 0;
let disconnectTimer = null;
let joinedUserId = "";
const DISCONNECT_GRACE_MS = 350;

const clearPendingDisconnect = () => {
	if (disconnectTimer) {
		window.clearTimeout(disconnectTimer);
		disconnectTimer = null;
	}
};

const ensureSocket = () => {
	if (!socket) {
		socket = io(SOCKET_URL, {
			autoConnect: false,
			transports: ["websocket", "polling"],
		});

		socket.on("connect", () => {
			if (joinedUserId) {
				socket.emit("join", { userId: joinedUserId });
			}
		});
	}

	clearPendingDisconnect();

	if (!socket.connected && !socket.active) {
		socket.connect();
	}

	return socket;
};

export const initiateSocketConnection = (userId) => {
	activeConsumers += 1;
	const instance = ensureSocket();

	if (userId) {
		joinedUserId = String(userId);
		if (instance.connected) {
			instance.emit("join", { userId: joinedUserId });
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
	socket.on("user_status_updated", handler);

	return () => {
		socket?.off("user_status_updated", handler);
	};
};

export const getSocket = () => socket;
