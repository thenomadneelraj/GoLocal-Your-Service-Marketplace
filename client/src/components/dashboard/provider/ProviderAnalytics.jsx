import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  Download,
  PieChart as PieChartIcon,
  RefreshCcw,
  Star,
  Users,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import RestrictedAccountBanner from "@/components/shared/RestrictedAccountBanner";
import { getAccountAccessState } from "@/lib/accountAccess";
import api from "@/lib/api";

const EMPTY_DASHBOARD = {
  summary: {
    appointmentsBooked: 0,
    pendingRequests: 0,
    totalIncome: 0,
    totalClients: 0,
  },
  earnings7d: [],
  earnings6m: [],
  todaySchedule: [],
  recentAppointments: [],
  topServices: [],
  currency: "INR",
};

const PIE_COLORS = [
  "rgb(16, 185, 129)",
  "rgb(14, 165, 233)",
  "rgb(99, 102, 241)",
  "rgb(249, 115, 22)",
  "rgb(236, 72, 153)",
];

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Date not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const downloadBlob = (blobData, filename) => {
  const blob = new Blob([blobData]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function Panel({ className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_24px_60px_-42px_rgba(4,24,15,0.55)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

export default function ProviderAnalytics() {
  const { user } = useAuth();
  const { supportEmail } = useMaintenance();
  const accountAccess = getAccountAccessState(user);
  const [loading, setLoading] = useState(true);
  const [downloadFormat, setDownloadFormat] = useState("csv");
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [earningsTrend, setEarningsTrend] = useState([]);
  const [bookingsTrend, setBookingsTrend] = useState([]);
  const [ratingBreakdown, setRatingBreakdown] = useState([]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [
        dashboardResponse,
        earningsResponse,
        bookingsResponse,
        servicesResponse,
      ] = await Promise.all([
        api.get("/api/providers/stats/dashboard"),
        api.get("/api/providers/stats/earnings"),
        api.get("/api/providers/stats/bookings"),
        api.get("/api/providers/stats/services"),
      ]);

      setDashboard({
        ...EMPTY_DASHBOARD,
        ...(dashboardResponse.data?.data || {}),
      });
      setEarningsTrend(earningsResponse.data?.data || []);
      setBookingsTrend(bookingsResponse.data?.data || []);
      setRatingBreakdown(servicesResponse.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load provider analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountAccess.restricted) {
      setLoading(false);
      return;
    }
    loadAnalytics();
  }, [accountAccess.restricted]);

  const currency = dashboard.currency || "INR";

  const metrics = useMemo(
    () => [
      {
        label: "Revenue",
        value: formatCurrency(dashboard.summary.totalIncome, currency),
        note: "Net provider earnings after fee deduction",
        icon: CircleDollarSign,
        accent: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        label: "Bookings",
        value: Number(dashboard.summary.appointmentsBooked || 0).toLocaleString("en-IN"),
        note: "Accepted and active appointments",
        icon: CalendarDays,
        accent: "text-sky-600 bg-sky-500/10 border-sky-500/20",
      },
      {
        label: "Pending Requests",
        value: Number(dashboard.summary.pendingRequests || 0).toLocaleString("en-IN"),
        note: "Requests still waiting for your decision",
        icon: Briefcase,
        accent: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      },
      {
        label: "Active Clients",
        value: Number(dashboard.summary.totalClients || 0).toLocaleString("en-IN"),
        note: "Distinct clients across live bookings",
        icon: Users,
        accent: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
      },
    ],
    [currency, dashboard.summary]
  );

  const ratingsPie = useMemo(
    () =>
      (ratingBreakdown.length ? ratingBreakdown : [{ name: "No Ratings", value: 1 }]).map(
        (item, index) => ({
          ...item,
          color: PIE_COLORS[index % PIE_COLORS.length],
        })
      ),
    [ratingBreakdown]
  );

  const handleExport = async () => {
    const extension = downloadFormat === "xlsx" ? "xlsx" : downloadFormat;

    try {
      const response = await api.get("/api/providers/stats/payouts/export", {
        params: { format: downloadFormat },
        responseType: "blob",
      });
      downloadBlob(
        response.data,
        `provider-analytics-export-${Date.now()}.${extension}`
      );
      toast.success("Provider export downloaded.");
    } catch (error) {
      toast.error("Could not export provider analytics.");
    }
  };

  if (accountAccess.restricted) {
    return (
      <div className="space-y-6 pb-10">
        <RestrictedAccountBanner
          title={accountAccess.title}
          description={accountAccess.description}
          supportEmail={supportEmail}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-[380px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-8" />
          <div className="h-[380px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-4" />
          <div className="h-[320px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-6" />
          <div className="h-[320px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <Panel className="relative p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Provider Analytics
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Business performance from live bookings
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Your analytics page now reads real provider stats, earnings, booking
              trends, and review distribution from the backend instead of static demo data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={downloadFormat}
              onChange={(event) => setDownloadFormat(event.target.value)}
              className="h-10 rounded-full border border-border/60 bg-background px-3 text-xs font-semibold"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="pdf">PDF</option>
            </select>

            <Button
              variant="outline"
              className="h-10 rounded-full border-border/60 px-4 text-xs font-semibold"
              onClick={loadAnalytics}
            >
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              className="h-10 rounded-full border-border/60 px-4 text-xs font-semibold"
              onClick={handleExport}
            >
              <Download size={14} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Panel key={metric.label} className="p-6">
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${metric.accent}`}
                >
                  <Icon size={22} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Live
                </span>
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="p-7 lg:col-span-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Revenue trend
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Net provider earnings across the recent monthly trend.
              </p>
            </div>
          </div>

          {earningsTrend.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={earningsTrend}>
                  <defs>
                    <linearGradient id="providerRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="6 6"
                    stroke="hsl(var(--border))"
                    opacity={0.65}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={76}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => compactCurrency(value, currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "18px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      boxShadow: "0 20px 60px -30px rgba(4,24,15,0.55)",
                    }}
                    formatter={(value) => formatCurrency(value, currency)}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="rgb(16, 185, 129)"
                    strokeWidth={3}
                    fill="url(#providerRevenueFill)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
              No earnings trend yet.
            </div>
          )}
        </Panel>

        <Panel className="p-7 lg:col-span-4">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Review distribution
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ratings from completed booking reviews.
              </p>
            </div>
          </div>

          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingsPie}
                  innerRadius={68}
                  outerRadius={92}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {ratingsPie.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} ratings`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="rounded-full border border-border/50 bg-background/90 px-5 py-4 text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Ratings
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {ratingsPie[0]?.name || "No data"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {ratingsPie.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {Number(item.value || 0)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-7 lg:col-span-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Booking trend
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Monthly appointment flow from your provider workspace.
              </p>
            </div>
          </div>

          {bookingsTrend.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bookingsTrend}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="6 6"
                    stroke="hsl(var(--border))"
                    opacity={0.65}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip formatter={(value) => `${value} bookings`} />
                  <Bar
                    dataKey="jobs"
                    radius={[14, 14, 0, 0]}
                    fill="rgb(16, 185, 129)"
                    maxBarSize={44}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
              No booking trend yet.
            </div>
          )}
        </Panel>

        <Panel className="p-7 lg:col-span-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <Star size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Top services
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Most booked works from your current accepted and completed activity.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {dashboard.topServices.length ? (
              dashboard.topServices.map((service) => (
                <div key={service.serviceId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {service.serviceTitle}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {service.bookings} bookings
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${service.share}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
                No service activity yet.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
