import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileDown, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import {
  downloadAdminExport,
  fetchAdminExportSettings,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
  downloadBlobFile,
} from "./AdminWorkspaceCommon";

export default function AdminExportSettings() {
  const [payload, setPayload] = useState(null);
  const [formats, setFormats] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState("");

  const loadExportSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminExportSettings();
      const nextPayload = response.data?.data || null;
      setPayload(nextPayload);
      setFormats((current) =>
        (nextPayload?.packages || []).reduce(
          (accumulator, item) => ({
            ...accumulator,
            [item.id]: current[item.id] || item.supportedFormats?.[0] || "pdf",
          }),
          {}
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load export center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExportSettings();
  }, []);

  const packages = payload?.packages || [];
  const summary = payload?.summary || {};
  const recentActivity = payload?.recentActivity || [];

  const handleDownload = async (packageId) => {
    try {
      setDownloadingId(packageId);
      const response = await downloadAdminExport({
        packageType: packageId,
        format: formats[packageId] || "pdf",
      });
      const fileName = downloadBlobFile(
        response,
        `${packageId}.${formats[packageId] || "pdf"}`
      );
      toast.success(`${fileName} downloaded successfully.`);
      await loadExportSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download export.");
    } finally {
      setDownloadingId("");
    }
  };

  if (loading && !payload) {
    return <AdminLoadingState label="Loading export center..." />;
  }

  return (
    <AdminPageShell
      title="Export Center"
      description="Download backend-generated platform snapshots in PDF or CSV and save them directly to your device."
      actions={
        <>
          <Link to="/admin/bookings" className="admin-button-secondary">
            <Users size={14} />
            Review bookings
          </Link>
          <Link to="/admin/settings/security" className="admin-button-primary">
            <ShieldCheck size={14} />
            Security audit
          </Link>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={FileDown} title="Export bundles" value={summary.exportBundles ?? 0} />
        <AdminStatCard icon={Download} title="Available formats" value={summary.availableFormats?.length ?? 0} tone="text-blue-600" />
        <AdminStatCard icon={ShieldCheck} title="Last activity" value={summary.lastExportedLabel || "Not exported yet"} tone="text-emerald-600" />
        <AdminStatCard icon={Users} title="Delivery target" value={summary.deliveryTarget || "Local device"} tone="text-violet-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <AdminPanel title="Available Export Packages" description="Choose a format for each export, then save the generated file to your device.">
          <div className="space-y-3">
            {packages.map((item) => (
              <div key={item.id} className="admin-card-soft flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <AdminStatusBadge value="multi-format export" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Download a backend-generated {item.title.toLowerCase()} package in PDF or CSV.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[140px]">
                    <AdminSelectField
                      value={formats[item.id] || "pdf"}
                      onChange={(value) =>
                        setFormats((current) => ({ ...current, [item.id]: value }))
                      }
                    >
                      {item.supportedFormats?.map((format) => (
                        <option key={format} value={format}>
                          {format.toUpperCase()}
                        </option>
                      ))}
                    </AdminSelectField>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(item.id)}
                    disabled={downloadingId === item.id}
                    className="admin-button-secondary"
                  >
                    <Download size={14} />
                    Download {String(formats[item.id] || "pdf").toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel title="Recent Export Activity">
            <div className="space-y-3">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="admin-card-soft">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                    <AdminStatusBadge value={entry.format} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{entry.fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.createdLabel}</p>
                </div>
              ))}
              {!recentActivity.length ? (
                <p className="text-xs text-muted-foreground">No exports have been generated yet.</p>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel title="Recommended Next Steps">
            <div className="space-y-3">
              <Link to="/admin/users" className="admin-button-secondary w-full justify-start">
                Open user management
              </Link>
              <Link to="/admin/settings/cache" className="admin-button-secondary w-full justify-start">
                Return to cache center
              </Link>
              <Link to="/admin/settings/advanced" className="admin-button-secondary w-full justify-start">
                Review advanced controls
              </Link>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPageShell>
  );
}
