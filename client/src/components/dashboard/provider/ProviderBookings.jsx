import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import {
  BOOKING_STATUS,
  getBookingStatusLabel,
  normalizeBookingStatus,
} from "@/lib/bookingStatus";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockProviderBookings } from "@/lib/mockWorkspaceData";
import { useBookingUpdates } from "@/components/contexts/WebSocketContext";

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) {
    return "Date not set";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (value = "") =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";

const getStatusLabel = (status = "") =>
  String(normalizeBookingStatus(status) || "unknown");

const normalizeBooking = (item = {}) => {
  const client = item.clientId || {};
  const clientUser = client.userId || {};
  const provider = item.providerId || {};
  const service = item.serviceId || {};

  return {
    id: item._id || item.id,
    clientName: client.name || "Client",
    clientEmail: clientUser.email || "",
    clientPhone: client.phone || "",
    clientAddress: item.address || client.address || "",
    clientPhoto: client.profileImage || client.profilePhoto || "",
    serviceTitle: service.title || service.name || provider.serviceType || "Service",
    serviceCategory: service.category || provider.serviceType || "",
    bookingDate: item.bookingDate || "",
    timeSlot: item.timeSlot || "Flexible",
    status: normalizeBookingStatus(item.status) || BOOKING_STATUS.PENDING,
    price: Number(item.price || service.price || 0),
    createdAt: item.createdAt || "",
  };
};

export default function ProviderBookings() {
  const { user } = useAuth();
  const providerAccess = getAccountAccessState(user);
  const canRespondToBookings = providerAccess.canRespondToBookings;
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingKey, setUpdatingKey] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Handle real-time booking updates via WebSocket
  const handleBookingUpdate = useCallback((payload) => {
    console.log("[ProviderBookings] Received booking update:", payload);
    
    if (payload.booking) {
      setBookings(prev => {
        const exists = prev.find(b => b.id === payload.booking._id || b.id === payload.booking.id);
        if (exists) {
          return prev.map(b => 
            (b.id === payload.booking._id || b.id === payload.booking.id) 
              ? { ...payload.booking, id: payload.booking._id || payload.booking.id } 
              : b
          );
        } else {
          return [{ ...payload.booking, id: payload.booking._id || payload.booking.id }, ...prev];
        }
      });
      
      toast.success(payload.message || "Booking updated");
    }
  }, []);

  useBookingUpdates(handleBookingUpdate);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/bookings", {
        params: { limit: 100 },
      });

      const items = response.data?.data?.items || [];
      setBookings(items.map(normalizeBooking));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your booking requests right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const layeredBookings = useMemo(
    () =>
      mergeLayeredCollections(bookings, mockProviderBookings, {
        getId: (booking) => booking.id,
      }),
    [bookings]
  );

  const tabCounts = useMemo(
    () => ({
      all: layeredBookings.length,
      pending: layeredBookings.filter((booking) => booking.status === "pending").length,
      active: layeredBookings.filter((booking) => booking.status === BOOKING_STATUS.ACCEPTED).length,
      completed: layeredBookings.filter((booking) => booking.status === "completed").length,
    }),
    [layeredBookings]
  );

  const tabs = useMemo(
    () => [
      { id: "all", label: "All Bookings", count: tabCounts.all },
      { id: "pending", label: "Pending Requests", count: tabCounts.pending },
      { id: "active", label: "Active Jobs", count: tabCounts.active },
      { id: "completed", label: "Completed", count: tabCounts.completed },
    ],
    [tabCounts]
  );

  const filteredBookings = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return layeredBookings.filter((booking) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active"
          ? booking.status === BOOKING_STATUS.ACCEPTED
          : booking.status === activeTab);

      if (!matchesTab) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        booking.clientName,
        booking.clientEmail,
        booking.clientAddress,
        booking.serviceTitle,
        booking.id,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedQuery)
        );
    });
  }, [activeTab, layeredBookings, searchQuery]);

  const handleStatusUpdate = async (bookingId, nextStatus) => {
    try {
      const currentKey = `${bookingId}:${nextStatus}`;
      setUpdatingKey(currentKey);

      const response = await api.patch(`/api/bookings/${bookingId}/status`, {
        status: nextStatus,
      });

      const updatedBooking = normalizeBooking(response.data?.data || {});

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? { ...booking, ...updatedBooking } : booking
        )
      );
      setSelectedBooking((current) =>
        current?.id === bookingId ? { ...current, ...updatedBooking } : current
      );

      toast.success(
        nextStatus === BOOKING_STATUS.ACCEPTED
          ? "Booking request accepted."
          : nextStatus === BOOKING_STATUS.REJECTED
            ? "Booking request declined."
            : nextStatus === BOOKING_STATUS.CANCELLED
              ? "Booking cancelled."
              : "Booking updated successfully."
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not update this booking right now."
      );
    } finally {
      setUpdatingKey("");
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
            Manage incoming client requests, approve jobs, and track accepted work.
          </p>
        </div>
        <Button
          onClick={loadBookings}
          className="rounded-xl h-11 px-6 gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-md"
          disabled={loading}
        >
          <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Approval gate banner */}
      {!canRespondToBookings && (
        <div className={`flex items-start gap-3 rounded-[1.5rem] border px-5 py-4 text-sm font-medium ${
          providerAccess.title?.toLowerCase().includes("rejected")
            ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            : "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-300"
        }`}>
          <span className="mt-0.5 shrink-0">
            {providerAccess.title?.toLowerCase().includes("rejected")
              ? <AlertTriangle size={17} />
              : <Clock size={17} />}
          </span>
          <div>
            <p className="font-bold">{providerAccess.title}</p>
            <p className="mt-1 text-xs leading-6 opacity-85">
              You cannot accept or decline booking requests until the admin approves your provider account.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/40 backdrop-blur-md shadow-xs overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-background text-emerald-600 shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                  activeTab === tab.id
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full xl:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search clients, services, or addresses..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-card/50 focus:bg-background outline-none transition-all text-xs shadow-xs"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[2rem] border border-border/60 bg-card/50"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => {
            const bookingPhoto = resolveMediaUrl(booking.clientPhoto);
            const isAccepting = updatingKey === `${booking.id}:${BOOKING_STATUS.ACCEPTED}`;
            const isDeclining = updatingKey === `${booking.id}:${BOOKING_STATUS.REJECTED}`;
            const isMockBooking = booking.dataOrigin === "mock";

            return (
              <div
                key={booking.id}
                className="group relative bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/60 transition-all duration-300 backdrop-blur-sm shadow-xs h-full flex flex-col"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 font-bold text-lg shadow-xs">
                      {bookingPhoto ? (
                        <img
                          src={bookingPhoto}
                          alt={booking.clientName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(booking.clientName)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-md leading-none">
                          {booking.clientName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest leading-none ${
                            STATUS_STYLES[booking.status] ||
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getBookingStatusLabel(booking.status)}
                        </span>
                        <DataOriginBadge
                          origin={booking.dataOrigin}
                          liveLabel="Live"
                          sampleLabel="Sample"
                        />
                      </div>
                      <p className="text-muted-foreground text-[10px] font-bold italic opacity-60">
                        #{booking.id}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 lg:max-w-2xl">
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1 opacity-60">
                        Service
                      </p>
                      <p className="text-xs font-bold text-foreground truncate">
                        {booking.serviceTitle}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1 opacity-60">
                        Schedule
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground italic">
                        <Calendar size={12} className="text-emerald-500" />
                        <span>{formatDate(booking.bookingDate)}</span>
                        <span className="text-muted-foreground font-medium opacity-70">
                          at {booking.timeSlot}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1 opacity-60">
                        Value
                      </p>
                      <p className="text-lg font-black text-emerald-600 leading-none italic">
                        {formatCurrency(booking.price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-widest border-border/60 hover:bg-muted/50 transition-all shadow-xs"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      Details
                    </Button>
                    {isMockBooking ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                        Sample booking
                      </span>
                    ) : booking.status === "pending" ? (
                      canRespondToBookings ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-500 hover:bg-rose-500/5 transition-all"
                            onClick={() =>
                              handleStatusUpdate(booking.id, BOOKING_STATUS.REJECTED)
                            }
                            disabled={Boolean(updatingKey)}
                          >
                            {isDeclining ? "Declining..." : "Decline"}
                          </Button>
                          <Button
                            className="rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                            onClick={() =>
                              handleStatusUpdate(booking.id, BOOKING_STATUS.ACCEPTED)
                            }
                            disabled={Boolean(updatingKey)}
                          >
                            {isAccepting ? "Accepting..." : "Accept"}
                          </Button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                          <Clock size={12} /> Awaiting Approval
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {!filteredBookings.length ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card/20 border-2 border-dashed border-border/60 rounded-[2rem] text-center">
              <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mb-4 ring-4 ring-emerald-500/5">
                <Calendar size={28} className="text-muted-foreground/40" />
              </div>
              <h3 className="text-md font-bold text-foreground opacity-60 uppercase tracking-tight">
                No bookings found
              </h3>
              <p className="text-[10px] text-muted-foreground mt-2 max-w-[240px] font-medium italic opacity-60 leading-relaxed">
                Try another tab or search term to find a matching booking request.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {selectedBooking ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm px-4 py-6">
          <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
            <div className="w-full max-h-full overflow-y-auto rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-[0_36px_100px_-48px_rgba(15,23,42,0.8)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Booking Request
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {selectedBooking.clientName}
                    </h2>
                    <DataOriginBadge
                      origin={selectedBooking.dataOrigin}
                      liveLabel="Live"
                      sampleLabel="Sample"
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Review the client details and scheduled service before you take action.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-5">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.75rem] bg-emerald-500/10 text-3xl font-black text-emerald-600">
                    {resolveMediaUrl(selectedBooking.clientPhoto) ? (
                      <img
                        src={resolveMediaUrl(selectedBooking.clientPhoto)}
                        alt={selectedBooking.clientName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedBooking.clientName)
                    )}
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <User size={16} className="mt-0.5 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedBooking.clientName}
                        </p>
                        <p>Client requesting service</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail size={16} className="mt-0.5 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-foreground">Email</p>
                        <p>{selectedBooking.clientEmail || "Not available"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone size={16} className="mt-0.5 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-foreground">Phone</p>
                        <p>{selectedBooking.clientPhone || "Not available"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="mt-0.5 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-foreground">Service address</p>
                        <p>{selectedBooking.clientAddress || "Not available"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-lg font-bold text-foreground">
                        {selectedBooking.serviceTitle}
                      </p>
                      <span
                        className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                          STATUS_STYLES[selectedBooking.status] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {getBookingStatusLabel(selectedBooking.status)}
                      </span>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                          Schedule
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {formatDate(selectedBooking.bookingDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedBooking.timeSlot}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                          Booking value
                        </p>
                        <p className="mt-2 text-sm font-semibold text-emerald-600">
                          {formatCurrency(selectedBooking.price)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedBooking.serviceCategory || "General service"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Request timeline
                    </p>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      Requested on {formatDate(selectedBooking.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Accepting moves this booking to your active jobs. Declining cancels the request for the client.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {selectedBooking.dataOrigin === "mock" ? (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
                        <Clock size={15} />
                        <span className="font-semibold">Sample booking actions are disabled.</span>
                      </div>
                    ) : selectedBooking.status === "pending" ? (
                      canRespondToBookings ? (
                        <>
                          <Button
                            variant="outline"
                            className="rounded-xl border-rose-500/20 text-rose-500 hover:bg-rose-500/5"
                            onClick={() =>
                              handleStatusUpdate(selectedBooking.id, BOOKING_STATUS.REJECTED)
                            }
                            disabled={Boolean(updatingKey)}
                          >
                            <XCircle size={16} className="mr-2" />
                            Decline Request
                          </Button>
                          <Button
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
                            onClick={() =>
                              handleStatusUpdate(selectedBooking.id, BOOKING_STATUS.ACCEPTED)
                            }
                            disabled={Boolean(updatingKey)}
                          >
                            <CheckCircle2 size={16} className="mr-2" />
                            Accept Request
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
                          <Clock size={15} />
                          <span className="font-semibold">Awaiting admin approval to take action.</span>
                        </div>
                      )
                    ) : null}
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setSelectedBooking(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
