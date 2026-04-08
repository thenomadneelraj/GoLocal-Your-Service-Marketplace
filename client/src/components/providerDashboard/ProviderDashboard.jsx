import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarCheck2,
  Clock3,
  IndianRupee,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import api from "@/lib/api";
import { getGreetingByTime } from "@/lib/greeting";
import { getAccountAccessState } from "@/lib/accountAccess";
import RestrictedAccountBanner from "@/components/shared/RestrictedAccountBanner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  getBookingStatusLabel,
  normalizeBookingStatus,
} from "@/lib/bookingStatus";

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

const CARD_STYLES = [
  { label: "Appointments Booked", key: "appointmentsBooked", icon: CalendarCheck2, accent: "from-primary/30 to-primary/5" },
  { label: "Pending Requests", key: "pendingRequests", icon: Clock3, accent: "from-amber-400/30 to-amber-400/5" },
  { label: "Total Income", key: "totalIncome", icon: IndianRupee, accent: "from-emerald-400/30 to-emerald-400/5", money: true },
  { label: "Total Clients", key: "totalClients", icon: Users, accent: "from-emerald-300/30 to-primary/5" },
];

const STATUS_STYLES = {
  pending: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
  accepted: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  completed: "bg-primary/12 text-primary",
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
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }
};

const compactAmount = (value, currency) => {
  const amount = Number(value || 0);
  if (amount >= 100000) return `${formatCurrency(amount / 100000, currency).replace(".0", "")}L`;
  if (amount >= 1000) return `${formatCurrency(amount / 1000, currency).replace(".0", "")}k`;
  return formatCurrency(amount, currency);
};

