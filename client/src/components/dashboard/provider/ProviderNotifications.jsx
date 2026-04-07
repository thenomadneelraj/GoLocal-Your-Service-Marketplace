import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Calendar,
  IndianRupee,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Settings,
  MoreVertical,
  Star,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  Zap,
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

// Icon + color mapping per notification type
const TYPE_CONFIG = {
  booking: { Icon: Calendar, color: "emerald" },
  payment: { Icon: IndianRupee, color: "blue" },
  review: { Icon: Star, color: "amber" },
  system: { Icon: ShieldCheck, color: "violet" },
  message: { Icon: MessageSquare, color: "sky" },
  general: { Icon: AlertCircle, color: "rose" },
};

const COLOR_STYLES = {
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  violet: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  sky: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  rose: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const FILTERS = ["all", "booking", "payment", "review", "message", "system"];

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

export default function ProviderNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
    } catch {
      toast.error("Could not mark notification as read.");
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Could not mark all as read.");
    }
  };

  const filtered = notifications.filter(
    (n) => filter === "all" || n.type === filter
  );

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm">
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
            Real-time notifications for bookings, payments, and reviews.{" "}
            {unreadCount > 0 && (
              <span className="text-emerald-600 font-bold">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-11 w-11 border-border/60 hover:bg-muted/50 transition-all shadow-xs"
            onClick={() => { setLoading(true); fetchNotifications(); }}
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            className="rounded-xl h-11 px-6 gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-md"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCircle2 size={18} />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/40 backdrop-blur-md shadow-xs overflow-x-auto no-scrollbar">
          {FILTERS.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === type
                  ? "bg-background text-emerald-600 shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic whitespace-nowrap leading-none">
          {filtered.length} Alert{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Notifications list */}
      <div className="grid gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card/20 border-2 border-dashed border-border/60 rounded-[2rem] text-center">
            <div className="w-14 h-14 bg-muted/40 rounded-2xl flex items-center justify-center mb-4 ring-4 ring-emerald-500/5">
              <Bell size={28} className="text-muted-foreground/30" />
            </div>
            <h3 className="text-md font-bold text-foreground opacity-60 uppercase tracking-tight">
              Clear
            </h3>
            <p className="text-[10px] text-muted-foreground mt-2 max-w-[180px] font-medium italic opacity-60 leading-relaxed">
              No alerts in this category.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
            const { Icon } = config;
            const colorStyle =
              COLOR_STYLES[config.color] || COLOR_STYLES.rose;

            return (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`group relative bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/60 transition-all duration-300 backdrop-blur-sm shadow-xs overflow-hidden cursor-pointer ${
                  !n.read
                    ? "border-emerald-500/30 ring-1 ring-emerald-500/10 bg-emerald-500/[0.02]"
                    : ""
                }`}
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Icon size={100} />
                </div>

                <div className="flex flex-col md:flex-row gap-6 relative items-center">
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs shrink-0 ${colorStyle}`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="flex-1 space-y-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                      <h3 className="text-md font-bold text-foreground group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                        {n.title}
                      </h3>
                      <div className="flex items-center gap-3 justify-center md:justify-end">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic whitespace-nowrap">
                          {formatTime(n.createdAt)}
                        </span>
                        <div className="h-1 w-1 bg-muted-foreground opacity-30 rounded-full" />
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                            !n.read
                              ? "text-emerald-600"
                              : "text-muted-foreground opacity-60"
                          }`}
                        >
                          {n.read ? "read" : "unread"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-muted-foreground line-clamp-2 max-w-2xl mx-auto md:mx-0 opacity-80">
                      {n.message}
                    </p>
                  </div>
                </div>

                {!n.read && (
                  <div className="absolute top-6 right-6 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom CTA */}
      <div className="pt-4">
        <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative group">
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3 text-emerald-600 font-black uppercase tracking-widest text-[9px] bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
              <Zap size={12} />
              Real-Time Sync
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-1 italic">
              Always in Sync
            </h3>
            <p className="text-[10px] text-muted-foreground italic font-medium leading-relaxed max-w-lg opacity-70">
              All notifications arrive in real-time via WebSocket. No refresh needed.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
