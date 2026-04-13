import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminDisputes,
  fetchAdminDisputesSummary,
  downloadAdminExport,
  updateAdminDisputeStatus,
} from "@/lib/cachedAdminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
  downloadBlobFile,
} from "./AdminWorkspaceCommon";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockAdminDisputeThreads } from "@/lib/mockWorkspaceData";
import { useSocketEvent } from "@/components/contexts/WebSocketContext";

const THREAD_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminDisputes() {
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [summary, setSummary] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThreadKey, setSelectedThreadKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [downloadFormat, setDownloadFormat] = useState("csv");

  // Handle real-time dispute updates via WebSocket
  const handleDisputeUpdate = useCallback((payload) => {
    console.log("[AdminDisputes] Received dispute update:", payload);
    
    // Refresh the disputes list when updates occur
    loadDisputes();
    
    if (payload.message) {
      toast.success(payload.message);
    }
  }, [filters]);

  useSocketEvent("dispute_created", handleDisputeUpdate);
  useSocketEvent("dispute_updated", handleDisputeUpdate);

  const loadDisputes = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const [summaryResponse, disputesResponse] = await Promise.all([
        fetchAdminDisputesSummary(),
        fetchAdminDisputes({ ...nextFilters, view: "threads" }),
      ]);

      const nextThreads = disputesResponse.data?.data?.threads || [];
      setSummary(summaryResponse.data?.data || null);
      setThreads(nextThreads);
      setSelectedThreadKey((current) =>
        current && nextThreads.some((thread) => thread.threadKey === current)
          ? current
          : nextThreads[0]?.threadKey || ""
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const layeredThreads = useMemo(
    () =>
      mergeLayeredCollections(threads, mockAdminDisputeThreads, {
        getId: (thread) => thread.threadKey,
        getTimestamp: (thread) => thread.latestAt,
      }),
    [threads]
  );
  const layeredActiveThread = useMemo(
    () =>
      layeredThreads.find((thread) => thread.threadKey === selectedThreadKey) ||
      layeredThreads[0] ||
      null,
    [layeredThreads, selectedThreadKey]
  );
  const hasLiveSummary =
    (summary?.open || 0) > 0 ||
    (summary?.underReview || 0) > 0 ||
    (summary?.resolved || 0) > 0;
  const mockSummary = {
    open: 1,
    underReview: 1,
    highPriority: 1,
    resolved: 0,
  };
  const resolvedSummary = hasLiveSummary ? summary : mockSummary;

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadDisputes(nextFilters);
  };

  const getDraft = (item) =>
    drafts[item.id] || {
      status: item.status,
      resolutionNote: item.resolutionNote || "",
    };

  useEffect(() => {
    if (!selectedThreadKey && layeredThreads[0]?.threadKey) {
      setSelectedThreadKey(layeredThreads[0].threadKey);
    }
  }, [layeredThreads, selectedThreadKey]);

  const updateDraft = (itemId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async (item) => {
    if (item.dataOrigin === "mock") {
      toast.info("Sample disputes are read-only.");
      return;
    }
    const draft = getDraft(item);

    try {
      setSavingId(item.id);
      const response = await updateAdminDisputeStatus(item.id, {
        status: draft.status,
        resolutionNote: draft.resolutionNote,
      });
      toast.success(response.data?.message || "Dispute updated successfully.");
      await loadDisputes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update dispute.");
    } finally {
      setSavingId("");
    }
  };

  if (loading && !summary) {
    return <AdminLoadingState label="Loading dispute management..." />;
  }

  const handleExport = async () => {
    try {
      const response = await downloadAdminExport({
        packageType: "disputes",
        format: downloadFormat,
      });
      const fileName = downloadBlobFile(response, `disputes.${downloadFormat}`);
      toast.success(`${fileName} downloaded successfully.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download export.");
    }
  };

  return (
    <AdminPageShell
      title="Dispute Management"
      description="Review user-to-user and website issues in one threaded workspace, then update each report with an admin response."
      actions={
        <>
          <AdminSelectField value={downloadFormat} onChange={setDownloadFormat}>
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
            <option value="pdf">PDF</option>
          </AdminSelectField>
          <button type="button" onClick={handleExport} className="admin-button-secondary">
            Export {String(downloadFormat).toUpperCase()}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={CircleDashed} title="Open" value={resolvedSummary?.open ?? 0} />
        <AdminStatCard
          icon={ShieldAlert}
          title="Under review"
          value={resolvedSummary?.underReview ?? 0}
          tone="text-blue-600"
        />
        <AdminStatCard
          icon={AlertTriangle}
          title="High priority"
          value={resolvedSummary?.highPriority ?? 0}
          tone="text-rose-600"
        />
        <AdminStatCard
          icon={CheckCircle2}
          title="Resolved"
          value={resolvedSummary?.resolved ?? 0}
          tone="text-emerald-600"
        />
      </div>

      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <AdminSearchField
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            placeholder="Search disputes, users, or booking references..."
          />
          <AdminSelectField
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </AdminSelectField>
        </div>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminPanel title="Dispute threads" description="Each lane groups reports by website issue or booking context.">
          <div className="space-y-3">
            {layeredThreads.length ? (
              layeredThreads.map((thread) => (
                <button
                  key={thread.threadKey}
                  type="button"
                  onClick={() => setSelectedThreadKey(thread.threadKey)}
                  className={`admin-card-soft w-full text-left transition-all ${
                    selectedThreadKey === thread.threadKey
                      ? "border-primary/40 bg-primary/5"
                      : "hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {thread.threadTitle}
                        </p>
                        <DataOriginBadge origin={thread.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {thread.targetType === "platform"
                          ? "Website issue thread"
                          : `Target: ${thread.targetUserName || "User"}`}
                      </p>
                    </div>
                    <AdminStatusBadge value={thread.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{thread.items.length} report{thread.items.length === 1 ? "" : "s"}</span>
                    <span>{thread.latestLabel}</span>
                    <span>Reporter: {thread.reporterName || "User"}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="admin-empty-state">No disputes found.</div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title={layeredActiveThread?.threadTitle || "Dispute thread"}
          description={
            layeredActiveThread
              ? layeredActiveThread.targetType === "platform"
                ? "Website reports stay grouped per reporting user."
                : "Booking-linked reports stay grouped with their target user."
              : "Select a thread to review dispute details and send an admin decision."
          }
        >
          {layeredActiveThread ? (
            <div className="space-y-4">
              {layeredActiveThread.items.map((item) => {
                const draft = getDraft(item);
                return (
                  <article key={item.id} className="admin-card-soft space-y-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {item.subject}
                          </p>
                          <DataOriginBadge origin={item.dataOrigin || layeredActiveThread.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                          <AdminStatusBadge value={item.status} />
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {item.reason} | {item.targetType === "platform" ? "Platform" : "User report"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.createdLabel}</p>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                      <p>
                        <span className="font-semibold text-foreground">Booking:</span>{" "}
                        {item.bookingLabel}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Reporter:</span>{" "}
                        {item.reporterName}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Client:</span>{" "}
                        {item.client}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Provider:</span>{" "}
                        {item.provider}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Target:</span>{" "}
                        {item.targetUserName}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Type:</span>{" "}
                        {item.targetType}
                      </p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_140px]">
                      <div>
                        <label className="admin-label">Status</label>
                        <div className="mt-2">
                          <AdminSelectField
                            value={draft.status}
                            onChange={(value) => updateDraft(item.id, "status", value)}
                            disabled={savingId === item.id}
                          >
                            {THREAD_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </AdminSelectField>
                        </div>
                      </div>

                      <div>
                        <label className="admin-label">Resolution note</label>
                        <textarea
                          rows={3}
                          value={draft.resolutionNote}
                          onChange={(event) =>
                            updateDraft(item.id, "resolutionNote", event.target.value)
                          }
                          placeholder="Add a note for the client and provider."
                          className="mt-2 w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleSave(item)}
                          disabled={savingId === item.id}
                          className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === item.id ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>

                    {item.resolutionNote ? (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                        Current note: {item.resolutionNote}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty-state">
              Select a dispute thread to review the conversation-style history.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminPageShell>
  );
}