const formatDate = (value) => {
  if (!value) return "Date not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function StatusBadge({ status }) {
  const normalized = normalizeBookingStatus(status);
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[normalized] || "bg-muted text-muted-foreground"}`}>
      {getBookingStatusLabel(normalized || "unknown")}
    </span>
  );
}

function Panel({ className = "", children }) {
  return (
    <section className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_30px_80px_-48px_rgba(4,24,15,0.72)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { supportEmail } = useMaintenance();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [chartRange, setChartRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(() => getGreetingByTime());
  const accountAccess = getAccountAccessState(user);

  const providerName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Professional";

  useEffect(() => {
    if (accountAccess.restricted) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get("/api/provider/dashboard");
        if (active && response.data) {
          setDashboard({ ...EMPTY_DASHBOARD, ...response.data });
        }
      } catch (error) {
        console.error("Failed to load provider dashboard:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [accountAccess.restricted]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGreeting(getGreetingByTime());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const currency = dashboard.currency || "INR";
  const chartData = chartRange === "7d" ? dashboard.earnings7d : dashboard.earnings6m;

  if (accountAccess.restricted) {
    return (
      <div className="space-y-6 pb-10 font-sans">
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
          <div className="h-[420px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-8" />
          <div className="h-[420px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-4" />
          <div className="h-[360px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-8" />
          <div className="h-[360px] animate-pulse rounded-[2rem] border border-border/70 bg-card/80 lg:col-span-4" />
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10 font-sans">
        {/* Welcome Hero */}
        <div className="relative bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
          
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-xs">
                <ShieldCheck size={12} />
                Professional Workspace
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-foreground italic">
                  {greeting}, {providerName}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed max-w-xl opacity-80">
                  Welcome back to your business center. Monitoring your performance and bookings in real-time.
                </p>
              </div>
            </div>
            {user?.isVerified && (
              <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">
                <ShieldCheck size={14} className="fill-white/20" />
                Verified Expert
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CARD_STYLES.map((card) => {
            const Icon = card.icon;
            const rawValue = dashboard.summary[card.key];
            const value = card.money ? formatCurrency(rawValue, currency) : Number(rawValue || 0).toLocaleString("en-IN");
            
            return (
              <div key={card.key} className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm shadow-xs relative overflow-hidden flex flex-col justify-center">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-50 pointer-events-none`} />
                <div className="relative h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-card border border-border/40 flex items-center justify-center text-emerald-600 shadow-xs group-hover:scale-110 transition-transform">
                      <Icon size={18} />
                    </div>
                    <BarChart3 size={14} className="text-muted-foreground opacity-30" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">{card.label}</p>
                  <p className="text-2xl font-black leading-none italic">{value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Income Chart */}
          <div className="lg:col-span-8 bg-card/40 border border-border/60 rounded-[2rem] p-7 backdrop-blur-sm shadow-xs relative overflow-hidden group">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
                  <IndianRupee size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Income</h2>
                  <p className="text-[10px] text-muted-foreground font-medium italic opacity-70">Earnings overview.</p>
                </div>
              </div>
              <div className="inline-flex rounded-xl border border-border/60 bg-muted/40 p-1">
                {[
                  { id: "7d", label: "7D" },
                  { id: "6m", label: "6M" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setChartRange(option.id)}
                    className={`rounded-lg px-4 py-1.5 text-[10px] font-black tracking-widest transition-all ${
                      chartRange === option.id ? "bg-background text-emerald-600 shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dashboardIncomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" hide />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                    tickFormatter={(val) => `₹${val/1000}k`}
                  />
                  <Tooltip
                    cursor={{ stroke: "#10b981", strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      background: "white",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      fontSize: "10px",
                      fontWeight: "bold"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#dashboardIncomeFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Schedule */}
          <div className="lg:col-span-4 bg-card/40 border border-border/60 rounded-[2rem] p-7 backdrop-blur-sm shadow-xs relative overflow-hidden group">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
                  <Clock3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Schedule</h2>
                  <p className="text-[10px] text-muted-foreground font-medium italic opacity-70">Today&apos;s sessions.</p>
                </div>
              </div>
              <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg text-[10px] font-black border border-emerald-500/10">
                {dashboard.todaySchedule.length}
              </span>
            </div>

            <div className="space-y-3">
              {dashboard.todaySchedule.length ? (
                dashboard.todaySchedule.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/40 bg-card/50 p-4 hover:border-emerald-500/30 transition-colors shadow-xs group/item">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover/item:text-emerald-700 transition-colors uppercase tracking-tight">{item.clientName}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground font-bold italic opacity-60">{item.serviceTitle}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">{item.timeSlot || formatDate(item.bookingDate)}</span>
                      <span className="text-[10px] font-black text-emerald-600 italic">{formatCurrency(item.amount, currency)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-border/40 py-10 text-center opacity-60">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-tight">Clear Day</p>
                  <p className="mt-2 text-[9px] text-muted-foreground font-medium italic px-4">No appointments scheduled for today.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="lg:col-span-8 bg-card/40 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-xs relative">
            <div className="border-b border-border/40 px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
                  <CalendarCheck2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Recent Sessions</h2>
                  <p className="text-[10px] text-muted-foreground font-medium italic opacity-70">Latest provider activities.</p>
                </div>
              </div>
            </div>

            {dashboard.recentAppointments.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40">
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Client</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Service</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">Date</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-right">Amount</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {dashboard.recentAppointments.map((item) => (
                      <tr key={item.id} className="group hover:bg-emerald-500/5 transition-all">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center text-[10px] font-black border border-emerald-500/20 shadow-xs">
                              {getInitials(item.clientName)}
                            </div>
                            <span className="text-xs font-bold text-foreground group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{item.clientName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-[10px] font-bold text-muted-foreground opacity-80">{item.serviceTitle}</td>
                        <td className="px-8 py-4 text-center">
                          <p className="text-[10px] font-bold text-muted-foreground italic whitespace-nowrap">{formatDate(item.bookingDate)}</p>
                        </td>
                        <td className="px-8 py-4 text-right">
                           <p className="text-[11px] font-black italic text-emerald-600">{formatCurrency(item.amount, currency)}</p>
                        </td>
                        <td className="px-8 py-4 text-right"><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center opacity-60">
                <p className="text-[11px] font-bold text-foreground uppercase tracking-tight">No History</p>
                <p className="mt-2 text-[10px] text-muted-foreground font-medium italic">Recent bookings will appear here.</p>
              </div>
            )}
          </div>

          {/* Top Services */}
          <div className="lg:col-span-4 bg-card/40 border border-border/60 rounded-[2rem] p-7 backdrop-blur-sm shadow-xs relative overflow-hidden group">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Top Service</h2>
                  <p className="text-[10px] text-muted-foreground font-medium italic opacity-70">Popular offerings.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {dashboard.topServices.length ? (
                dashboard.topServices.map((service) => (
                  <div key={service.serviceId} className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-tight text-foreground/80">{service.serviceTitle}</p>
                      <p className="text-[10px] font-black text-emerald-600 italic">#{service.bookings}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/40 ring-1 ring-border/20">
                      <div className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${service.share}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center opacity-60">
                  <p className="text-[10px] font-black text-foreground uppercase tracking-tight italic">Waiting for data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getInitials(value = "") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";
}
