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
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardCard from "@/components/ui/DashboardCard";

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
};

const CARD_STYLES = [
  {
    key: "activeProviders",
    label: "Active Providers",
    accent: "from-blue-500/20 to-transparent",
    icon: Users,
    money: false,
  },
  {
    key: "ongoingProjects",
    label: "Ongoing Projects",
    accent: "from-green-500/20 to-transparent",
    icon: Briefcase,
    money: false,
  },
  {
    key: "totalSpent",
    label: "Total Spent",
    accent: "from-amber-500/20 to-transparent",
    icon: CircleDollarSign,
    money: true,
  },
  {
    key: "upcomingMeetings",
    label: "Upcoming Meetings",
    accent: "from-purple-500/20 to-transparent",
    icon: CalendarDays,
    money: false,
  },
];

const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const formatShortDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInitials = (value = "") => {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "P";
};

const Panel = ({ className = "", children }) => {
  return (
    <section className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeBookingStatus(status);
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
      normalized === "pending" ? "bg-amber-500/12 text-amber-600" :
      normalized === "accepted" ? "bg-emerald-500/12 text-emerald-600" :
      normalized === "completed" ? "bg-blue-500/12 text-blue-600" :
      normalized === "cancelled" ? "bg-rose-500/12 text-rose-600" :
      "bg-muted text-muted-foreground"
    }`}>
      {getBookingStatusLabel(normalized || "unknown")}
    </span>
  );
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [chartRange, setChartRange] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const accountAccess = getAccountAccessState(user);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/client/dashboard");
      setDashboard(response.data || EMPTY_DASHBOARD);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load dashboard");
      setDashboard(EMPTY_DASHBOARD);
    } finally {
      setLoading(false);
    }
  };

  const startRealtime = () => {
    initiateSocketConnection();
    subscribeToBookingUpdates();
  };

  const stopRealtime = () => {
    const active = false;
    // unsubscribe logic here
  };

  useEffect(() => {
    loadDashboard();
    startRealtime();

    const intervalId = window.setInterval(() => {
      setGreeting(getGreetingByTime());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const currency = dashboard.currency || "INR";
  const chartData = chartRange === "monthly" ? dashboard.overview30d : dashboard.overview6m;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreetingByTime()}, {user?.name}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
            Manage your bookings, track expenses, and connect with service providers.
          </p>
        </div>
      </div>

      {/* Dashboard Content */}
      {accountAccess.restricted ? (
        <RestrictedAccountBanner {...accountAccess} />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            {CARD_STYLES.map((card) => {
              const Icon = card.icon;
              const rawValue = dashboard.summary[card.key];
              const value = card.money ? formatCurrency(rawValue, currency) : Number(rawValue || 0).toLocaleString("en-IN");
              return (
                <DashboardCard
                  icon={<Icon className="w-6 h-6 text-blue-600" />}
                  title={card.label}
                  value={value}
                  description={
                    card.key === "activeProviders"
                      ? "Providers you're working with"
                      : card.key === "ongoingProjects"
                        ? "Active service requests"
                        : card.key === "totalSpent"
                          ? "Lifetime service expenses"
                          : "Scheduled appointments"
                  }
                />
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 mb-6 lg:grid-cols-2">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-lg font-semibold mb-4">Overview (Last 30 Days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <Bar data={chartData} />
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-lg font-semibold mb-4">Overview (Last 6 Months)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <Line data={chartData} />
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardCard
                icon={<Briefcase className="w-6 h-6 text-blue-600" />}
                title="Recent Bookings"
                value={dashboard.taskOverview.length}
                description="Latest service requests"
              />
            </div>
            <div>
              <DashboardCard
                icon={<Users className="w-6 h-6 text-green-600" />}
                title="Recent Providers"
                value={dashboard.recentProviders.length}
                description="Latest providers contacted"
              />
            </div>
          </div>

          {/* Task Overview */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
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
                    <span className="font-medium text-foreground">{item.timeSlot || ""}</span>
                  </div>
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
        </>
      )}
    </DashboardLayout>
  );
}
