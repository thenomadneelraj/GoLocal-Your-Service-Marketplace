import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useMaintenance } from "./MaintenanceContext";
import { disconnectSocket, initiateSocketConnection } from "@/lib/socket";

const WebSocketContext = createContext(null);

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
  CONTACT_MESSAGE_CREATED: "contact_message_created",
};

export function WebSocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { platformName } = useMaintenance(); // kept for backward compatibility (may be used by older screens)

  const socketRef = useRef(null);

  // Event listeners registry: eventName -> callbacks[]
  const listenersRef = useRef(new Map());

  const [socketVersion, setSocketVersion] = useState(0); // bumps to re-run listener wiring
  const [isConnected, setIsConnected] = useState(false);

  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event).push(callback);

    return () => {
      const eventListeners = listenersRef.current.get(event);
      if (!eventListeners) return;

      const index = eventListeners.indexOf(callback);
      if (index > -1) eventListeners.splice(index, 1);
    };
  }, []);

  const unsubscribe = useCallback((callback) => {
    listenersRef.current.forEach((eventListeners, eventName) => {
      const index = eventListeners.indexOf(callback);
      if (index > -1) eventListeners.splice(index, 1);
      if (!eventListeners.length) listenersRef.current.delete(eventName);
    });
  }, []);

  const dispatchToCallbacks = useCallback((eventName, payload) => {
    const eventListeners = listenersRef.current.get(eventName) || [];
    eventListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        // Never break other listeners
        console.error(`[WebSocket] listener for ${eventName} failed:`, err);
      }
    });
  }, []);

  const connect = useCallback(() => {
    // Reset current socket
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
    }

    const userId = user?._id ? String(user._id) : "";
    const role = user?.role ? String(user.role) : "";

    if (!userId) {
      setIsConnected(false);
      return;
    }

    const instance = initiateSocketConnection({ id: userId, role });
    socketRef.current = instance;

    if (instance?.connected) setIsConnected(true);

    // Update connection state on changes
    instance?.on?.("connect", () => setIsConnected(true));
    instance?.on?.("disconnect", () => setIsConnected(false));

    setSocketVersion((v) => v + 1);
  }, [user]);

  const disconnect = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
    setIsConnected(false);
    setSocketVersion((v) => v + 1);
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      connect();
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [isAuthenticated, user?._id, connect, disconnect]);

  // Wire socket event listeners once per socket instance
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onBookingCreated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.BOOKING_CREATED, payload);

    const onBookingUpdated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.BOOKING_UPDATED, payload);

    const onBookingStatusUpdate = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.BOOKING_UPDATED, payload);

    const onMessageSent = (payload) => {
      dispatchToCallbacks(SOCKET_EVENTS.MESSAGE_SENT, payload);
    };

    const onMessageNew = (payload) => {
      dispatchToCallbacks(SOCKET_EVENTS.MESSAGE_SENT, payload);
    };

    const onMessageRead = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.MESSAGE_READ, payload);

    const onMessageReadLegacy = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.MESSAGE_READ, payload);

    const onTransactionCreated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.TRANSACTION_CREATED, payload);

    const onPaymentCompleted = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.PAYMENT_COMPLETED, payload);

    const onDisputeCreated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.DISPUTE_CREATED, payload);

    const onDisputeCreatedLegacy = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.DISPUTE_CREATED, payload);

    const onUserUpdated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.USER_UPDATED, payload);

    const onUserStatusUpdated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.USER_STATUS_UPDATED, payload);

    const onNotificationCreated = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.NOTIFICATION_CREATED, payload);

    const onNotificationNew = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.NOTIFICATION_CREATED, payload);

    const onNotificationRead = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.NOTIFICATION_READ, payload);

    const onNotificationReadLegacy = (payload) =>
      dispatchToCallbacks(SOCKET_EVENTS.NOTIFICATION_READ, payload);

    // Attach listeners
    socket.on("booking_created", onBookingCreated);
    socket.on("booking_updated", onBookingUpdated);
    socket.on("bookingStatusUpdate", onBookingStatusUpdate);

    socket.on("message_sent", onMessageSent);
    socket.on("message:new", onMessageNew);
    socket.on("message_read", onMessageRead);
    socket.on("message:read", onMessageReadLegacy);

    socket.on("transaction_created", onTransactionCreated);
    socket.on("payment_completed", onPaymentCompleted);

    socket.on("dispute_created", onDisputeCreated);
    socket.on("dispute:created", onDisputeCreatedLegacy);

    socket.on("user_updated", onUserUpdated);
    socket.on("user_status_updated", onUserStatusUpdated);

    socket.on("notification_created", onNotificationCreated);
    socket.on("notification:new", onNotificationNew);
    socket.on("notification_read", onNotificationRead);
    socket.on("notification:read", onNotificationReadLegacy);

    return () => {
      // Detach listeners to prevent duplication when reconnecting
      socket.off("booking_created", onBookingCreated);
      socket.off("booking_updated", onBookingUpdated);
      socket.off("bookingStatusUpdate", onBookingStatusUpdate);

      socket.off("message_sent", onMessageSent);
      socket.off("message:new", onMessageNew);
      socket.off("message_read", onMessageRead);
      socket.off("message:read", onMessageReadLegacy);

      socket.off("transaction_created", onTransactionCreated);
      socket.off("payment_completed", onPaymentCompleted);

      socket.off("dispute_created", onDisputeCreated);
      socket.off("dispute:created", onDisputeCreatedLegacy);

      socket.off("user_updated", onUserUpdated);
      socket.off("user_status_updated", onUserStatusUpdated);

      socket.off("notification_created", onNotificationCreated);
      socket.off("notification:new", onNotificationNew);
      socket.off("notification_read", onNotificationRead);
      socket.off("notification:read", onNotificationReadLegacy);
    };
  }, [socketVersion, dispatchToCallbacks]);

  const emit = useCallback((event, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
      return true;
    }
    console.warn("[WebSocket] Cannot emit, not connected");
    return false;
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    lastMessage: null, // maintained shape; currently not tracked
    subscribe,
    unsubscribe,
    emit,
    isUserOnline: () => false, // online tracking not currently implemented in this context
    onlineUsers: new Set(),
    SOCKET_EVENTS,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

// Custom hook for specific event types
export function useSocketEvent(event, callback) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, subscribe]);
}

