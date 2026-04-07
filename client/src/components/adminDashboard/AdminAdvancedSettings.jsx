import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HardDrive, Save, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminAdvancedSettings,
  updateAdminAdvancedSettings,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSelectField,
  AdminStatusBadge,
  AdminStatCard,
} from "./AdminWorkspaceCommon";

const INITIAL_FORM = {
  controlDepth: "High",
  automationProfile: "Managed",
  exportRetentionDays: 30,
  manualProviderReview: true,
  disputeEscalationHours: 4,
  bookingReminderHours: 24,
  websocketMonitoring: true,
};

export default function AdminAdvancedSettings() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [guardrails, setGuardrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAdvancedSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminAdvancedSettings();
      const payload = response.data?.data || {};
      setForm({
        controlDepth: payload.controlDepth || "High",
        automationProfile: payload.automationProfile || "Managed",
        exportRetentionDays: Number(payload.exportRetentionDays || 30),
        manualProviderReview: Boolean(payload.manualProviderReview),
        disputeEscalationHours: Number(payload.disputeEscalationHours || 4),
        bookingReminderHours: Number(payload.bookingReminderHours || 24),
        websocketMonitoring: Boolean(payload.websocketMonitoring),
      });
      setGuardrails(payload.guardrails || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load advanced settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvancedSettings();
  }, []);

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateAdminAdvancedSettings(form);
      toast.success(response.data?.message || "Advanced settings saved.");
      await loadAdvancedSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save advanced settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminLoadingState label="Loading advanced settings..." />;
  }

  return (
    <AdminPageShell
      title="Advanced Settings"
      description="Save deeper runtime, automation, and governance settings directly to the backend profile for your admin workspace."
      actions={
        <>
          <Link to="/admin/settings/cache" className="admin-button-secondary">
            <HardDrive size={14} />
            Cache Center
          </Link>
          <button type="button" onClick={handleSave} disabled={saving} className="admin-button-primary">
            <Save size={14} />
            Save advanced settings
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Control depth" value={form.controlDepth} />
        <AdminStatCard title="Automation profile" value={form.automationProfile} tone="text-blue-600" />
        <AdminStatCard title="Reminder window" value={`${form.bookingReminderHours}h`} tone="text-emerald-600" />
        <AdminStatCard title="Export retention" value={`${form.exportRetentionDays}d`} tone="text-violet-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <AdminPanel title="Advanced Control Areas" description="These settings are now loaded from and saved back to the backend settings store.">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-label">Control Depth</label>
                  <div className="mt-2">
                    <AdminSelectField value={form.controlDepth} onChange={(value) => handleChange("controlDepth", value)}>
                      <option value="Low">Low</option>
                      <option value="Managed">Managed</option>
                      <option value="High">High</option>
                    </AdminSelectField>
                  </div>
                </div>
                <div>
                  <label className="admin-label">Automation Profile</label>
                  <div className="mt-2">
                    <AdminSelectField value={form.automationProfile} onChange={(value) => handleChange("automationProfile", value)}>
                      <option value="Manual">Manual</option>
                      <option value="Managed">Managed</option>
                      <option value="Strict">Strict</option>
                    </AdminSelectField>
                  </div>
                </div>
              </div>

              <div className="admin-card-soft flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Require manual provider review</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep new provider accounts in manual review before operational approval.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("manualProviderReview", !form.manualProviderReview)}
                  className={form.manualProviderReview ? "admin-button-primary" : "admin-button-secondary"}
                >
                  {form.manualProviderReview ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-label">Dispute escalation threshold (hours)</label>
                  <input
                    type="number"
                    min="1"
                    className="admin-input mt-2"
                    value={form.disputeEscalationHours}
                    onChange={(event) => handleChange("disputeEscalationHours", Number(event.target.value))}
                  />
                </div>
                <div>
                  <label className="admin-label">Booking reminder window (hours)</label>
                  <input
                    type="number"
                    min="1"
                    className="admin-input mt-2"
                    value={form.bookingReminderHours}
                    onChange={(event) => handleChange("bookingReminderHours", Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-label">Export retention (days)</label>
                  <input
                    type="number"
                    min="1"
                    className="admin-input mt-2"
                    value={form.exportRetentionDays}
                    onChange={(event) => handleChange("exportRetentionDays", Number(event.target.value))}
                  />
                </div>
                <div className="admin-card-soft flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable websocket monitoring</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Track realtime delivery health for notifications, messaging, and booking updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange("websocketMonitoring", !form.websocketMonitoring)}
                    className={form.websocketMonitoring ? "admin-button-primary" : "admin-button-secondary"}
                  >
                    {form.websocketMonitoring ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel title="Guardrails">
            <div className="space-y-3">
              {guardrails.map((guardrail) => (
                <div key={guardrail.id} className="admin-card-soft flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{guardrail.title}</p>
                  <AdminStatusBadge value={guardrail.label} />
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Related Admin Pages">
            <div className="space-y-3">
              <Link to="/admin/settings/export" className="admin-button-secondary w-full justify-start">
                <Upload size={14} />
                Open export center
              </Link>
              <Link to="/admin/contact-messages" className="admin-button-secondary w-full justify-start">
                <ShieldCheck size={14} />
                Review support inbox
              </Link>
              <Link to="/admin/settings/security" className="admin-button-secondary w-full justify-start">
                <ShieldCheck size={14} />
                Run security audit
              </Link>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPageShell>
  );
}
