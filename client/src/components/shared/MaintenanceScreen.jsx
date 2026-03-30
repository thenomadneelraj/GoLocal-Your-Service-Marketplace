import { Link } from "react-router-dom";
import { ShieldAlert, Wrench } from "lucide-react";

export default function MaintenanceScreen({
  platformName = "GoLocal",
  supportEmail = "support@golocal.com",
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-amber-400/20 blur-[120px]" />
        <div className="absolute bottom-[-12%] right-[-6%] h-80 w-80 rounded-full bg-orange-400/20 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-16">
        <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_-55px_rgba(251,191,36,0.65)] backdrop-blur-2xl md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-amber-200">
            <Wrench size={14} />
            Maintenance Mode
          </div>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30">
              <ShieldAlert size={30} />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {platformName} is temporarily paused for maintenance
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Client and provider access is currently disabled while the platform is being updated.
                Please check back shortly.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                Access Status
              </p>
              <p className="mt-3 text-sm font-semibold text-white">
                Public browsing, client dashboards, provider dashboards, bookings, and messaging are on hold.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                Support
              </p>
              <p className="mt-3 text-sm font-semibold text-white">{supportEmail}</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Contact support if you need urgent help while maintenance is active.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signin"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-400 px-6 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg shadow-amber-400/30 transition-all hover:scale-[1.01] hover:bg-amber-300"
            >
              Admin Sign In
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-sm font-bold uppercase tracking-[0.16em] text-slate-200 transition-all hover:bg-white/[0.08]"
            >
              Refresh Status
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
