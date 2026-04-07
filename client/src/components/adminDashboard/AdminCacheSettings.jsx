import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HardDrive, RefreshCcw, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  clearAdminCache,
  fetchAdminCacheSettings,
  refreshAdminCache,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminStatCard,
  AdminStatusBadge,
} from "./AdminWorkspaceCommon";

export default function AdminCacheSettings() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState("");

  const loadCacheSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminCacheSettings();
      setPayload(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load cache settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCacheSettings();
  }, []);

  const handleRefresh = async () => {
    try {
      setWorkingAction("refresh");
      const response = await refreshAdminCache();
      toast.success(response.data?.message || "Cache overview refreshed.");
      await loadCacheSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to refresh cache overview.");
    } finally {
      setWorkingAction("");
    }
  };

  const handleClear = async () => {
    try {
      setWorkingAction("clear");
      const response = await clearAdminCache();
      toast.success(response.data?.message || "Cache cleared successfully.");
      await loadCacheSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clear cache.");
    } finally {
      setWorkingAction("");
    }
  };

  if (loading && !payload) {
    return <AdminLoadingState label="Loading cache center..." />;
  }

  const summary = payload?.summary || {};
  const layers = payload?.layers || [];

  return (
    <AdminPageShell
      title="Cache Center"
      description="Review cache layers, keep admin workloads responsive, and clear framework cache safely from the admin workspace."
      actions={
        <>
          <button type="button" onClick={handleRefresh} disabled={workingAction === "refresh"} className="admin-button-secondary">
            <RefreshCcw size={14} />
            Refresh overview
          </button>
          <button type="button" onClick={handleClear} disabled={workingAction === "clear"} className="admin-button-primary">
            <Trash2 size={14} />
            Clear cache now
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={HardDrive} title="Cache layers tracked" value={summary.cacheLayersTracked ?? 0} />
        <AdminStatCard icon={RefreshCcw} title="Cache store" value={summary.cacheStore || "FILE"} tone="text-blue-600" />
        <AdminStatCard icon={ShieldCheck} title="Compiled views" value={summary.compiledViews ?? 0} tone="text-emerald-600" />
        <AdminStatCard icon={Wrench} title="Last cleared" value={summary.lastClearedLabel || "Not cleared yet"} tone="text-violet-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <AdminPanel title="Cache Layer Health" description="Live backend status for the framework cache layers most visible to admin operations.">
          <div className="space-y-3">
            {layers.map((layer) => (
              <div key={layer.id} className="admin-card-soft flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{layer.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{layer.description}</p>
                </div>
                <AdminStatusBadge value={layer.status} />
              </div>
            ))}
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel title="Maintenance Routine">
            <ul className="space-y-3 text-xs leading-6 text-muted-foreground">
              <li>Clear stale cached responses before major marketplace updates.</li>
              <li>Warm critical dashboards after cache resets to reduce first-load latency.</li>
              <li>Review queue workers and websocket health after infrastructure changes.</li>
              <li>Use export snapshots before broad data maintenance or cleanup tasks.</li>
            </ul>
          </AdminPanel>

          <AdminPanel title="Linked Admin Tools">
            <div className="space-y-3">
              <Link to="/admin/settings/export" className="admin-button-secondary w-full justify-start">
                Review export packages
              </Link>
              <Link to="/admin/settings/security" className="admin-button-secondary w-full justify-start">
                Review security posture
              </Link>
              <Link to="/admin/settings/advanced" className="admin-button-secondary w-full justify-start">
                Open advanced settings
              </Link>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPageShell>
  );
}