// Hook for booking updates
export function useBookingUpdates(onBookingUpdate) {
  const { subscribe, SOCKET_EVENTS } = useWebSocket();

  useEffect(() => {
    const unsubscribeCreated = subscribe(
      SOCKET_EVENTS.BOOKING_CREATED,
      onBookingUpdate,
    );
    const unsubscribeUpdated = subscribe(
      SOCKET_EVENTS.BOOKING_UPDATED,
      onBookingUpdate,
    );

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [onBookingUpdate, subscribe, SOCKET_EVENTS]);
}

// Hook for notification updates
export function useNotificationUpdates(onNotificationUpdate) {
  const { subscribe, SOCKET_EVENTS } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(
      SOCKET_EVENTS.NOTIFICATION_CREATED,
      onNotificationUpdate,
    );
    return unsubscribe;
  }, [onNotificationUpdate, subscribe, SOCKET_EVENTS]);
}

// Hook for message updates
export function useMessageUpdates(onMessageUpdate) {
  const { subscribe, SOCKET_EVENTS } = useWebSocket();

  useEffect(() => {
    const unsubscribeSent = subscribe(
      SOCKET_EVENTS.MESSAGE_SENT,
      onMessageUpdate,
    );
    const unsubscribeRead = subscribe(
      SOCKET_EVENTS.MESSAGE_READ,
      onMessageUpdate,
    );

    return () => {
      unsubscribeSent();
      unsubscribeRead();
    };
  }, [onMessageUpdate, subscribe, SOCKET_EVENTS]);
}

// Hook for transaction/payment updates
export function usePaymentUpdates(onPaymentUpdate) {
  const { subscribe, SOCKET_EVENTS } = useWebSocket();

  useEffect(() => {
    const unsubscribeTransaction = subscribe(
      SOCKET_EVENTS.TRANSACTION_CREATED,
      onPaymentUpdate,
    );
    const unsubscribePayment = subscribe(
      SOCKET_EVENTS.PAYMENT_COMPLETED,
      onPaymentUpdate,
    );

    return () => {
      unsubscribeTransaction();
      unsubscribePayment();
    };
  }, [onPaymentUpdate, subscribe, SOCKET_EVENTS]);
}

export default WebSocketContext;
