import React, { useState, useEffect, useCallback } from "react";
import {
  HelpCircle,
  MessageSquare,
  Send,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";

const STATUS_MAP = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  resolved: {
    label: "Resolved",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
  closed: {
    label: "Closed",
    color: "bg-slate-500/10 text-slate-600 border-slate-200",
  },
};

const CATEGORY_OPTIONS = [
  { value: "booking", label: "Booking Issue" },
  { value: "payment", label: "Payment / Payout Problem" },
  { value: "account", label: "Account Help" },
  { value: "technical", label: "Technical Issue" },
  { value: "verification", label: "Verification Support" },
  { value: "feedback", label: "Feedback / Suggestion" },
  { value: "other", label: "Other" },
];

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatFullDateTime = (value) => {
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

export default function ProviderSupport() {
  const { user } = useAuth();
  const { supportEmail, platformName } = useMaintenance();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    message: "",
  });
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/contact-messages/me");
      const data = res.data?.data?.items || [];
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch support messages:", err);
      toast.error("Could not load support tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleOpenNewTicketModal = () => {
    setShowNewTicketModal(true);
    setTicketForm({ subject: "", category: "", message: "" });
    setSelectedTicket(null);
  };

  const handleCloseNewTicketModal = () => {
    setShowNewTicketModal(false);
    setTicketForm({ subject: "", category: "", message: "" });
  };

  const handleSubmitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmittingTicket(true);
      await api.post("/contact-messages", {
        name: user?.name,
        email: user?.email,
        subject: ticketForm.subject,
        category: ticketForm.category,
        message: ticketForm.message,
      });
      toast.success(
        "Support ticket submitted successfully. We'll respond within 24 hours.",
      );
      handleCloseNewTicketModal();
      fetchMessages();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not submit support ticket.",
      );
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseTicketView = () => {
    setSelectedTicket(null);
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesTab = activeTab === "all" || msg.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-card/40 border border-border/60 rounded-[3rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">
            Provider Support
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md italic leading-relaxed">
            Get help with bookings, payouts, verification, or account issues.
            Our provider support team is here to assist you.
          </p>
        </div>
        <Button
          size="lg"
          className="rounded-2xl gap-2 shadow-xl shadow-emerald-500/10 relative hover:scale-105 active:scale-95 transition-all"
          onClick={handleOpenNewTicketModal}
        >
          <MessageSquare size={18} />
          New Support Ticket
        </Button>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 backdrop-blur-xl hover:bg-card/60 transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Provider Support Email</h3>
              <p className="text-xs text-muted-foreground">
                Response within 24 hours
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            For detailed inquiries, send us an email and we'll get back to you
            promptly.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="text-sm font-semibold text-primary flex items-center gap-2 hover:gap-3 transition-all"
          >
            {supportEmail}
            <ChevronRight size={16} />
          </a>
        </div>

        <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 backdrop-blur-xl hover:bg-card/60 transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Provider Resources</h3>
              <p className="text-xs text-muted-foreground">
                Guides and tutorials
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Access our provider knowledge base for best practices and platform
            guides.
          </p>
          <a
            href="/resources/providers"
            className="text-sm font-semibold text-blue-600 flex items-center gap-2 hover:gap-3 transition-all"
          >
            Browse Resources
            <ChevronRight size={16} />
          </a>
        </div>

        <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 backdrop-blur-xl hover:bg-card/60 transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <HelpCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">FAQs</h3>
              <p className="text-xs text-muted-foreground">Quick answers</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Find quick answers to the most frequently asked questions for
            providers.
          </p>
          <a
            href="/resources/provider-faqs"
            className="text-sm font-semibold text-amber-600 flex items-center gap-2 hover:gap-3 transition-all"
          >
            View FAQs
            <ChevronRight size={16} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="xl:col-span-3 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.8rem] border border-border/40 w-fit backdrop-blur-md">
            {["all", "pending", "in_progress", "resolved", "closed"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all ${
                    activeTab === tab
                      ? "bg-background text-primary shadow-sm border border-border/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "in_progress"
                    ? "In Progress"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>

          {/* Search */}
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search support tickets..."
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
            ) : filteredMessages.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60">
                <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
                  <MessageSquare size={40} opacity={0.4} />
                </div>
                <h3 className="text-xl font-semibold">
                  No support tickets found
                </h3>
                <p className="text-muted-foreground mt-2 max-w-xs text-center">
                  {searchQuery
                    ? "No tickets match your search."
                    : "You haven't submitted any support requests yet."}
                </p>
                {!searchQuery && activeTab === "all" && (
                  <Button
                    variant="link"
                    className="mt-4 text-primary font-semibold"
                    onClick={handleOpenNewTicketModal}
                  >
                    Submit your first ticket →
                  </Button>
                )}
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2.5rem] p-8 transition-all relative group overflow-hidden cursor-pointer"
                  onClick={() => handleViewTicket(msg)}
                >
                  <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            STATUS_MAP[msg.status]?.color ||
                            STATUS_MAP.pending.color
                          }`}
                        >
                          {STATUS_MAP[msg.status]?.label || msg.status}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md italic">
                          {msg.category
                            ? msg.category.toUpperCase()
                            : "GENERAL"}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {msg.subject}
                      </h2>
                      <p className="text-sm text-muted-foreground max-w-2xl italic leading-relaxed line-clamp-2">
                        {msg.message}
                      </p>
                      {msg.response && (
                        <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border/40">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                            Support Response
                          </p>
                          <p className="text-sm text-foreground">
                            {msg.response}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-48 flex flex-col gap-2 shrink-0 justify-center">
                      <Button
                        variant="outline"
                        className="rounded-xl h-10 px-4 text-xs font-bold gap-2 border-border/40 hover:bg-muted/40 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTicket(msg);
                        }}
                      >
                        <ExternalLink size={14} />
                        View Details
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
              <HelpCircle size={24} />
              <h3 className="text-lg font-bold">Support Hours</h3>
            </div>
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              Our provider support team is available Monday through Friday, 9 AM
              to 6 PM IST.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                  <Clock size={14} />
                </div>
                <span>Average response time: 4-6 hours</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                  <CheckCircle2 size={14} />
                </div>
                <span>Resolution rate: 98%</span>
              </div>
            </div>
          </section>

          <section className="p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-primary">
              <AlertCircle size={20} />
              <h3 className="font-bold uppercase tracking-widest text-xs">
                Urgent Issues
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              For urgent matters related to active bookings or payouts, please
              contact us directly at:
            </p>
            <div className="space-y-2">
              <a
                href={`mailto:${supportEmail}`}
                className="text-sm font-semibold text-primary hover:underline block"
              >
                {supportEmail}
              </a>
            </div>
          </section>

          <section className="bg-card/40 border border-border/60 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 text-primary mb-4">
              <FileText size={24} />
              <h3 className="text-lg font-bold">Provider Topics</h3>
            </div>
            <ul className="space-y-3">
              {[
                {
                  label: "Managing your bookings",
                  link: "/resources/provider-guides",
                },
                { label: "Payout settings", link: "/resources/provider-faqs" },
                { label: "Service verification", link: "/resources/help" },
                { label: "Handling disputes", link: "/resources/help" },
                {
                  label: "Profile optimization",
                  link: "/resources/provider-faqs",
                },
              ].map((item, i) => (
                <li key={i}>
                  <a
                    href={item.link}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                  >
                    <ChevronRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-2xl bg-card rounded-[2rem] border border-border/70 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Submit Support Ticket
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe your issue and our provider support team will respond
                  within 24 hours.
                </p>
              </div>
              <button
                onClick={handleCloseNewTicketModal}
                className="p-2 hover:bg-muted/50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Subject */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, subject: e.target.value })
                  }
                  placeholder="Brief description of your issue"
                  className="w-full h-12 px-4 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={ticketForm.category}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, category: e.target.value })
                  }
                  className="w-full h-12 px-4 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                >
                  <option value="">Select a category...</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={ticketForm.message}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, message: e.target.value })
                  }
                  placeholder="Please provide as much detail as possible about your issue. Include any relevant booking IDs, transaction references, or screenshots if applicable."
                  rows={6}
                  className="w-full rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none p-4 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The more details you provide, the faster we can help resolve
                  your issue.
                </p>
              </div>

              {/* Contact Info */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border/40">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Contact Information
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {user?.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={handleCloseNewTicketModal}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleSubmitTicket}
                  disabled={
                    submittingTicket ||
                    !ticketForm.subject ||
                    !ticketForm.category ||
                    !ticketForm.message
                  }
                >
                  {submittingTicket ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-2xl bg-card rounded-[2rem] border border-border/70 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      STATUS_MAP[selectedTicket.status]?.color ||
                      STATUS_MAP.pending.color
                    }`}
                  >
                    {STATUS_MAP[selectedTicket.status]?.label ||
                      selectedTicket.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFullDateTime(selectedTicket.createdAt)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                onClick={handleCloseTicketView}
                className="p-2 hover:bg-muted/50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-xl border border-border/40">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Category
                </p>
                <p className="text-sm font-semibold">
                  {selectedTicket.category
                    ? selectedTicket.category.toUpperCase()
                    : "General"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Message
                </p>
                <div className="p-4 bg-card rounded-xl border border-border/60">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedTicket.message}
                  </p>
                </div>
              </div>

              {selectedTicket.response && (
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                    Support Response
                  </p>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedTicket.response}
                    </p>
                  </div>
                </div>
              )}

              {!selectedTicket.response &&
                selectedTicket.status !== "resolved" &&
                selectedTicket.status !== "closed" && (
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <p className="text-sm text-amber-700">
                      Your ticket is being reviewed. Our support team will
                      respond within 24 hours.
                    </p>
                  </div>
                )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={handleCloseTicketView}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    handleCloseTicketView();
                    handleOpenNewTicketModal();
                  }}
                >
                  Reply / New Ticket
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
