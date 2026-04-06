import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  XCircle,
  RefreshCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  initiateSocketConnection,
  subscribeToBookingUpdates,
  disconnectSocket,
} from "@/lib/socket";
import { useAuth } from "@/components/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const TABS = [
  { id: "all", label: "All", icon: Filter },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "accepted", label: "Active", icon: RefreshCcw },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
];

const STATUS_MAP = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  accepted: {
    label: "Active",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
  completed: {
    label: "Completed",
    color: "bg-slate-500/10 text-slate-600 border-slate-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-rose-500/10 text-rose-600 border-rose-200",
  },
  rejected: {
    label: "Rejected",
    color: "bg-rose-500/10 text-rose-600 border-rose-200",
  },
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name = "") =>
  String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "P";

export default function ClientBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [reviewModal, setReviewModal] = useState(null); // {bookingId, existingReview}
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/bookings?limit=100");
      const items = res.data?.data?.items || [];
      setBookings(items);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load bookings right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time: booking updated by provider
  useEffect(() => {
    if (!user?.id) return;
    initiateSocketConnection(user.id);

    const unsub = subscribeToBookingUpdates((err, payload) => {
      if (err || !payload?.bookingId) return;
      setBookings((prev) =>
        prev.map((b) => {
          const id = b._id || b.id;
          if (String(id) === String(payload.bookingId)) {
            return {
              ...b,
              status: payload.status || b.status,
              ...(payload.booking || {}),
            };
          }
          return b;
        })
      );
      if (payload.status) {
        toast.info(`Booking ${payload.status}: ${payload.message || ""}`);
      }
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [user?.id]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      setCancellingId(bookingId);
      await api.patch(`/api/bookings/${bookingId}/status`, {
        status: "cancelled",
      });
      setBookings((prev) =>
        prev.map((b) =>
          (b._id || b.id) === bookingId ? { ...b, status: "cancelled" } : b
        )
      );
      toast.success("Booking cancelled successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel booking.");
    } finally {
      setCancellingId("");
    }
  };

  const openReviewModal = (booking) => {
    setReviewModal({ bookingId: booking._id || booking.id });
    setReviewRating(booking.review?.rating || 5);
    setReviewComment(booking.review?.comment || "");
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    try {
      setSubmittingReview(true);
      await api.post(`/api/bookings/${reviewModal.bookingId}/review`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success("Review submitted!");
      setReviewModal(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const status =
      typeof b.status === "string" ? b.status.toLowerCase() : "pending";
    const matchesTab = activeTab === "all" || status === activeTab;
    const providerName =
      b.providerId?.name || b.providerName || "";
    const serviceTitle =
      b.serviceId?.title || b.serviceTitle || "";
    const matchesSearch =
      !searchQuery ||
      providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Manage your service appointments, track active sessions, and review
            your booking history.
          </p>
        </div>
        <div className="flex gap-2 relative">
          <Button
            variant="outline"
            className="rounded-xl h-10 px-4 text-xs font-semibold gap-2 border-border/60"
            onClick={fetchBookings}
          >
            <RefreshCcw size={16} />
            Refresh
          </Button>
          <Button
            size="lg"
            className="rounded-2xl gap-2 shadow-lg shadow-primary/20"
            onClick={() => navigate("/client/providers")}
          >
            <Calendar size={18} />
            Book New Service
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/40 backdrop-blur-md">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background text-primary shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full xl:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by provider or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border/60 bg-card/50 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {/* Listing */}
      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[2rem] border border-border/60 bg-card/50"
            />
          ))
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => {
            const id = booking._id || booking.id;
            const status = (booking.status || "pending").toLowerCase();
            const statusStyle = STATUS_MAP[status] || STATUS_MAP.pending;
            const providerName = booking.providerId?.name || "Provider";
            const serviceTitle =
              booking.serviceId?.title || booking.serviceTitle || "Service";
            const price = Number(booking.price || 0);
            const isCancelling = cancellingId === id;

            return (
              <div
                key={id}
                className="bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2rem] p-6 transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
                  {/* Provider info */}
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shadow-inner overflow-hidden">
                      {booking.providerId?.profileImage ? (
                        <img
                          src={booking.providerId.profileImage}
                          alt={providerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(providerName)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{providerName}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyle.color}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mt-1">
                        {serviceTitle}
                      </p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 lg:max-w-xl">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Schedule
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-primary" />
                        <span className="font-medium">
                          {formatDate(booking.bookingDate)}
                        </span>
                        {booking.timeSlot && (
                          <span className="text-muted-foreground ml-1">
                            · {booking.timeSlot}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Cost
                      </p>
                      <p className="text-lg font-bold text-primary">
                        ₹{price.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Booking ID
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        #{String(id).slice(-8).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-primary/10 hover:text-primary"
                        onClick={() => openReviewModal(booking)}
                      >
                        <Star size={14} />
                        {booking.review ? "Edit Review" : "Review"}
                      </Button>
                    )}
                    {status === "accepted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-sky-500/10 hover:text-sky-600"
                        onClick={() => navigate(`/client/chat?provider=${booking.providerId?._id || ""}`)}
                      >
                        <MessageSquare size={14} />
                        Chat
                      </Button>
                    )}
                    {(status === "pending" || status === "accepted") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl px-4 text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-600"
                        onClick={() => handleCancel(id)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? "Cancelling…" : "Cancel"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
              <Calendar size={40} opacity={0.4} />
            </div>
            <h3 className="text-xl font-semibold">No bookings found</h3>
            <p className="text-muted-foreground mt-2 max-w-xs text-center">
              {searchQuery
                ? "No service records match your current search query."
                : `You don't have any ${activeTab !== "all" ? activeTab : ""} bookings at the moment.`}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                className="mt-4 text-primary font-semibold underline-offset-4 decoration-primary/30"
                onClick={() => navigate("/client/providers")}
              >
                Explore available services →
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-card rounded-[2rem] border border-border/70 p-8 shadow-2xl">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Leave a Review
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Rate your experience with this service provider.
            </p>

            {/* Star Rating */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    star <= reviewRating ? "text-amber-400" : "text-muted-foreground/30"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={4}
              className="w-full rounded-2xl border border-border/60 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none p-4 text-sm resize-none"
            />

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setReviewModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={submitReview}
                disabled={submittingReview}
              >
                {submittingReview ? "Submitting…" : "Submit Review"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
