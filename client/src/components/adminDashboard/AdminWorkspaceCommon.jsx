import { Loader2, Search, Shield } from "lucide-react";

const STATUS_TONES = {
  active: "admin-badge-success",
  approved: "admin-badge-success",
  accepted: "admin-badge-info",
  completed: "admin-badge-success",
  paid: "admin-badge-success",
  success: "admin-badge-success",
  settled: "admin-badge-success",
  enabled: "admin-badge-success",
  stable: "admin-badge-success",
  contained: "admin-badge-success",
  "tight scope": "admin-badge-success",
  pending: "admin-badge-warning",
  "pending payout": "admin-badge-warning",
  "under review": "admin-badge-info",
  under_review: "admin-badge-info",
  open: "admin-badge-warning",
  review: "admin-badge-warning",
  watch: "admin-badge-warning",
  watchlist: "admin-badge-warning",
  suspended: "admin-badge-danger",
  rejected: "admin-badge-danger",
  failed: "admin-badge-danger",
  investigate: "admin-badge-danger",
  cancelled: "admin-badge-muted",
  resolved: "admin-badge-success",
  monitored: "admin-badge-info",
  pdf: "admin-badge-info",
  csv: "admin-badge-info",
  disabled: "admin-badge-muted",
  healthy: "admin-badge-success",
  live: "admin-badge-warning",
  clean: "admin-badge-info",
  default: "admin-badge-muted",
};

export const formatAdminCurrency = (value = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatAdminDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getAdminStatusTone = (value = "") =>
  STATUS_TONES[String(value || "").trim().toLowerCase()] || STATUS_TONES.default;

export function AdminPageShell({
  title,
  description,
  actions = null,
  children,
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="admin-page-kicker">Admin Workspace</p>
          <h1 className="admin-page-title">{title}</h1>
          {description ? (
            <p className="admin-page-description mt-2 max-w-3xl">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminStatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  tone = "text-primary",
}) {
  return (
    <article className="admin-card flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {Icon ? (
        <span className={`admin-icon-wrap ${tone}`}>
          <Icon size={17} />
        </span>
      ) : null}
    </article>
  );
}

export function AdminPanel({ title, description, actions = null, children, className = "" }) {
  return (
    <section className={`admin-card ${className}`.trim()}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminStatusBadge({ value }) {
  return (
    <span className={`admin-badge ${getAdminStatusTone(value)}`}>
      {String(value || "unknown").replace(/_/g, " ")}
    </span>
  );
}

export function AdminSearchField({
  value,
  onChange,
  placeholder = "Search admin workspace",
  ...props
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="admin-input pl-10"
        {...props}
      />
    </label>
  );
}

export function AdminSelectField({ value, onChange, children, ...props }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="admin-select"
      {...props}
    >
      {children}
    </select>
  );
}

export function AdminLoadingState({ label = "Loading admin data..." }) {
  return (
    <div className="admin-card flex min-h-[220px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="animate-spin text-primary" size={22} />
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
    </div>
  );
}

export function AdminEmptyState({ title = "No records found", description = "Try adjusting your filters." }) {
  return (
    <div className="admin-empty-state">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <span className="admin-icon-wrap">
          <Shield size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function downloadBlobFile(response, fallbackFileName = "export.bin") {
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] || fallbackFileName;
  const blob = new Blob([response.data], {
    type: response.headers?.["content-type"] || "application/octet-stream",
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
  return fileName;
}
