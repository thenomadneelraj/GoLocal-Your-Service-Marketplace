import { useEffect, useState } from "react";
import { Settings2, Percent, Wrench } from "lucide-react";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
} from "@/lib/adminApi";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchPlatformSettings();
      setSettings(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!settings) return;

    try {
      setLoading(true);
      setError("");
      await updatePlatformSettings({
        commissionPercentage: settings.commissionPercentage,
        platformName: settings.platformName,
        maintenanceMode: settings.maintenanceMode,
      });
      await loadSettings();
    } catch (err) {
      console.error(err);
      setError("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  if (!settings && loading) {
    return (
      <section className="space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-900/70" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Platform
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-50">
            Platform Settings
          </h2>
          <p className="text-xs text-slate-500">
            Control global commission, branding, and maintenance mode.
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      {settings && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/80"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-400">
              <Settings2 size={14} className="text-sky-400" />
              <span className="font-medium text-slate-100">Core config</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-xs">
              <label className="text-[11px] text-slate-400">
                Platform name
              </label>
              <input
                type="text"
                value={settings.platformName || ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    platformName: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="flex items-center gap-1 text-[11px] text-slate-400">
                <Percent size={12} />
                Commission percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.commissionPercentage ?? 0}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    commissionPercentage: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/10 text-amber-300">
                  <Wrench size={13} />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-50">
                    Maintenance mode
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Temporarily pause bookings while you perform upgrades.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    maintenanceMode: !prev.maintenanceMode,
                  }))
                }
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
                  settings.maintenanceMode
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-emerald-500/15 text-emerald-200"
                }`}
              >
                {settings.maintenanceMode ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}
    </section>
  );
}

