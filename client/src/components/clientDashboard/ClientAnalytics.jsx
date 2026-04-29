import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  CircleDollarSign,
  Download,
  PieChart as PieChartIcon,
  RefreshCcw,
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
import api from "@/lib/api";

const EMPTY_DASHBOARD = {
  summary: {
    activeProviders: 0,
    ongoingProjects: 0,
    totalSpent: 0,
    upcomingMeetings: 0,
  },
  overview30d: [],
  overview6m: [],
  currency: "INR",
};

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "rgb(14, 165, 233)",
  "rgb(16, 185, 129)",
  "rgb(249, 115, 22)",
  "rgb(99, 102, 241)",
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
      className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

export default function ClientAnalytics() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [downloadFormat, setDownloadFormat] = useState("csv");
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [bookingTrend, setBookingTrend] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, bookingResponse, categoryResponse] = await Promise.all([
        api.get("/api/clients/stats/dashboard"),
        api.get("/api/clients/stats/bookings"),
        api.get("/api/clients/stats/services"),
      ]);

      setDashboard({
        ...EMPTY_DASHBOARD,
        ...(dashboardResponse.data?.data || {}),
      });
      setBookingTrend(bookingResponse.data?.data || []);
      setCategoryStats(categoryResponse.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load client analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const currency = dashboard.currency || "INR";
  const spendSeries = range === "30d" ? dashboard.overview30d : dashboard.overview6m;

  const metrics = useMemo(() => {
    const totalBookings = spendSeries.reduce(
      (sum, item) => sum + Number(item.bookings || 0),
      0
    );
    const totalSpendFromSeries = spendSeries.reduce(
      (sum, item) => sum + Number(item.spend || 0),
      0
    );

    return [
      {
        label: "Total Spent",
        value: formatCurrency(dashboard.summary.totalSpent, currency),
        note: "Successful payments recorded",
        icon: CircleDollarSign,
        accent: "text-primary bg-primary/10 border-primary/20",
      },
      {
        label: "Active Providers",
        value: Number(dashboard.summary.activeProviders || 0).toLocaleString("en-IN"),
        note: "Providers you've worked with",
        icon: Users,
        accent: "text-sky-600 bg-sky-500/10 border-sky-500/20",
      },
      {
        label: "Open Projects",
        value: Number(dashboard.summary.ongoingProjects || 0).toLocaleString("en-IN"),
        note: "Accepted live bookings",
        icon: Briefcase,
        accent: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        label: "Average Booking",
        value: totalBookings
          ? formatCurrency(totalSpendFromSeries / totalBookings, currency)
          : formatCurrency(0, currency),
        note: "Average spend per booking in view",
        icon: Activity,
        accent: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
      },
    ];
  }, [currency, dashboard.summary, spendSeries]);

  const pieData = useMemo(
    () =>
      (categoryStats.length ? categoryStats : [{ name: "No Services", value: 1 }]).map(
        (item, index) => ({
          ...item,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        })
      ),
    [categoryStats]
  );

  const topCategory = pieData
    .filter((item) => Number(item.value || 0) > 0)
    .sort((left, right) => Number(right.value || 0) - Number(left.value || 0))[0];

  const handleExport = async () => {
    const extension = downloadFormat === "xlsx" ? "xlsx" : downloadFormat;

    try {
      const response = await api.get("/api/transactions/export", {
        params: { format: downloadFormat },
        responseType: "blob",
      });
      downloadBlob(
        response.data,
        `client-analytics-export-${Date.now()}.${extension}`
      );
      toast.success("Analytics export downloaded.");
    } catch (error) {
      toast.error("Could not export analytics.");
    }
  };

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
          <div className="h-[300px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <Panel className="relative p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
              Client Analytics
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Spending and booking insights
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              This page now uses real booking, provider, and transaction data so you
              can see where your spending is going and how your service activity is trending.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-border/70 bg-muted/60 p-1">
              {[
                { id: "30d", label: "30D" },
                { id: "6m", label: "6M" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRange(option.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    range === option.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Spending and booking trend
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare what you spent against how many bookings you placed.
              </p>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={spendSeries}>
                <defs>
                  <linearGradient id="clientAnalyticsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="6 6"
                  stroke="hsl(var(--border))"
                  opacity={0.65}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="spend"
                  tickLine={false}
                  axisLine={false}
                  width={76}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(value) => compactCurrency(value, currency)}
                />
                <YAxis
                  yAxisId="bookings"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "18px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    boxShadow: "0 20px 60px -30px rgba(15,23,42,0.55)",
                  }}
                  formatter={(value, key) =>
                    key === "spend"
                      ? formatCurrency(value, currency)
                      : `${value} bookings`
                  }
                />
                <Area
                  yAxisId="spend"
                  type="monotone"
                  dataKey="spend"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fill="url(#clientAnalyticsFill)"
                />
                <Bar
                  yAxisId="bookings"
                  dataKey="bookings"
                  radius={[12, 12, 0, 0]}
                  fill="rgba(15, 23, 42, 0.65)"
                  maxBarSize={28}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-7 lg:col-span-4">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Category breakdown
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Services grouped by booking category.
              </p>
            </div>
          </div>

          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={68}
                  outerRadius={92}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} bookings`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="rounded-full border border-border/50 bg-background/90 px-5 py-4 text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Top
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {topCategory?.name || "No data"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {pieData.map((item) => (
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

        <Panel className="p-7 lg:col-span-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Booking trend by month
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live booking count trend from the client stats service.
              </p>
            </div>
          </div>

          {bookingTrend.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bookingTrend}>
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
                    dataKey="bookings"
                    radius={[14, 14, 0, 0]}
                    fill="hsl(var(--primary))"
                    maxBarSize={48}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
              No booking activity yet.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
