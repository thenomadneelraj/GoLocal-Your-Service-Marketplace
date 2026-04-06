import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import api from "@/lib/api";
import { getAccountAccessState } from "@/lib/accountAccess";
import RestrictedAccountBanner from "@/components/shared/RestrictedAccountBanner";
import {
  disconnectSocket,
  initiateSocketConnection,
  subscribeToBookingUpdates,
} from "@/lib/socket";
import { toast } from "sonner";
import { getGreetingByTime } from "@/lib/greeting";
import {
  BOOKING_STATUS,
  getBookingStatusLabel,
  normalizeBookingStatus,
} from "@/lib/bookingStatus";

const EMPTY_DASHBOARD = {
  summary: {
    activeProviders: 0,
    ongoingProjects: 0,
    totalSpent: 0,
    upcomingMeetings: 0,
  },
  overview30d: [],
  overview6m: [],
  taskOverview: [],
  recentProviders: [],
  activity7d: [],
  upcomingMeetings: [],
  currency: "INR",
};

const CARD_STYLES = [
  { label: "Active Providers", key: "activeProviders", icon: Users, accent: "from-primary/30 to-primary/5" },
  { label: "Ongoing Projects", key: "ongoingProjects", icon: Briefcase, accent: "from-sky-400/30 to-sky-400/5" },
  { label: "Total Spent", key: "totalSpent", icon: CircleDollarSign, accent: "from-indigo-400/30 to-indigo-400/5", money: true },
  { label: "Upcoming Meetings", key: "upcomingMeetings", icon: CalendarDays, accent: "from-cyan-400/30 to-cyan-400/5" },
];

const STATUS_STYLES = {
  pending: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
  accepted: "bg-primary/12 text-primary",
  completed: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  rejected: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
  cancelled: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
};

const safeCurrency = (code) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code || "INR",
      maximumFractionDigits: 0,
    }).resolvedOptions().currency;
  } catch {
    return "INR";
  }
};

const formatCurrency = (value, currency) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: safeCurrency(currency),
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;
  }
};

