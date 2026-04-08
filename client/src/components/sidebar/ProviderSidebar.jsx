import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Home,
  Calendar,
  MessageSquare,
  CreditCard,
  Star,
  Users,
  Settings,
  Briefcase,
  FileText,
  HeadphonesIcon,
  LogOut,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Clock
} from "lucide-react";

const SidebarItem = ({ icon: Icon, label, isActive, badge, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className={`ml-auto px-2 py-1 text-xs rounded-full ${
          badge.variant === "success" ? "bg-green-100 text-green-600" :
          badge.variant === "warning" ? "bg-yellow-100 text-yellow-600" :
          "bg-red-100 text-red-600"
        }`}>
          {badge.text}
        </span>
      )}
    </button>
  );
};

const ProviderSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/provider-dashboard",
    },
    {
      icon: Calendar,
      label: "Bookings",
      path: "/provider-bookings",
      badge: user?.pendingBookings > 0 ? { text: user.pendingBookings, variant: "warning" } : null,
    },
    {
      icon: MessageSquare,
      label: "Messages",
      path: "/provider-messages",
      badge: user?.unreadMessages > 0 ? { text: user.unreadMessages, variant: "warning" } : null,
    },
    {
      icon: Star,
      label: "Reviews",
      path: "/provider-reviews",
    },
    {
      icon: Users,
      label: "Clients",
      path: "/provider-clients",
    },
    {
      icon: TrendingUp,
      label: "Analytics",
      path: "/provider-analytics",
    },
    {
      icon: DollarSign,
      label: "Earnings",
      path: "/provider-earnings",
    },
    {
      icon: FileText,
      label: "Services",
      path: "/provider-services",
    },
  ];

  const accountStatus = user?.approvalStatus === "approved" ? 
    { icon: CheckCircle, text: "Account Approved", variant: "success" } :
    user?.approvalStatus === "pending" ? 
    { icon: Clock, text: "Account Pending", variant: "warning" } :
    { icon: XCircle, text: "Account Rejected", variant: "danger" };

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Servicely PROVIDER</h2>
            <p className="text-sm text-muted-foreground">Workspace</p>
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="p-4 border-b border-border">
        <SidebarItem
          icon={accountStatus.icon}
          label={accountStatus.text}
          isActive={false}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <SidebarItem
              key={index}
              icon={item.icon}
              label={item.label}
              isActive={isActive}
              badge={item.badge}
              onClick={() => {/* Navigation handled by router */}}
            />
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <SidebarItem
          icon={Settings}
          label="Settings"
          isActive={location.pathname === "/provider-settings"}
        />
        <SidebarItem
          icon={LogOut}
          label="Logout"
          isActive={false}
          onClick={() => {/* Handle logout */}}
        />
      </div>
    </div>
  );
};

export default ProviderSidebar;
