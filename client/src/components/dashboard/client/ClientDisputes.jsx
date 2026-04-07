import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  ChevronRight,
  Info,
  Calendar,
  Loader2,
  RefreshCcw,
  X,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import {
  initiateSocketConnection,
  subscribeToNotifications,
  disconnectSocket,
} from "@/lib/socket";
import { useNavigate } from "react-router-dom";

const STATUS_MAP = {
  open: { label: "Under Investigation", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  under_review: { label: "Under Review", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-rose-500/10 text-rose-600 border-rose-200" },
};

const DISPUTE_REASONS = [
  { value: "service_not_received", label: "Service Not Received" },
  { value: "poor_quality", label: "Poor Quality of Service" },
  { value: "overcharging", label: "Overcharging / Billing Issue" },
  { value: "no_show", label: "Provider No-Show" },
  { value: "incomplete_work", label: "Incomplete Work" },
  { value: "damaged_property", label: "Property Damage" },
  { value: "unprofessional_behavior", label: "Unprofessional Behavior" },
  { value: "other", label: "Other" },
];

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// Mock data for demonstration when no real disputes exist
const MOCK_DISPUTES = [
  {
    id: "mock-1",
    reason: "Incomplete Cleaning Service",
    description: "The kitchen area was not cleaned as per the deep cleaning checklist provided during booking.",
    status: "open",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    bookingId: "mock-booking-1",
    bookingDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    timeSlot: "10:00 AM - 12:00 PM",
    amount: 2500,
    serviceTitle: "Deep Cleaning",
    providerName: "Priya Patel",
    providerServiceType: "Cleaning",
    providerProfileImage: "",
    resolutionNote: "",
  },
  {
    id: "mock-2",
    reason: "Overcharging / Billing Issue",
    description: "The invoice included charges for the copper pipe twice. The provider agreed to refund the excess amount.",
    status: "resolved",
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    bookingId: "mock-booking-2",
    bookingDate: new Date(Date.now() - 86400000 * 21).toISOString(),
    timeSlot: "2:00 PM - 4:00 PM",
    amount: 1800,
    serviceTitle: "AC Repair",
    providerName: "Rajesh Kumar",
    providerServiceType: "AC Repair",
    providerProfileImage: "",
    resolutionNote: "Refund of ₹500 processed successfully.",
  },
];

export default function ClientDisputes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filingDispute, setFilingDispute] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    bookingId: "",
    reason: "",
    description: "",
  });

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/disputes");
      const data = res.data?.data?.items || [];
      // Only use real data if we got actual results from API
      // This ensures mock data is replaced when real disputes exist
      if (data.length > 0) {
        setDisputes(data);
      } else {
        // If API returns empty, show mock data for demonstration
        setDisputes(MOCK_DISPUTES);
      }
    } catch (err) {
      // On error, show mock data for demonstration
      console.error("Failed to fetch disputes:", err);
      setDisputes(MOCK_DISPUTES);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEligibleBookings = useCallback(async () => {
    try {
      // Allow disputes for accepted (active) and completed bookings
      const res = await api.get("/api/bookings?status=accepted,completed&limit=50");
      const items = res.data?.data?.items || [];
      // Filter out bookings that already have disputes
      const bookingsWithoutDisputes = items.filter(
        (b) => !disputes.some((d) => String(d.bookingId) === String(b._id))
      );
      setBookings(bookingsWithoutDisputes);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  }, [disputes]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Real-time socket subscriptions
  useEffect(() => {
    if (!user?.id) return;

    initiateSocketConnection(user.id, user.role);

    const unsub = subscribeToNotifications((err, payload) => {
      if (err) return;
      if (payload?.notification?.type === "dispute") {
        fetchDisputes();
      }
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [user?.id, fetchDisputes]);

  const handleOpenFileModal = () => {
    fetchEligibleBookings();
    setShowFileModal(true);
    setDisputeForm({ bookingId: "", reason: "", description: "" });
    setSelectedBooking(null);
  };

  const handleCloseFileModal = () => {
    setShowFileModal(false);
    setDisputeForm({ bookingId: "", reason: "", description: "" });
    setSelectedBooking(null);
  };

  const handleSelectBooking = (booking) => {
    setSelectedBooking(booking);
    setDisputeForm({ ...disputeForm, bookingId: booking._id || booking.id });
  };

  const handleSubmitDispute = async () => {
    if (!disputeForm.bookingId || !disputeForm.reason || !disputeForm.description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setFilingDispute(true);
      await api.post("/api/disputes", disputeForm);
      toast.success("Dispute filed successfully. Our team will review it shortly.");
      handleCloseFileModal();
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not file dispute.");
    } finally {
      setFilingDispute(false);
    }
  };

  const handleViewDetails = (dispute) => {
    // Could open a detailed modal or navigate to a detail page
    toast.info("Dispute details view coming soon.");
  };

  const handleOpenSupportChat = (dispute) => {
    // Navigate to chat or open support
    navigate("/client/chat");
  };

  const filteredDisputes = disputes.filter((d) => {
    const matchesTab = activeTab === "all" || d.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      d.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.providerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-card/40 border border-border/60 rounded-[3rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Disputes Center</h1>
          <p className="text-muted-foreground mt-2 max-w-md italic leading-relaxed">
            Report issues with services, track resolution progress, and access priority support for conflict management.
          </p>
        </div>
        <Button
          size="lg"
          variant="destructive"
          className="rounded-2xl gap-2 shadow-xl shadow-rose-500/10 relative hover:scale-105 active:scale-95 transition-all"
          onClick={handleOpenFileModal}
        >
          <AlertCircle size={18} />
          Report New Issue
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="xl:col-span-3 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.8rem] border border-border/40 w-fit backdrop-blur-md">
            {["all", "open", "under_review", "resolved", "rejected"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all ${
                  activeTab === tab
                    ? "bg-background text-primary shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "open" ? "Under Investigation" : tab === "under_review" ? "Under Review" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
            />
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60">
                <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
                  <ShieldCheck size={40} opacity={0.4} />
                </div>
                <h3 className="text-xl font-semibold">No disputes found</h3>
                <p className="text-muted-foreground mt-2 max-w-xs text-center">
                  {searchQuery
                    ? "No disputes match your search."
                    : "You haven't filed any disputes yet."}
                </p>
                {!searchQuery && activeTab === "all" && (
                  <Button
                    variant="link"
                    className="mt-4 text-primary font-semibold"
                    onClick={handleOpenFileModal}
                  >
                    File your first dispute →
                  </Button>
                )}
              </div>
            ) : (
              filteredDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2.5rem] p-8 transition-all relative group overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            STATUS_MAP[dispute.status]?.color || STATUS_MAP.open.color
                          }`}
                        >
                          {STATUS_MAP[dispute.status]?.label || dispute.status}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md italic">
                          REF: {String(dispute.id).slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {dispute.reason}
                      </h2>
                      <p className="text-sm text-muted-foreground max-w-2xl italic leading-relaxed line-clamp-2">
                        {dispute.description}
                      </p>

                      <div className="flex flex-wrap gap-6 pt-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic leading-relaxed">
                          <Calendar size={14} className="text-primary/60" />
                          Opened on {formatDateTime(dispute.createdAt)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic leading-relaxed">
                          <ShieldCheck size={14} className="text-primary/60" />
                          Provider: {dispute.providerName}
                        </div>
                        {dispute.resolutionNote && (
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 italic leading-relaxed">
                            <CheckCircle2 size={14} />
                            Resolution provided
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-48 flex flex-col gap-2 shrink-0 justify-center">
                      <Button
                        variant="outline"
                        className="rounded-xl h-10 px-4 text-xs font-bold gap-2 border-border/40 hover:bg-muted/40 transition-all"
                        onClick={() => handleViewDetails(dispute)}
                      >
                        <ExternalLink size={14} />
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-xl h-10 px-4 text-xs font-bold gap-2 hover:bg-primary/10 hover:text-primary transition-all group/btn"
                        onClick={() => handleOpenSupportChat(dispute)}
                      >
                        <MessageSquare size={14} />
                        Contact Support
                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-all" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <section className="bg-card/40 border border-border/60 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center gap-3 text-primary mb-2">
              <ShieldCheck size={24} />
              <h3 className="text-lg font-bold">Standard Resolution</h3>
            </div>
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              Most disputes are resolved within 24-48 business hours.
            </p>
            <div className="space-y-4 pt-2">
              {[
                { label: "Dispute Filed", icon: FileText },
                { label: "Investigation Started", icon: Search },
                { label: "Provider Response", icon: MessageSquare },
                { label: "Admin Resolution", icon: ShieldCheck },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 text-sm font-medium group transition-all">
                  <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary border border-border/40 transition-all">
                    <step.icon size={14} />
                  </div>
                  <span className="group-hover:translate-x-1 transition-all">{step.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-[2.5rem] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle size={20} />
              <h3 className="font-bold uppercase tracking-widest text-xs">Escalation Policy</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              If your dispute remains unresolved after 72 hours, it will automatically be escalated to our Senior Resolution Team (SRT).
            </p>
            <Button
              variant="link"
              className="text-rose-600 text-[10px] font-extrabold uppercase tracking-[0.2em] p-0 h-auto self-start underline-offset-4"
              onClick={() => navigate("/help-support")}
            >
              Learn More about Disputes →
            </Button>
          </section>
        </div>
      </div>

      {/* File Dispute Modal */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-2xl bg-card rounded-[2rem] border border-border/70 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">File a Dispute</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Report an issue with a completed service. Our team will review and respond within 48 hours.
                </p>
              </div>
              <button
                onClick={handleCloseFileModal}
                className="p-2 hover:bg-muted/50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Select Booking */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Select Booking <span className="text-rose-500">*</span>
                </label>
                <div className="grid gap-3 max-h-48 overflow-y-auto">
                  {bookings.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm bg-muted/30 rounded-xl">
                      <HelpCircle size={24} className="mx-auto mb-2 opacity-50" />
                      <p>No eligible bookings available.</p>
                      <p className="text-xs mt-1">Only completed bookings without existing disputes can be disputed.</p>
                    </div>
                  ) : (
                    bookings.map((booking) => (
                      <button
                        key={booking._id || booking.id}
                        onClick={() => handleSelectBooking(booking)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedBooking?._id === booking._id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">
                              {booking.providerId?.name || booking.providerName || "Provider"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {booking.serviceId?.title || booking.serviceTitle || "Service"} ·{" "}
                              {new Date(booking.bookingDate).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary">
                            ₹{Number(booking.price || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Reason for Dispute <span className="text-rose-500">*</span>
                </label>
                <select
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                >
                  <option value="">Select a reason...</option>
                  {DISPUTE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  placeholder="Please describe what went wrong with the service. Include any relevant details that will help us investigate."
                  rows={5}
                  className="w-full rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none p-4 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Be specific and factual. This information will be shared with our resolution team.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={handleCloseFileModal}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleSubmitDispute}
                  disabled={filingDispute || !disputeForm.bookingId || !disputeForm.reason || !disputeForm.description}
                >
                  {filingDispute ? "Submitting..." : "Submit Dispute"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}