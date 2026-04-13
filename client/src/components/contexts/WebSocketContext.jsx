import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useMaintenance } from "./MaintenanceContext";

const WebSocketContext = createContext(null);

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5003";

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
  const { platformName } = useMaintenance();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Event listeners registry
  const listenersRef = useRef(new Map());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log("[WebSocket] Already connected");
      return;
    }

    if (!isAuthenticated || !user?._id) {
      console.log("[WebSocket] Not authenticated, skipping connection");
      return;
    }

    try {
      const socket = io(SOCKET_SERVER_URL, {
        auth: {
          userId: user._id,
          role: user.role,
          token: localStorage.getItem("token"),
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 10000,
      });

      socket.on("connect", () => {
        console.log("[WebSocket] Connected:", socket.id);
        setIsConnected(true);

        // Join user-specific rooms
        socket.emit("join", {
          userId: user._id,
          role: user.role,
        });
      });

      socket.on("disconnect", (reason) => {
        console.log("[WebSocket] Disconnected:", reason);
        setIsConnected(false);
      });

      socket.on("connect_error", (error) => {
        console.error("[WebSocket] Connection error:", error.message);
        setIsConnected(false);
      });

      // Handle all registered events
      Object.values(SOCKET_EVENTS).forEach((event) => {
        socket.on(event, (payload) => {
          console.log(`[WebSocket] Received ${event}:`, payload);
          setLastMessage({ event, payload, timestamp: new Date() });

          // Notify all listeners for this event
          const eventListeners = listenersRef.current.get(event) || [];
          eventListeners.forEach((callback) => {
            try {
              callback(payload);
            } catch (err) {
              console.error(`[WebSocket] Error in ${event} listener:`, err);
            }
          });

          // Also notify global listeners
          const globalListeners = listenersRef.current.get("*") || [];
          globalListeners.forEach((callback) => {
            try {
              callback({ event, payload, timestamp: new Date() });
            } catch (err) {
              console.error("[WebSocket] Error in global listener:", err);
            }
          });
        });
      });

      // Handle online users
      socket.on("user_online", (userId) => {
        setOnlineUsers((prev) => new Set([...prev, userId]));
      });

      socket.on("user_offline", (userId) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      });

      socketRef.current = socket;
    } catch (error) {
      console.error("[WebSocket] Failed to connect:", error);
    }
  }, [isAuthenticated, user]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Subscribe to events
  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event).push(callback);

    return () => {
      const eventListeners = listenersRef.current.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }, []);

  // Unsubscribe from all events
  const unsubscribe = useCallback((callback) => {
    listenersRef.current.forEach((eventListeners, event) => {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    });
  }, []);

  // Emit events to server (for actions that need to notify others)
  const emit = useCallback((event, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
      return true;
    }
    console.warn("[WebSocket] Cannot emit, not connected");
    return false;
  }, []);

  // Check if a user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user?._id, connect, disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value = {
    socket: socketRef.current,
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    emit,
    isUserOnline,
    onlineUsers,
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
    const unsubscribeCreated = subscribe(SOCKET_EVENTS.BOOKING_CREATED, onBookingUpdate);
    const unsubscribeUpdated = subscribe(SOCKET_EVENTS.BOOKING_UPDATED, onBookingUpdate);

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
    const unsubscribe = subscribe(SOCKET_EVENTS.NOTIFICATION_CREATED, onNotificationUpdate);
    return unsubscribe;
  }, [onNotificationUpdate, subscribe, SOCKET_EVENTS]);
}

// Hook for message updates
export function useMessageUpdates(onMessageUpdate) {
  const { subscribe, SOCKET_EVENTS } = useWebSocket();

  useEffect(() => {
    const unsubscribeSent = subscribe(SOCKET_EVENTS.MESSAGE_SENT, onMessageUpdate);
    const unsubscribeRead = subscribe(SOCKET_EVENTS.MESSAGE_READ, onMessageUpdate);

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
    const unsubscribeTransaction = subscribe(SOCKET_EVENTS.TRANSACTION_CREATED, onPaymentUpdate);
    const unsubscribePayment = subscribe(SOCKET_EVENTS.PAYMENT_COMPLETED, onPaymentUpdate);

    return () => {
      unsubscribeTransaction();
      unsubscribePayment();
    };
  }, [onPaymentUpdate, subscribe, SOCKET_EVENTS]);
}

export default WebSocketContext;