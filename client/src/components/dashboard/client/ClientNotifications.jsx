import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Calendar,
  MoreVertical,
  X,
  CreditCard,
  Briefcase,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  initiateSocketConnection,
  subscribeToNotifications,
  subscribeToNotificationReads,
  disconnectSocket,
} from "@/lib/socket";
import { useAuth } from "@/components/contexts/AuthContext";

const TYPE_CONFIG = {
  booking: {
    Icon: Calendar,
    accent: "text-primary bg-primary/10 border-primary/20 shadow-primary/5",
  },
  payment: {
    Icon: CreditCard,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  message: {
    Icon: MessageSquare,
    accent: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  general: {
    Icon: AlertCircle,
    accent: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
};

const FILTERS = ["all", "booking", "payment", "message", "general"];

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function ClientNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications?limit=50");
      const data = res.data?.data || {};
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time socket subscriptions
  useEffect(() => {
    if (!user?.id) return;

    initiateSocketConnection(user.id, user.role);

    const unsub1 = subscribeToNotifications((err, payload) => {
      if (err || !payload?.notification) return;
      setNotifications((prev) => {
        const deduped = prev.filter((n) => n.id !== payload.notification.id);
        return [payload.notification, ...deduped].slice(0, 50);
      });
      if (typeof payload.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      } else {
        setUnreadCount((c) => c + (payload.notification?.read ? 0 : 1));
      }
    });

    const unsub2 = subscribeToNotificationReads((err, payload) => {
      if (err) return;
      const ids = payload?.notificationIds || [];
      if (ids.length) {
        setNotifications((prev) =>
          prev.map((n) =>
            ids.includes(String(n.id)) ? { ...n, read: true } : n
          )
        );
      }
      if (typeof payload?.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      }
    });

    return () => {
      unsub1();
      unsub2();
      disconnectSocket();
    };
  }, [user?.id]);

  const markRead = async (id) => {
    try {
      const res = await api.put(`/api/notifications/${id}/read`);
      const data = res.data?.data || {};
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true } : n
        )
      );
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
    } catch (err) {
      toast.error("Could not mark notification as read.");
    }
  };

  const markAllRead = async () => {
    try {
      const res = await api.put("/api/notifications/read-all");
      const data = res.data?.data || {};
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch (err) {
      toast.error("Could not mark all notifications as read.");
    }
  };

  const filtered = notifications.filter((n) => {
    const matchesType = activeFilter === "all" || n.type === activeFilter;
    const matchesSearch =
      !searchQuery ||
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Real-time alerts for bookings, payments, messages, and system
            updates.{" "}
            {unreadCount > 0 && (
              <span className="text-primary font-bold">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 relative">
          <Button
            variant="outline"
            className="rounded-xl h-10 px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-muted/40 transition-all"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCircle2 size={16} />
            Mark All as Read
          </Button>
          <Button
            variant="outline"
            className="rounded-xl h-10 px-4 text-xs font-semibold gap-2 border-border/60"
            onClick={() => { setLoading(true); fetchNotifications(); }}
          >
            <RefreshCcw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/40 w-fit backdrop-blur-md">
          {FILTERS.map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === type
                  ? "bg-background text-primary shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative group w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-2xl border border-border/60 bg-card/50 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
              <Bell size={40} opacity={0.4} />
            </div>
            <h3 className="text-xl font-semibold">No notifications found</h3>
            <p className="text-muted-foreground mt-2 max-w-xs text-center">
              {searchQuery
                ? "No notifications match your search."
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          filtered.map((notification) => {
            const config =
              TYPE_CONFIG[notification.type] || TYPE_CONFIG.general;
            const Icon = config.Icon;
            return (
              <div
                key={notification.id}
                className={`group bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2rem] p-6 transition-all relative overflow-hidden cursor-pointer ${
                  !notification.read ? "border-l-4 border-l-primary" : ""
                }`}
                onClick={() => !notification.read && markRead(notification.id)}
              >
                <div className="flex items-start gap-6 relative">
                  <div
                    className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border shadow-inner ${config.accent}`}
                  >
                    <Icon size={24} />
                  </div>

                  <div className="flex-1 min-w-0 pr-16">
                    <div className="flex items-center gap-3 mb-1">
                      <h3
                        className={`font-bold text-lg group-hover:text-primary transition-colors ${
                          !notification.read
                            ? "text-foreground"
                            : "text-foreground/80"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm italic leading-relaxed line-clamp-2 max-w-3xl mb-3 tracking-tight">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="bg-muted/50 px-2 py-0.5 rounded-md">
                        {formatTime(notification.createdAt)}
                      </span>
                      <span className="opacity-30">•</span>
                      <span>{notification.type || "general"} alert</span>
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50 rounded-xl text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(notification.id);
                      }}
                      title="Mark as read"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
