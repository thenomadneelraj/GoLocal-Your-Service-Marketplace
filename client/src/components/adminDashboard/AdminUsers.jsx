import { useEffect, useMemo, useState, useCallback } from "react";
import { Ban, CheckCircle2, Mail, RefreshCw, ShieldX, UserRound } from "lucide-react";
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
  formatAdminDateTime,
  downloadBlobFile,
} from "./AdminWorkspaceCommon";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockAdminUsers } from "@/lib/mockWorkspaceData";
import { useSocketEvent } from "@/components/contexts/WebSocketContext";

export default function AdminUsers() {
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [payload, setPayload] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("csv");

  // Load users function must be defined before it's referenced in useCallback
  const loadUsers = async (nextFilters = filters, forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await fetchAdminUsers(nextFilters, forceRefresh);
      setPayload(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time user updates via WebSocket
  const handleUserUpdate = useCallback((payload) => {
    console.log("[AdminUsers] Received user update:", payload);
    
    // Invalidate cache and refresh the users list when updates occur
    invalidateCache.users();
    loadUsers(filters, true);
    
    if (payload.message) {
      toast.success(payload.message);
    }
  }, [filters, loadUsers]);

  useSocketEvent("user_updated", handleUserUpdate);
  useSocketEvent("user_status_updated", handleUserUpdate);

  useEffect(() => {
    loadUsers(undefined, true);
  }, []);

  // Always call hooks before any conditional returns
  const summary = payload?.summary || {};
  const items = payload?.items || [];
  const layeredItems = useMemo(
    () =>
      mergeLayeredCollections(items, mockAdminUsers, {
        getId: (user) => user.id,
      }),
    [items]
  );
  const mockSummary = {
    totalUsers: mockAdminUsers.length,
    pendingApproval: mockAdminUsers.filter((user) => user.approvalStatus === "pending").length,
    approved: mockAdminUsers.filter((user) => user.approvalStatus === "approved").length,
    rejected: mockAdminUsers.filter((user) => user.approvalStatus === "rejected").length,
    suspended: mockAdminUsers.filter((user) => user.status === "suspended").length,
  };

  // Check if any filters are active
  const hasActiveFilters = filters.search !== "" || filters.role !== "all" || filters.status !== "all";

  // Calculate summary from layered items to ensure consistency between stats and list
  const layeredSummary = useMemo(() => {
    const realItems = layeredItems.filter(item => item.dataOrigin !== 'mock');
    const mockItemsOnly = layeredItems.filter(item => item.dataOrigin === 'mock');
    
    // If we have real items, use their summary; otherwise use mock summary
    if (realItems.length > 0) {
      return {
        totalUsers: realItems.length + (hasActiveFilters ? 0 : mockItemsOnly.length),
        pendingApproval: realItems.filter((item) => item.approvalStatus === "pending").length,
        approved: realItems.filter((item) => item.approvalStatus === "approved").length,
        rejected: realItems.filter((item) => item.approvalStatus === "rejected").length,
        suspended: realItems.filter((item) => item.status === "suspended").length,
      };
    }
    return mockSummary;
  }, [layeredItems, mockSummary, hasActiveFilters]);
  
  const resolvedSummary = hasActiveFilters ? layeredSummary : (summary.totalUsers ? summary : layeredSummary);

  if (loading && !payload) {
    return <AdminLoadingState label="Loading user approvals..." />;
  }

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadUsers(nextFilters, false);
  };

  const handleAction = async (userId, status) => {
    const targetUser = (payload?.items || []).find((user) => user.id === userId);
    if (targetUser?.dataOrigin === "mock") {
      toast.info("Sample users are read-only.");
      return;
    }

    if (status === "rejected") {
      const confirmed = window.confirm(
        "This will permanently delete the user and all their associated data. Are you sure?"
      );
      if (!confirmed) return;
    }

    try {
      setActionId(`${userId}:${status}`);
      
      // Optimistically update the UI immediately
      setPayload((prev) => {
        if (!prev) return prev;
        
        // For rejection, remove the user from the list entirely
        if (status === "rejected") {
          const nextItems = prev.items.filter((user) => user.id !== userId);
          return {
            ...prev,
            items: nextItems,
            summary: {
              ...prev.summary,
              totalUsers: Math.max(0, prev.summary.totalUsers - 1),
              rejected: Math.max(0, (prev.summary.rejected || 0) + 1),
            },
          };
        }
        
        // For other statuses, update the user's status
        const nextItems = prev.items.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              approvalStatus: status === "approved" ? "approved" : status,
              status: status === "approved" ? "active" : status,
            };
          }
          return user;
        });

        return {
          ...prev,
          items: nextItems,
        };
      });

      // Sync with backend
      const response = await updateAdminUserStatus(userId, { status });
      toast.success(response.data?.message || "User updated successfully.");

      // Invalidate cache and refresh to ensure we get latest data from DB
      invalidateCache.users();
      await loadUsers(filters, true);
    } catch (error) {
      // Revert optimistic update on error
      toast.error(error.response?.data?.message || "Failed to update user.");
      invalidateCache.users();
      await loadUsers(filters, true);
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
      toast.error(error.response?.data?.message || "Failed to download export.");
    }
  };

  const handleRefresh = () => {
    loadUsers(filters, true);
  };

  return (
    <AdminPageShell
      title="Users"
      description="Approve access, suspend accounts that should lose access, or permanently reject users you do not want on the platform."
      actions={
        <>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="admin-button-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard icon={UserRound} title="Total users" value={resolvedSummary.totalUsers ?? 0} />
        <AdminStatCard icon={Ban} title="Pending approval" value={resolvedSummary.pendingApproval ?? 0} tone="text-amber-600" />
        <AdminStatCard icon={CheckCircle2} title="Approved" value={resolvedSummary.approved ?? 0} tone="text-emerald-600" />
        <AdminStatCard icon={ShieldX} title="Rejected" value={resolvedSummary.rejected ?? 0} tone="text-rose-600" />
        <AdminStatCard icon={Ban} title="Suspended" value={resolvedSummary.suspended ?? 0} tone="text-slate-500" />
      </div>

      <AdminPanel>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
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
          <div className="flex items-end text-xs text-muted-foreground">
            {layeredItems.length} user(s) shown
          </div>
        </div>
      </AdminPanel>

      <div className="space-y-4">
        {layeredItems.map((user) => (
          <article
            key={user.id}
            className="admin-card flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
          >
            <div className="flex items-start gap-4">
              <span className="admin-icon-wrap text-slate-500">
                <UserRound size={16} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{user.name}</h3>
                  <span className="admin-badge admin-badge-muted">{user.role}</span>
                  <DataOriginBadge origin={user.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail size={12} />
                    Email profile active
                  </span>
                  <span>Joined: {formatAdminDateTime(user.joinedAt)}</span>
                  {user.serviceType ? <span>Service: {user.serviceType}</span> : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <AdminStatusBadge
                  value={user.approvalStatus === "approved" ? user.status : user.approvalStatus}
                />
              </div>
              {user.role !== "admin" && user.dataOrigin !== "mock" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(user.id, "approved")}
                    disabled={actionId === `${user.id}:approved`}
                    className="admin-button-success hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(user.id, "suspended")}
                    disabled={actionId === `${user.id}:suspended`}
                    className="admin-button-secondary hover:bg-yellow-500 transition-colors"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(user.id, "rejected")}
                    disabled={actionId === `${user.id}:rejected`}
                    className="admin-button-danger hover:bg-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
        {!layeredItems.length ? (
          <AdminPanel>
            <p className="admin-empty-state">No users matched the current filters.</p>
          </AdminPanel>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
