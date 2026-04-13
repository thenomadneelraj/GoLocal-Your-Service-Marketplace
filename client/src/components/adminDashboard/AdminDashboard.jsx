import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  LineChart as LineChartIcon,
  ReceiptText,
  UserRoundCog,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAdminDashboard } from "@/lib/cachedAdminApi";
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminStatCard,
  formatAdminCurrency,
} from "./AdminWorkspaceCommon";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mockAdminDashboard } from "@/lib/mockWorkspaceData";

const CATEGORY_COLORS = ["#f59e0b", "#f97316", "#fbbf24", "#fed7aa", "#fb923c"];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const result = await fetchAdminDashboard();
        // Handle both cached and non-cached responses
        setData(result.data?.data || result.data || null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const hasGrowthData = (charts.growth || []).some(
    (entry) =>
      Number(entry?.users || 0) > 0 ||
      Number(entry?.revenue || 0) > 0 ||
      Number(entry?.bookings || 0) > 0
  );
  const hasSummaryData =
    (summary.totalUsers || 0) > 0 ||
    (summary.pendingProviders || 0) > 0 ||
    (summary.revenue || 0) > 0 ||
    (summary.bookingsTracked || 0) > 0;
  const resolvedSummary = hasSummaryData ? summary : mockAdminDashboard.summary;
  const resolvedCharts = hasGrowthData ? charts : mockAdminDashboard.charts;
  const currency = data?.meta?.currency || mockAdminDashboard.meta.currency || "USD";

  const categoryData = useMemo(
    () => (resolvedCharts.categoryDistribution || []).filter((item) => item.value > 0),
    [resolvedCharts.categoryDistribution]
  );

  if (loading) {
    return <AdminLoadingState label="Loading dashboard workspace..." />;
  }

  if (!data) {
    return <AdminEmptyState title="Dashboard unavailable" description="Admin analytics could not be loaded right now." />;
  }

  return (
    <AdminPageShell
      title="Dashboard"
      description="Platform control across users, provider approvals, bookings, revenue, disputes, and operational alerts."
      actions={<DataOriginBadge origin={hasSummaryData ? "real" : "mock"} liveLabel="Live first" sampleLabel="Sample fallback" />}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Users}
          title="Total users"
          value={resolvedSummary.totalUsers ?? 0}
          subtitle="Active accounts across admin, client, and provider roles."
        />
        <AdminStatCard
          icon={UserRoundCog}
          title="Providers pending review"
          value={resolvedSummary.pendingProviders ?? 0}
          subtitle="Accounts still waiting for approval and verification."
          tone="text-blue-600"
        />
        <AdminStatCard
          icon={DollarSign}
          title="Platform revenue"
          value={formatAdminCurrency(resolvedSummary.revenue ?? 0, currency)}
          subtitle="Recognized from successful transactions."
          tone="text-emerald-600"
        />
        <AdminStatCard
          icon={ReceiptText}
          title="Bookings tracked"
          value={resolvedSummary.bookingsTracked ?? 0}
          subtitle={`${resolvedSummary.openDisputes ?? 0} open disputes being monitored.`}
          tone="text-violet-600"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <AdminPanel
          title="User Growth"
          description="Clients and providers joining the platform over the last six months."
        >
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resolvedCharts.growth || []}>
                <defs>
                  <linearGradient id="dashboardUsers" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashboardBookings" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.24)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                    boxShadow: "0 20px 45px -30px rgba(15, 23, 42, 0.35)",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="users" stroke="#f59e0b" fill="url(#dashboardUsers)" strokeWidth={2.5} name="Users" />
                <Area type="monotone" dataKey="bookings" stroke="#fb923c" fill="url(#dashboardBookings)" strokeWidth={2.1} name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Category Distribution"
          description="High-level service mix by category."
        >
          <div className="h-[290px]">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={4}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                title="No category data yet"
                description="Service categories will appear here when providers add live services."
              />
            )}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel
          title="Revenue Growth"
          description="Revenue recognized from successful transaction history."
        >
          <div className="space-y-3">
            {(resolvedCharts.growth || []).map((entry) => (
              <div
                key={`${entry.month}-revenue`}
                className="admin-card-soft flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{entry.month}</p>
                  <p className="text-xs text-muted-foreground">
                    Successful transaction revenue recognized this month.
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatAdminCurrency(entry.revenue || 0, currency)}
                </p>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Booking Trends"
          description="Recent booking volume tracked from the live backend workspace."
        >
          <div className="space-y-3">
            {(resolvedCharts.growth || []).map((entry) => (
              <div
                key={`${entry.month}-bookings`}
                className="admin-card-soft flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="admin-icon-wrap text-orange-500">
                    <LineChartIcon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.month}</p>
                    <p className="text-xs text-muted-foreground">
                      Bookings created during this reporting window.
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{entry.bookings || 0}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminPageShell>
  );
}
