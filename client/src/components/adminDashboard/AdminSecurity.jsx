import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck, UserRoundCog, Users } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminSecuritySettings,
  runAdminSecurityAudit,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminStatCard,
  AdminStatusBadge,
} from "./AdminWorkspaceCommon";

export default function AdminSecurity() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadSecurity = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminSecuritySettings();
      setPayload(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load security data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const handleRunAudit = async () => {
    try {
      setRunning(true);
      const response = await runAdminSecurityAudit();
      toast.success(response.data?.message || "Security audit completed.");
      await loadSecurity();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to run security audit.");
    } finally {
      setRunning(false);
    }
  };

  if (loading && !payload) {
    return <AdminLoadingState label="Loading security audit..." />;
  }

  const summary = payload?.summary || {};
  const checklist = payload?.checklist || [];

  return (
    <AdminPageShell
      title="Security Audit"
      description="Run a backend-generated security posture snapshot for approvals, disputes, elevated admin access, and recent login activity."
      actions={
        <>
          <Link to="/admin/users" className="admin-button-secondary">
            <Users size={14} />
            Review users
          </Link>
          <button type="button" onClick={handleRunAudit} disabled={running} className="admin-button-primary">
            <ShieldCheck size={14} />
            Run audit snapshot
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={UserRoundCog} title="Admin accounts" value={summary.adminAccounts ?? 0} />
        <AdminStatCard icon={Users} title="Pending approvals" value={summary.pendingApprovals ?? 0} tone="text-blue-600" />
        <AdminStatCard icon={AlertTriangle} title="Open disputes" value={summary.openDisputes ?? 0} tone="text-amber-600" />
        <AdminStatCard icon={ShieldCheck} title="Last audit run" value={summary.lastAuditLabel || "Not run yet"} tone="text-rose-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <AdminPanel title="Audit Checklist" description="Each item below is generated from the current backend state to help guide admin review.">
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.id} className="admin-card-soft flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
                <AdminStatusBadge value={item.status} />
              </div>
            ))}
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel title="Audit Guidance">
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>Admin accounts with elevated access: {summary.adminAccounts ?? 0}.</p>
              <p>Pending provider approvals currently in queue: {summary.pendingApprovals ?? 0}.</p>
              <p>Open disputes requiring continued attention: {summary.openDisputes ?? 0}.</p>
              <p>Last audit snapshot recorded at: {summary.lastAuditLabel || "Not run yet"}.</p>
            </div>
          </AdminPanel>

          <AdminPanel title="Follow-up Pages">
            <div className="space-y-3">
              <Link to="/admin/bookings" className="admin-button-secondary w-full justify-start">
                Review booking changes
              </Link>
              <Link to="/admin/disputes" className="admin-button-secondary w-full justify-start">
                Open disputes queue
              </Link>
              <Link to="/admin/settings/advanced" className="admin-button-secondary w-full justify-start">
                Open advanced controls
              </Link>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPageShell>
  );
}
