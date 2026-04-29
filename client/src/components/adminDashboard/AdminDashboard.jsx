import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CreditCard,
  Eye,
  Users,
  UserRound,
} from "lucide-react";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchAdminDashboard,
  fetchAdminUsers,
} from "@/lib/cachedAdminApi";

import {
  mockAdminDashboard,
  mockAdminUsers,
} from "@/lib/mockWorkspaceData";

import { mergeLayeredCollections } from "@/lib/dataLayering";

import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageShell,
  formatAdminCurrency,
} from "./AdminWorkspaceCommon";

import { useAuth } from "@/components/contexts/AuthContext";
import { useSocketEvent } from "@/components/contexts/WebSocketContext";

const CATEGORY_COLORS = [
  "#2fb8ff",
  "#31d279",
  "#ffbf1f",
  "#ff4f7b",
  "#7c6dff",
];

const ACTIVITY_DOTS = ["bg-sky-400", "bg-emerald-400", "bg-indigo-400", "bg-rose-400"];

const formatCompactCurrency = (value = 0, currency = "INR") => {
  const amount = Number(value || 0);

  if (currency === "INR" && amount >= 100000) {
    return `INR ${(amount / 100000).toFixed(2)}L`;
  }

  if (amount >= 1000000) {
    return formatAdminCurrency(amount / 1000000, currency).replace(/\.00$/, "") + "M";
  }

  return formatAdminCurrency(amount, currency).replace(/\.00$/, "");
};

