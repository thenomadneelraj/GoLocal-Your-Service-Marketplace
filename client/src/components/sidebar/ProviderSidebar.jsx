import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldAlert,
  Wrench,
  XCircle,
  HeadphonesIcon,
} from "lucide-react";
import { useAuth } from "@/components/contexts/AuthContext";

function SidebarItem({ icon: Icon, label, isActive, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge ? (
        <span
          className={`ml-auto rounded-full px-2 py-1 text-xs ${
            badge.variant === "success"
              ? "bg-emerald-100 text-emerald-700"
              : badge.variant === "warning"
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
          }`}
        >
          {badge.text}
        </span>
      ) : null}
    </button>
  );
}

export default function ProviderSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/provider-dashboard",
    },
    {
      icon: CalendarDays,
      label: "Bookings",
      path: "/provider/booking-management",
      badge:
        user?.pendingBookings > 0
          ? { text: user.pendingBookings, variant: "warning" }
          : null,
    },
    {
      icon: MessageSquare,
      label: "Messages",
      path: "/provider/chat",
      badge:
        user?.unreadMessages > 0
          ? { text: user.unreadMessages, variant: "warning" }
          : null,
    },
    {
      icon: Wrench,
      label: "Services",
      path: "/provider/services",
    },
    {
      icon: DollarSign,
      label: "Earnings",
      path: "/provider/earnings",
    },
    {
      icon: ShieldAlert,
      label: "Disputes",
      path: "/provider/disputes",
    },
    {
      icon: Bell,
      label: "Notifications",
      path: "/provider/notifications",
    },
    {
      icon: Briefcase,
      label: "Analytics",
      path: "/provider/analytics",
    },
    {
      icon: HeadphonesIcon,
      label: "Support",
      path: "/provider/support",
    },
  ];

  const accountStatus =
    user?.approvalStatus === "approved"
      ? { icon: CheckCircle, text: "Account Approved", variant: "success" }
      : user?.approvalStatus === "pending"
        ? { icon: Clock, text: "Account Pending", variant: "warning" }
        : { icon: XCircle, text: "Account Rejected", variant: "danger" };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Servicely Provider</h2>
            <p className="text-sm text-muted-foreground">Workspace</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <SidebarItem
          icon={accountStatus.icon}
          label={accountStatus.text}
          isActive={false}
          badge={
            accountStatus.variant === "success"
              ? { text: "Live", variant: "success" }
              : accountStatus.variant === "warning"
                ? { text: "Review", variant: "warning" }
                : { text: "Action", variant: "danger" }
          }
          onClick={() => navigate("/provider/settings")}
        />
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.path}
            badge={item.badge}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-border p-4">
        <SidebarItem
          icon={Settings}
          label="Settings"
          isActive={location.pathname === "/provider/settings"}
          onClick={() => navigate("/provider/settings")}
        />
        <SidebarItem
          icon={LogOut}
          label="Logout"
          isActive={false}
          onClick={() => logout({ redirectTo: "/signin" })}
        />
      </div>
    </div>
  );
}
