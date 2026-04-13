import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import {
  mockDisputeBookings,
  mockDisputeThreads,
} from "@/lib/mockWorkspaceData";

const STATUS_STYLES = {
  open: "bg-amber-500/10 text-amber-700 border-amber-300/50",
  under_review: "bg-sky-500/10 text-sky-700 border-sky-300/50",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-300/50",
  rejected: "bg-rose-500/10 text-rose-700 border-rose-300/50",
  escalated: "bg-purple-500/10 text-purple-700 border-purple-300/50",
};

const REASONS = [
  "Service Quality",
  "Billing Issue",
  "Late Arrival",
  "No Show",
  "Behavior Concern",
  "Platform Bug",
  "Other",
];

export default function RoleDisputeCenter({ role = "client" }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [selectedThreadKey, setSelectedThreadKey] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    targetType: role === "provider" ? "client" : "provider",
    bookingId: "",
    subject: "",
    reason: "",
    description: "",
  });

  const chatPath = role === "provider" ? "/provider/chat" : "/client/chat";

  const loadThreads = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/disputes");
      const nextThreads = response.data?.data?.threads || [];
      setThreads(nextThreads);
      setSelectedThreadKey((current) => current || nextThreads[0]?.threadKey || "");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load disputes.");
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await api.get("/api/bookings?status=accepted,completed&limit=50");
      setBookings(response.data?.data?.items || []);
    } catch (error) {
      toast.error("Could not load eligible bookings.");
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const layeredThreads = useMemo(
    () =>
      mergeLayeredCollections(threads, mockDisputeThreads[role] || [], {
        getId: (thread) => thread.threadKey,
        getTimestamp: (thread) => thread.latestAt || thread.createdAt,
      }),
    [role, threads]
  );
  const layeredBookings = useMemo(
    () =>
      mergeLayeredCollections(bookings, mockDisputeBookings[role] || [], {
        getId: (booking) => booking._id || booking.id,
      }),
    [bookings, role]
  );

  const layeredActiveThread = useMemo(
    () =>
      layeredThreads.find((thread) => thread.threadKey === selectedThreadKey) ||
      layeredThreads[0] ||
      null,
    [layeredThreads, selectedThreadKey]
  );

  useEffect(() => {
    if (!selectedThreadKey && layeredThreads[0]?.threadKey) {
      setSelectedThreadKey(layeredThreads[0].threadKey);
    }
  }, [layeredThreads, selectedThreadKey]);

  const openModal = async () => {
    await loadBookings();
    setShowModal(true);
  };

  const submitDispute = async () => {
    if (!form.reason || !form.description || !form.subject) {
      toast.error("Add a subject, reason, and description.");
      return;
    }

    if (form.targetType !== "platform" && !form.bookingId) {
      toast.error("Select a booking for user-to-user disputes.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/api/disputes", form);
      toast.success("Dispute filed successfully.");
      setShowModal(false);
      setForm({
        targetType: role === "provider" ? "client" : "provider",
        bookingId: "",
        subject: "",
        reason: "",
        description: "",
      });
      await loadThreads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not file dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/60 p-8 backdrop-blur-xl shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispute Center</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review active reports, file website issues, and keep disputes grouped in one thread per context.
          </p>
        </div>
        <Button onClick={openModal}>File New Dispute</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-[2rem] border border-border/60 bg-card/40 p-4 backdrop-blur-sm shadow-sm">
          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Threads
          </p>
          <div className="space-y-2">
            {loading ? (
              <p className="px-3 py-10 text-sm text-muted-foreground">Loading disputes...</p>
            ) : layeredThreads.length === 0 ? (
              <p className="px-3 py-10 text-sm text-muted-foreground">
                No disputes yet. Use the button above to report a provider, client, or website issue.
              </p>
            ) : (
              layeredThreads.map((thread) => (
                <button
                  key={thread.threadKey}
                  type="button"
                  onClick={() => setSelectedThreadKey(thread.threadKey)}
                  className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition-colors ${
                    selectedThreadKey === thread.threadKey
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{thread.threadTitle}</p>
                      <DataOriginBadge origin={thread.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        STATUS_STYLES[thread.status] || STATUS_STYLES.open
                      }`}
                    >
                      {thread.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {thread.items.length} report{thread.items.length === 1 ? "" : "s"} | {thread.latestLabel}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
          {layeredActiveThread ? (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{layeredActiveThread.threadTitle}</h2>
                    <DataOriginBadge origin={layeredActiveThread.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {layeredActiveThread.targetType === "platform"
                      ? "Website and platform reports go to admin."
                      : "Booking-linked disputes stay grouped here."}
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate(chatPath)}>
                  Open Chat
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                {layeredActiveThread.items.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-foreground">{item.subject}</p>
                          <DataOriginBadge origin={item.dataOrigin || layeredActiveThread.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {item.reason} | {item.roleLabel}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          STATUS_STYLES[item.status] || STATUS_STYLES.open
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.description}</p>

                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                      <p><span className="font-medium text-foreground">Created:</span> {item.createdLabel}</p>
                      <p><span className="font-medium text-foreground">Booking:</span> {item.bookingLabel}</p>
                      <p><span className="font-medium text-foreground">Reporter:</span> {item.reporterName}</p>
                      <p><span className="font-medium text-foreground">Target:</span> {item.targetUserName}</p>
                    </div>

                    {item.resolutionNote ? (
                      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                        {item.resolutionNote}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              Select a dispute thread to view the full conversation-style history.
            </div>
          )}
        </section>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-border/70 bg-card p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold text-foreground">File dispute</h2>
            <div className="mt-6 grid gap-4">
              <select
                value={form.targetType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetType: event.target.value,
                    bookingId: "",
                  }))
                }
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              >
                <option value={role === "provider" ? "client" : "provider"}>
                  Report {role === "provider" ? "client" : "provider"}
                </option>
                <option value="platform">Report website / platform issue</option>
              </select>

              {form.targetType !== "platform" ? (
                <select
                  value={form.bookingId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bookingId: event.target.value }))
                  }
                  className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select booking</option>
                  {layeredBookings.map((booking) => (
                    <option key={booking._id} value={booking._id}>
                      {(booking.providerId?.name || booking.clientId?.name || "User")} | {(booking.serviceId?.title || booking.selectedServices?.[0]?.title || "Service")}
                    </option>
                  ))}
                </select>
              ) : null}

              <input
                type="text"
                placeholder="Subject"
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subject: event.target.value }))
                }
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />

              <select
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              >
                <option value="">Select reason</option>
                {REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>

              <textarea
                rows={5}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe the issue in detail."
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={submitDispute} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Dispute"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
