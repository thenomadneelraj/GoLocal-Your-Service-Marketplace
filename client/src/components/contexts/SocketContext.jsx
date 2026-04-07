/**
 * SocketContext - Centralized socket subscription for real-time events.
 *
 * Wraps the raw socket.js helpers into a React context so all dashboard
 * components can subscribe to real-time events without duplicating setup.
 *
 * Usage:
 *   const { onBookingUpdate, onNewMessage, onNotification } = useSocket();
 */

import { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  initiateSocketConnection,
  disconnectSocket,
  subscribeToBookingUpdates,
  subscribeToNewMessages,
  subscribeToReadReceipts,
  subscribeToNotifications,
  subscribeToNotificationReads,
} from "@/lib/socket";

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const listenersRef = useRef({
    bookingUpdate: [],
    newMessage: [],
    readReceipt: [],
    notification: [],
    notificationRead: [],
  });

  // Connect when user is available
  useEffect(() => {
    if (!user?.id) return;

    initiateSocketConnection(user.id, user.role);

    const ubooking = subscribeToBookingUpdates((err, data) => {
      if (err) return;
      listenersRef.current.bookingUpdate.forEach((cb) => cb(data));
    });

    const umessage = subscribeToNewMessages((err, data) => {
      if (err) return;
      listenersRef.current.newMessage.forEach((cb) => cb(data));
    });

    const uread = subscribeToReadReceipts((err, data) => {
      if (err) return;
      listenersRef.current.readReceipt.forEach((cb) => cb(data));
    });

    const unotif = subscribeToNotifications((err, data) => {
      if (err) return;
      listenersRef.current.notification.forEach((cb) => cb(data));
    });

    const unotifRead = subscribeToNotificationReads((err, data) => {
      if (err) return;
      listenersRef.current.notificationRead.forEach((cb) => cb(data));
    });

    return () => {
      ubooking();
      umessage();
      uread();
      unotif();
      unotifRead();
      disconnectSocket();
    };
  }, [user?.id]);

  const addListener = (type, cb) => {
    listenersRef.current[type] = [...(listenersRef.current[type] || []), cb];
    return () => {
      listenersRef.current[type] = (listenersRef.current[type] || []).filter(
        (fn) => fn !== cb
      );
    };
  };

  const value = {
    onBookingUpdate: (cb) => addListener("bookingUpdate", cb),
    onNewMessage: (cb) => addListener("newMessage", cb),
    onReadReceipt: (cb) => addListener("readReceipt", cb),
    onNotification: (cb) => addListener("notification", cb),
    onNotificationRead: (cb) => addListener("notificationRead", cb),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
