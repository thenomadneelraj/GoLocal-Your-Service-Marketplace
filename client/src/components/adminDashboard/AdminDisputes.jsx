import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminDisputes,
  fetchAdminDisputesSummary,
  updateAdminDisputeStatus,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
} from "./AdminWorkspaceCommon";

export default function AdminDisputes() {
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const loadDisputes = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const [summaryResponse, disputesResponse] = await Promise.all([
        fetchAdminDisputesSummary(),
        fetchAdminDisputes(nextFilters),
      ]);
      setSummary(summaryResponse.data?.data || null);
      setItems(disputesResponse.data?.data?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadDisputes(nextFilters);
  };

  const handleStatusChange = async (disputeId, status) => {
    try {
      setSavingId(disputeId);
      const response = await updateAdminDisputeStatus(disputeId, { status });
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

  return (
    <AdminPageShell
      title="Dispute Management"
      description="Review and resolve disputes between clients and providers. Target response time stays aligned with the backend escalation window."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={CircleDashed} title="Open" value={summary?.open ?? 0} />
        <AdminStatCard icon={ShieldAlert} title="Under review" value={summary?.underReview ?? 0} tone="text-blue-600" />
        <AdminStatCard icon={AlertTriangle} title="High priority" value={summary?.highPriority ?? 0} tone="text-rose-600" />
        <AdminStatCard icon={CheckCircle2} title="Resolved" value={summary?.resolved ?? 0} tone="text-emerald-600" />
      </div>

      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <AdminSearchField
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            placeholder="Search disputes..."
          />
          <AdminSelectField
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </AdminSelectField>
        </div>
      </AdminPanel>

      <AdminPanel>
        {items.length ? (
          <div className="space-y-3">
            {items.map((dispute) => (
              <article
                key={dispute.id}
                className="admin-card-soft flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{dispute.reason}</p>
                    <AdminStatusBadge value={dispute.status} />
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{dispute.description}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{dispute.booking}</span>
                    <span>Client: {dispute.client}</span>
                    <span>Provider: {dispute.provider}</span>
                    <span>{dispute.createdLabel}</span>
                  </div>
                </div>
                <div className="w-full max-w-[220px]">
                  <label className="admin-label">Update status</label>
                  <div className="mt-2">
                    <AdminSelectField
                      value={dispute.status}
                      onChange={(value) => handleStatusChange(dispute.id, value)}
                      disabled={savingId === dispute.id}
                    >
                      <option value="open">Open</option>
                      <option value="under_review">Under review</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </AdminSelectField>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">No disputes found.</div>
        )}
      </AdminPanel>
    </AdminPageShell>
  );
}
