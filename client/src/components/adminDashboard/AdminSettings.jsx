import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HardDrive, ShieldCheck, Upload, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import { fetchAdminSettings, updateAdminSettings } from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSelectField,
} from "./AdminWorkspaceCommon";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  profileImage: "",
  platformName: "",
  supportEmail: "",
  currency: "INR",
  maintenanceMode: false,
  maintenanceMessage: "",
  commissionPercentage: 10,
};

export default function AdminSettings() {
  const { refreshProfile } = useAuth();
  const { refreshStatus } = useMaintenance();
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminSettings();
      const payload = response.data?.data || {};
      setStatus(payload.systemStatus || null);
      setForm({
        name: payload.profile?.name || "",
        email: payload.profile?.email || "",
        phone: payload.profile?.phone || "",
        address: payload.profile?.address || "",
        profileImage: payload.profile?.profileImage || "",
        platformName: payload.platform?.platformName || "",
        supportEmail: payload.platform?.supportEmail || "",
        currency: payload.platform?.currency || "INR",
        maintenanceMode: Boolean(payload.platform?.maintenanceMode),
        maintenanceMessage: payload.platform?.maintenanceMessage || "",
        commissionPercentage: Number(payload.platform?.commissionPercentage ?? 10),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await updateAdminSettings(form);
      toast.success(response.data?.message || "Settings saved.");
      await refreshProfile({ silent: true });
      await refreshStatus({ silent: true });
      await loadSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminLoadingState label="Loading admin settings..." />;
  }

  return (
    <AdminPageShell
      title="Admin Settings"
      description="Manage your personal information and platform-wide controls, including maintenance mode and support details."
      actions={
        <button
          type="submit"
          form="admin-settings-form"
          disabled={saving}
          className="admin-button-primary"
        >
          <Upload size={14} />
          Save Changes
        </button>
      }
    >
      <form
        id="admin-settings-form"
        onSubmit={handleSubmit}
        className="grid gap-5 xl:grid-cols-[1.1fr_1fr]"
      >
        <AdminPanel title="Personal Information" description="Update your admin workspace profile details.">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative inline-block">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xl font-semibold text-primary">
                  {form.profileImage ? (
                    <img src={form.profileImage} alt="Admin avatar" className="h-full w-full object-cover" />
                  ) : (
                    form.name?.charAt(0)?.toUpperCase() || "A"
                  )}
                </div>
                <label className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                  <span className="text-sm font-bold leading-none pb-0.5">+</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleChange("profileImage", reader.result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="admin-label">Full Name</label>
              <input className="admin-input mt-2" value={form.name} onChange={(event) => handleChange("name", event.target.value)} />
            </div>
            <div>
              <label className="admin-label">Email Address</label>
              <input className="admin-input mt-2" value={form.email} onChange={(event) => handleChange("email", event.target.value)} />
            </div>
            <div>
              <label className="admin-label">Phone Number</label>
              <input className="admin-input mt-2" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} />
            </div>
            <div>
              <label className="admin-label">Address</label>
              <textarea className="admin-textarea mt-2" value={form.address} onChange={(event) => handleChange("address", event.target.value)} />
            </div>
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel title="Platform Settings" description="Control platform status, support channels, and the maintenance banner.">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-label">Platform Name</label>
                  <input className="admin-input mt-2" value={form.platformName} onChange={(event) => handleChange("platformName", event.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Support Email</label>
                  <input className="admin-input mt-2" value={form.supportEmail} onChange={(event) => handleChange("supportEmail", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-label">Currency</label>
                  <div className="mt-2">
                    <AdminSelectField value={form.currency} onChange={(value) => handleChange("currency", value)}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </AdminSelectField>
                  </div>
                </div>
                <div>
                  <label className="admin-label">Commission Percentage</label>
                  <input
                    className="admin-input mt-2"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.commissionPercentage}
                    onChange={(event) => {
                      const value = event.target.value;
                      // Allow empty value or valid numbers
                      if (value === "" || !isNaN(Number(value))) {
                        // If empty, keep the current value or default to 10
                        const newValue = value === "" ? 10 : Number(value);
                        handleChange("commissionPercentage", newValue);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="admin-card-soft flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep admin access available while public browsing and dashboards are paused.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("maintenanceMode", !form.maintenanceMode)}
                  className={form.maintenanceMode ? "admin-button-primary" : "admin-button-secondary"}
                >
                  <Wrench size={14} />
                  {form.maintenanceMode ? "Maintenance On" : "Maintenance Off"}
                </button>
              </div>
              <div>
                <label className="admin-label">Maintenance Message</label>
                <textarea
                  className="admin-textarea mt-2"
                  value={form.maintenanceMessage}
                  onChange={(event) => handleChange("maintenanceMessage", event.target.value)}
                />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="System Status" description="Live backend status surfaced from the current admin workspace configuration.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="admin-card-soft">
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{status?.database || "Connected"}</p>
              </div>
              <div className="admin-card-soft">
                <p className="text-xs text-muted-foreground">API Status</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{status?.apiStatus || "Healthy"}</p>
              </div>
              <div className="admin-card-soft">
                <p className="text-xs text-muted-foreground">Websocket Monitoring</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {status?.websocketMonitoring ? "Monitored" : "Disabled"}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Quick Actions" description="Open the related admin pages for cache, export, security, and advanced controls.">
            <div className="grid gap-3 md:grid-cols-2">
              <Link to="/admin/settings/cache" className="admin-button-secondary justify-start">
                <HardDrive size={14} />
                Cache Center
              </Link>
              <Link to="/admin/settings/export" className="admin-button-secondary justify-start">
                <Upload size={14} />
                Export Data
              </Link>
              <Link to="/admin/settings/security" className="admin-button-secondary justify-start">
                <ShieldCheck size={14} />
                Security Audit
              </Link>
              <Link to="/admin/settings/advanced" className="admin-button-secondary justify-start">
                <Wrench size={14} />
                Advanced Settings
              </Link>
            </div>
          </AdminPanel>
        </div>
      </form>
    </AdminPageShell>
  );
}
