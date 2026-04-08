import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Mail, ShieldX, UserRound } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminUsers, updateAdminUserStatus } from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
  formatAdminDateTime,
} from "./AdminWorkspaceCommon";

export default function AdminUsers() {
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [payload, setPayload] = useState(null);

  const loadUsers = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const response = await fetchAdminUsers(nextFilters);
      setPayload(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadUsers(nextFilters);
  };

  const handleAction = async (userId, status) => {
    try {
      setActionId(`${userId}:${status}`);
      const response = await updateAdminUserStatus(userId, { status });
      toast.success(response.data?.message || "User updated successfully.");
      await loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user.");
    } finally {
      setActionId("");
    }
  };

  if (loading && !payload) {
    return <AdminLoadingState label="Loading user approvals..." />;
  }

  const summary = payload?.summary || {};
  const items = payload?.items || [];

  return (
    <AdminPageShell
      title="Users"
      description="Approve access, suspend accounts that should lose access, or permanently reject users you do not want on the platform."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard icon={UserRound} title="Total users" value={summary.totalUsers ?? 0} />
        <AdminStatCard icon={Ban} title="Pending approval" value={summary.pendingApproval ?? 0} tone="text-amber-600" />
        <AdminStatCard icon={CheckCircle2} title="Approved" value={summary.approved ?? 0} tone="text-emerald-600" />
        <AdminStatCard icon={ShieldX} title="Rejected" value={summary.rejected ?? 0} tone="text-rose-600" />
        <AdminStatCard icon={Ban} title="Suspended" value={summary.suspended ?? 0} tone="text-slate-500" />
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
            {payload?.totalShown ?? 0} user(s) shown
          </div>
        </div>
      </AdminPanel>

      <div className="space-y-4">
        {items.map((user) => (
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
              <AdminStatusBadge value={user.approvalStatus === "approved" ? user.status : user.approvalStatus} />
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
            </div>
          </article>
        ))}
        {!items.length ? (
          <AdminPanel>
            <p className="admin-empty-state">No users matched the current filters.</p>
          </AdminPanel>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
