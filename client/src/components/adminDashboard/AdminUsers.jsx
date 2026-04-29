import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  RefreshCw,
  ShieldX,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadAdminExport,
  fetchAdminUsers,
  updateAdminUserStatus,
} from "@/lib/cachedAdminApi";
import { invalidateCache } from "@/lib/dataCache";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
  downloadBlobFile,
  formatAdminDateTime,
} from "./AdminWorkspaceCommon";
import { useSocketEvent } from "@/components/contexts/WebSocketContext";

const DEFAULT_FILTERS = {
  search: "",
  role: "all",
  status: "all",
};

const getUserStatusValue = (user) =>
  ["suspended", "rejected"].includes(user.status)
    ? user.status
    : user.approvalStatus === "approved"
      ? user.status
      : user.approvalStatus;

export default function AdminUsers() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [payload, setPayload] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("csv");

  const loadUsers = useCallback(async (nextFilters = DEFAULT_FILTERS, forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await fetchAdminUsers(nextFilters, forceRefresh);
      setPayload(response.data?.data || response.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users.");
      setPayload({ summary: {}, items: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUserUpdate = useCallback(
    (eventPayload) => {
      invalidateCache.users();
      loadUsers(filters, true);

      if (eventPayload?.message) {
        toast.success(eventPayload.message);
      }
    },
    [filters, loadUsers],
  );

  useSocketEvent("user_updated", handleUserUpdate);
  useSocketEvent("user_status_updated", handleUserUpdate);

  useEffect(() => {
    loadUsers(DEFAULT_FILTERS, true);
  }, [loadUsers]);

  const users = useMemo(() => payload?.items || [], [payload]);
  const hasActiveFilters =
    filters.search !== "" || filters.role !== "all" || filters.status !== "all";

  const calculatedSummary = useMemo(
    () => ({
      totalUsers: users.length,
      pendingApproval: users.filter((user) => user.approvalStatus === "pending")
        .length,
      approved: users.filter((user) => user.approvalStatus === "approved")
        .length,
      rejected: users.filter(
        (user) => user.approvalStatus === "rejected" || user.status === "rejected",
      ).length,
      suspended: users.filter((user) => user.status === "suspended").length,
    }),
    [users],
  );

  const summary =
    !hasActiveFilters && payload?.summary?.totalUsers !== undefined
      ? payload.summary
      : calculatedSummary;

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadUsers(nextFilters, true);
  };

  const handleRefresh = () => {
    invalidateCache.users();
    loadUsers(filters, true);
  };

  const handleAction = async (userId, status) => {
    if (status === "rejected") {
      const confirmed = window.confirm(
        "This will permanently delete the user and all their associated data. Are you sure?",
      );
      if (!confirmed) return;
    }

    try {
      setActionId(`${userId}:${status}`);
      await updateAdminUserStatus(userId, { status });
      toast.success("User updated successfully.");
      invalidateCache.users();
      invalidateCache.dashboard();
      await loadUsers(filters, true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user.");
    } finally {
      setActionId("");
    }
  };

  const handleExport = async () => {
    try {
      const response = await downloadAdminExport({
        packageType: "users",
        format: downloadFormat,
      });
      const fileName = downloadBlobFile(response, `users.${downloadFormat}`);
      toast.success(`${fileName} downloaded successfully.`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to download export.",
      );
    }
  };

  if (loading && !payload) {
    return <AdminLoadingState label="Loading user approvals..." />;
  }

  return (
    <AdminPageShell
      title="Users"
      description="Review client and provider accounts, approvals, and access status."
      actions={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="admin-button-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <AdminStatCard
          icon={UserRound}
          title="Total users"
          value={summary.totalUsers ?? 0}
        />
        <AdminStatCard
          icon={Ban}
          title="Pending approval"
          value={summary.pendingApproval ?? 0}
          tone="text-amber-600"
        />
        <AdminStatCard
          icon={CheckCircle2}
          title="Approved"
          value={summary.approved ?? 0}
          tone="text-emerald-600"
        />
        <AdminStatCard
          icon={ShieldX}
          title="Rejected"
          value={summary.rejected ?? 0}
          tone="text-rose-600"
        />
        <AdminStatCard
          icon={Ban}
          title="Suspended"
          value={summary.suspended ?? 0}
          tone="text-slate-500"
        />
      </div>

      <AdminPanel>
        <div className="grid gap-3 xl:grid-cols-[1.35fr_0.8fr_0.9fr_0.55fr_auto]">
          <div>
            <label className="admin-label">Search</label>
            <div className="mt-2">
              <AdminSearchField
                value={filters.search}
                onChange={(value) => handleFilterChange("search", value)}
                placeholder="name or email"
              />
            </div>
          </div>
          <div>
            <label className="admin-label">Role</label>
            <div className="mt-2">
              <AdminSelectField
                value={filters.role}
                onChange={(value) => handleFilterChange("role", value)}
              >
                <option value="all">All roles</option>
                <option value="client">Client</option>
                <option value="provider">Provider</option>
              </AdminSelectField>
            </div>
          </div>
          <div>
            <label className="admin-label">Approval Status</label>
            <div className="mt-2">
              <AdminSelectField
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
              </AdminSelectField>
            </div>
          </div>
          <div>
            <label className="admin-label">Export</label>
            <div className="mt-2">
              <AdminSelectField
                value={downloadFormat}
                onChange={setDownloadFormat}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="pdf">PDF</option>
              </AdminSelectField>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="admin-button-primary h-11 whitespace-nowrap"
            >
              Export
            </button>
            <span className="whitespace-nowrap pb-3 text-xs text-muted-foreground">
              {users.length} shown
            </span>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="User Directory"
        description="Live client and provider accounts from the database."
      >
        <div className="admin-table-shell overflow-x-auto">
          <table className="admin-table">
            <thead className="admin-table-head">
              <tr>
                <th className="admin-table-head-cell">User</th>
                <th className="admin-table-head-cell">Role</th>
                <th className="admin-table-head-cell">Status</th>
                <th className="admin-table-head-cell">Joined</th>
                <th className="admin-table-head-cell">Service</th>
                <th className="admin-table-head-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {users.map((user) => (
                <tr key={user.id} className="admin-table-row">
                  <td className="admin-cell">
                    <div className="flex items-center gap-3">
                      <span className="admin-icon-wrap text-slate-500">
                        <UserRound size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="admin-cell-strong truncate font-semibold">
                          {user.name}
                        </p>
                        <p className="admin-cell-muted truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="admin-cell capitalize">{user.role}</td>
                  <td className="admin-cell">
                    <AdminStatusBadge value={getUserStatusValue(user)} />
                  </td>
                  <td className="admin-cell">
                    {formatAdminDateTime(user.joinedAt) || "Not available"}
                  </td>
                  <td className="admin-cell">
                    {user.serviceType || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="admin-cell">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(user.id, "approved")}
                        disabled={actionId === `${user.id}:approved`}
                        className="admin-pill-button admin-pill-button-success"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(user.id, "suspended")}
                        disabled={actionId === `${user.id}:suspended`}
                        className="admin-pill-button admin-pill-button-warning"
                      >
                        Suspend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(user.id, "rejected")}
                        disabled={actionId === `${user.id}:rejected`}
                        className="admin-pill-button admin-pill-button-danger"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td className="admin-empty-state" colSpan={6}>
                    No users matched the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
