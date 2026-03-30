import { AlertTriangle, Mail, ShieldAlert } from "lucide-react";

export default function RestrictedAccountBanner({
  title,
  description,
  supportEmail = "support@golocal.com",
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-card/95 p-8 shadow-[0_28px_80px_-40px_rgba(217,119,6,0.45)]">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-amber-400/25 via-amber-300/8 to-transparent" />
      <div className="relative space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          <ShieldAlert size={14} />
          Limited Access
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-foreground italic">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.75rem] border border-border/60 bg-muted/20 p-5 md:grid-cols-2">
          <div className="rounded-[1.25rem] border border-border/50 bg-background/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Allowed Right Now
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Dashboard access and admin contact information only.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/50 bg-background/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Contact Admin
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Mail size={14} />
              {supportEmail}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