function DashboardCard({ title, value, change, icon, tone = "text-primary" }) {
  return (
    <article className="rounded-lg border border-border/80 bg-card/70 p-4 shadow-[0_18px_48px_-36px_rgb(0_0_0/0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            <span className="font-semibold text-emerald-400">{change}</span>{" "}
            vs today
          </p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-full bg-muted/40 ${tone}`}>
          {createElement(icon, { size: 18 })}
        </span>
      </div>
    </article>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [usersPayload, setUsersPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load dashboard analytics
   */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const result = await fetchAdminDashboard();

      setData(result?.data?.data || result?.data || null);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load users
   */
  const loadUsers = useCallback(async () => {
    try {
      const response = await fetchAdminUsers({}, true);

      setUsersPayload(response?.data?.data || null);
    } catch (error) {
      console.error("Failed to load users for dashboard:", error);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadDashboard();
    loadUsers();
  }, [loadDashboard, loadUsers]);

  /**
   * Socket realtime updates
   * IMPORTANT:
   * Hooks MUST NOT be below conditional returns
   */
  useSocketEvent("user_updated", loadUsers);
  useSocketEvent("user_status_updated", loadUsers);

  /**
   * Safe fallback values
   */
  const summary = useMemo(() => data?.summary || {}, [data]);
  const charts = useMemo(() => data?.charts || {}, [data]);

  const currency = data?.meta?.currency || mockAdminDashboard?.meta?.currency || "INR";

  /**
   * Merge real + mock users
   */
  const items = useMemo(() => usersPayload?.items || [], [usersPayload]);

  const layeredItems = useMemo(() => {
    return mergeLayeredCollections(items, mockAdminUsers, {
      getId: (user) => user.id || user._id,
    });
  }, [items]);

  /**
   * Dashboard summary calculations
   */
  const mockSummaryUsers = useMemo(
    () => ({
      totalUsers: mockAdminUsers.length,
      pendingApproval: mockAdminUsers.filter(
        (user) => user.approvalStatus === "pending",
      ).length,
      approved: mockAdminUsers.filter(
        (user) => user.approvalStatus === "approved",
      ).length,
      rejected: mockAdminUsers.filter(
        (user) => user.approvalStatus === "rejected",
      ).length,
      suspended: mockAdminUsers.filter(
        (user) => user.status === "suspended",
      ).length,
    }),
    [],
  );

  const layeredSummaryUsers = useMemo(() => {
    const realItems = layeredItems.filter(
      (item) => item.dataOrigin !== "mock",
    );

    const mockItemsOnly = layeredItems.filter(
      (item) => item.dataOrigin === "mock",
    );

    if (realItems.length > 0) {
      return {
        totalUsers: realItems.length + mockItemsOnly.length,

        pendingApproval: realItems.filter(
          (item) => item.approvalStatus === "pending",
        ).length,

        approved: realItems.filter(
          (item) => item.approvalStatus === "approved",
        ).length,

        rejected: realItems.filter(
          (item) => item.approvalStatus === "rejected",
        ).length,

        suspended: realItems.filter(
          (item) => item.status === "suspended",
        ).length,
      };
    }

    return mockSummaryUsers;
  }, [layeredItems, mockSummaryUsers]);

  const resolvedSummary = useMemo(
    () => ({
      ...summary,

      totalUsers:
        layeredSummaryUsers.totalUsers ?? summary.totalUsers ?? 0,

      pendingProviders:
        layeredSummaryUsers.pendingApproval ??
        summary.pendingProviders ??
        0,
    }),
    [summary, layeredSummaryUsers],
  );

  const providerCount = useMemo(
    () => layeredItems.filter((item) => item.role === "provider").length,
    [layeredItems],
  );

  const clientCount = useMemo(
    () => layeredItems.filter((item) => item.role === "client").length,
    [layeredItems],
  );

  /**
   * Category chart data
   */
  const categoryData = useMemo(() => {
    return (charts?.categoryDistribution || []).filter(
      (item) => item?.value > 0,
    );
  }, [charts]);

  /**
   * Growth chart fallback
   */
  const hasGrowthData = (charts?.growth || []).some(
    (entry) =>
      Number(entry?.users || 0) > 0 ||
      Number(entry?.revenue || 0) > 0 ||
      Number(entry?.bookings || 0) > 0,
  );

  const resolvedCharts = hasGrowthData
    ? charts
    : mockAdminDashboard.charts;

  const platformOverviewData = useMemo(
    () =>
      (resolvedCharts.growth || []).map((entry) => ({
        month: entry.month,
        users: Number(entry.users || 0),
        revenue: Number(entry.revenue || 0),
        bookings: Number(entry.bookings || 0),
      })),
    [resolvedCharts],
  );

  const recentActivity = useMemo(() => {
    const recentUsers = layeredItems.slice(0, 2).map((item) => ({
      label:
        item.role === "provider"
          ? "New provider registered"
          : "New client registered",
      time: item.joinedLabel || "2 min ago",
    }));

    return [
      ...recentUsers,
      {
        label: `New booking: ${resolvedSummary.bookingsTracked || 0} tracked`,
        time: "1 hour ago",
      },
      {
        label: `Disputes open: ${resolvedSummary.openDisputes || 0}`,
        time: "2 hours ago",
      },
    ].slice(0, 4);
  }, [layeredItems, resolvedSummary.bookingsTracked, resolvedSummary.openDisputes]);

  /**
   * Loading state
   */
  if (loading) {
    return <AdminLoadingState label="Loading dashboard workspace..." />;
  }

  /**
   * Empty state
   */
  if (!data) {
    return (
      <AdminEmptyState
        title="Dashboard unavailable"
        description="Admin analytics could not be loaded right now."
      />
    );
  }

  return (
    <AdminPageShell
      title={
        <>
          Good Evening,{" "}
          <span className="text-primary">{user?.name || "Admin"}</span>
        </>
      }
      description="Here's what's happening on your platform today."
    >
      <div className="border-y border-border/80 py-4">
        <div className="flex flex-wrap gap-6 text-xs font-semibold">
          {["Overview", "User Management", "Analytics & Reports"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`border-b py-2 transition-colors ${
                index === 0
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Total Users"
          value={resolvedSummary.totalUsers ?? 0}
          change="+3.4%"
          icon={Users}
          tone="text-indigo-400"
        />
        <DashboardCard
          title="Providers"
          value={providerCount || resolvedSummary.pendingProviders || 0}
          change="+12%"
          icon={BriefcaseBusiness}
          tone="text-emerald-400"
        />
        <DashboardCard
          title="Clients"
          value={clientCount || 0}
          change="+5%"
          icon={UserRound}
          tone="text-sky-400"
        />
        <DashboardCard
          title="Revenue"
          value={formatCompactCurrency(resolvedSummary.revenue ?? 0, currency)}
          change="+12%"
          icon={CreditCard}
          tone="text-primary"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
        <section className="rounded-lg border border-border/80 bg-card/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Platform Overview</h2>
            <Eye size={16} className="text-muted-foreground" />
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformOverviewData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.45)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="users"
                  stroke="#2fb8ff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2fb8ff", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Users"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ffbf1f"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#ffbf1f", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-lg border border-border/80 bg-card/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
              <button type="button" className="text-[10px] font-semibold text-primary">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={`${activity.label}-${index}`} className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOTS[index % ACTIVITY_DOTS.length]}`} />
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {activity.label}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border/80 bg-card/70 p-4">
            <h2 className="text-sm font-bold text-foreground">Bookings by Category</h2>
            <div className="mt-4 h-[220px]">
              {categoryData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <AdminEmptyState
                  title="No category data yet"
                  description="Categories appear when providers add services."
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminPageShell>
  );
}





