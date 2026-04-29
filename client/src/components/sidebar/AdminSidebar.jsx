import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Users,
  Settings,
  Shield,
  Briefcase,
  FileText,
  MessageSquare,
  CreditCard,
  TrendingUp,
  HeadphonesIcon,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Star,
  DollarSign,
  HelpCircle,
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
        <span
          className={`ml-auto px-2 py-1 text-xs rounded-full ${
            badge.variant === "success"
              ? "bg-green-100 text-green-600"
              : badge.variant === "warning"
                ? "bg-yellow-100 text-yellow-600"
                : "bg-red-100 text-red-600"
          }`}
        >
          {badge.text}
        </span>
      )}
    </button>
  );
};

const AdminSidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/admin",
    },
    {
      icon: Users,
      label: "Users",
      path: "/admin/users",
      badge: { text: "Manage", variant: "info" },
    },
    {
      icon: Briefcase,
      label: "Services",
      path: "/admin/services",
    },
    {
      icon: Calendar,
      label: "Bookings",
      path: "/admin/bookings",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      path: "/admin/messages",
    },
    {
      icon: CreditCard,
      label: "Transactions",
      path: "/admin/transactions",
    },
    {
      icon: TrendingUp,
      label: "Analytics",
      path: "/admin-analytics",
    },
    {
      icon: FileText,
      label: "Disputes",
      path: "/admin/disputes",
      badge: { text: "Review", variant: "warning" },
    },
    {
      icon: BarChart3,
      label: "Reports",
      path: "/admin-reports",
    },
    {
      icon: AlertTriangle,
      label: "System Health",
      path: "/admin-system",
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/admin/settings",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      path: "/admin/contact-messages",
    },
  ];

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Servicely ADMIN</h2>
            <p className="text-sm text-muted-foreground">Control Panel</p>
          </div>
        </div>
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
              onClick={() => {
                /* Navigation handled by router */
              }}
            />
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <SidebarItem
          icon={LogOut}
          label="Logout"
          isActive={false}
          onClick={() => {
            /* Handle logout */
          }}
        />
      </div>
    </div>
  );
};

export default AdminSidebar;