const compactCurrency = (value, currency) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: safeCurrency(currency),
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value || 0));
  } catch {
    return `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;
  }
};

const formatDate = (value) => {
  if (!value) return "Date not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatShortDate = (value) => {
  if (!value) return "Date not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

function Panel({ className = "", children }) {
  return (
    <section className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeBookingStatus(status);
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[normalized] || "bg-muted text-muted-foreground"}`}>
      {getBookingStatusLabel(normalized || "unknown")}
    </span>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { supportEmail } = useMaintenance();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [chartRange, setChartRange] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(() => getGreetingByTime());
  const accountAccess = getAccountAccessState(user);

  const firstName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Client";

  const loadDashboard = async () => {
    try {
      const response = await api.get("/api/clients/stats/dashboard");
      if (response.data?.success) {
        setDashboard({ ...EMPTY_DASHBOARD, ...response.data.data });
      }
    } catch (error) {
      console.error("Failed to load client dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountAccess.restricted) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let unsubscribe = () => {};

    const startRealtime = async () => {
      if (user?.id) {
        initiateSocketConnection(user.id);
        unsubscribe = subscribeToBookingUpdates((err, data) => {
          if (!err && active) {
            toast.success(data.message);
            loadDashboard();
          }
        });
      }
    };

    loadDashboard();
    startRealtime();

    return () => {
      active = false;
      unsubscribe();
      disconnectSocket();
    };
  }, [accountAccess.restricted, user?.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGreeting(getGreetingByTime());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const currency = dashboard.currency || "INR";
  const chartData =
    chartRange === "monthly" ? dashboard.overview30d : dashboard.overview6m;

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
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-[380px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-8" />
          <div className="h-[380px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-4" />
          <div className="h-[320px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-8" />
          <div className="h-[320px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <Panel className="relative p-8">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-primary/20 via-primary/6 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                Client Workspace
              </p>
              {user?.isVerified && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm animate-in fade-in zoom-in duration-500">
                  <ShieldCheck size={12} className="fill-emerald-500/20" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Identity Verified</span>
                </div>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {greeting}, {firstName}!
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Your dashboard now uses live booking, provider, and spending data from the backend with matching light and dark dashboard styling.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
            <BarChart3 size={14} />
            Real client metrics
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARD_STYLES.map((card) => {
          const Icon = card.icon;
          const rawValue = dashboard.summary[card.key];
          const value = card.money ? formatCurrency(rawValue, currency) : Number(rawValue || 0).toLocaleString("en-IN");

          return (
            <Panel key={card.key} className="relative p-6">
              <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${card.accent}`} />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {card.label}
                  </p>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card/90 text-primary shadow-sm">
                    <Icon size={19} />
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {card.key === "activeProviders"
                      ? "Providers you have booked with"
                      : card.key === "ongoingProjects"
                        ? "Accepted live bookings"
                        : card.key === "totalSpent"
                          ? "Successful transaction total"
                          : "Upcoming booked sessions"}
                  </p>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="p-7 lg:col-span-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Client Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Bookings and spending trends from real client activity.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-border/70 bg-muted/60 p-1">
              {[
                { id: "monthly", label: "Monthly" },
                { id: "yearly", label: "Yearly" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChartRange(option.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    chartRange === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="clientSpendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="6 6" stroke="hsl(var(--border))" opacity={0.65} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis
                  yAxisId="spend"
                  tickLine={false}
                  axisLine={false}
                  width={70}
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
                    boxShadow: "0 20px 60px -30px rgba(15, 23, 42, 0.55)",
                  }}
                  formatter={(value, key) =>
                    key === "spend"
                      ? formatCurrency(value, currency)
                      : `${value} bookings`
                  }
                />
                <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#clientSpendFill)" />
                <Line yAxisId="bookings" type="monotone" dataKey="bookings" stroke="hsl(var(--foreground))" strokeWidth={2.2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-7 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Task Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your next accepted or pending sessions.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {dashboard.taskOverview.length}
            </span>
          </div>

          <div className="space-y-3">
            {dashboard.taskOverview.length ? (
              dashboard.taskOverview.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.serviceTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.providerName}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatShortDate(item.bookingDate)}</span>
                    <span className="font-medium text-foreground">{item.timeSlot || "Flexible"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No scheduled tasks yet</p>
                <p className="mt-2 text-xs text-muted-foreground">Upcoming sessions will show here when you book a provider.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="overflow-hidden lg:col-span-8">
          <div className="border-b border-border/60 px-7 py-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Providers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest provider interactions based on your bookings.</p>
          </div>

          {dashboard.recentProviders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-muted/20 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <tr>
                    <th className="px-7 py-4 font-semibold">Provider</th>
                    <th className="px-7 py-4 font-semibold">Project</th>
                    <th className="px-7 py-4 font-semibold">Session</th>
                    <th className="px-7 py-4 font-semibold">Amount</th>
                    <th className="px-7 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dashboard.recentProviders.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/15">
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {getInitials(item.providerName)}
                          </span>
                          <span className="font-medium text-foreground">{item.providerName}</span>
                        </div>
                      </td>
                      <td className="px-7 py-5 text-sm text-foreground">{item.serviceTitle}</td>
                      <td className="px-7 py-5 text-sm text-muted-foreground">
                        {formatDate(item.bookingDate)}
                        <span className="ml-2 text-foreground">{item.timeSlot || ""}</span>
                      </td>
                      <td className="px-7 py-5 text-sm font-medium text-foreground">{formatCurrency(item.amount, currency)}</td>
                      <td className="px-7 py-5"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-7 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No providers booked yet</p>
              <p className="mt-2 text-xs text-muted-foreground">Your latest provider bookings will appear here automatically.</p>
            </div>
          )}
        </Panel>

        <Panel className="p-7 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Upcoming Meetings</h2>
              <p className="mt-1 text-sm text-muted-foreground">Closest scheduled provider visits.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {dashboard.upcomingMeetings.length}
            </span>
          </div>

          <div className="space-y-3">
            {dashboard.upcomingMeetings.length ? (
              dashboard.upcomingMeetings.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.providerName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.serviceTitle}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatShortDate(item.bookingDate)}</span>
                    <span className="font-medium text-foreground">{item.timeSlot || "Flexible"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No upcoming meetings</p>
                <p className="mt-2 text-xs text-muted-foreground">Future provider visits will appear here once scheduled.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-7 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">Booking activity over the last seven days.</p>
            </div>
          </div>

          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.activity7d}>
                <CartesianGrid vertical={false} strokeDasharray="6 6" stroke="hsl(var(--border))" opacity={0.65} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                  contentStyle={{
                    borderRadius: "18px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    boxShadow: "0 20px 60px -30px rgba(15, 23, 42, 0.55)",
                  }}
                  formatter={(value) => `${value} bookings`}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function getInitials(value = "") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "P";
}
