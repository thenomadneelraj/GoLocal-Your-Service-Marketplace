import { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Briefcase,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock,
  FileText,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Moon,
  ReceiptText,
  Search,
  Settings as SettingsIcon,
  Settings2,
  ShieldCheck,
  Star,
  Sun,
  Users,
  Wallet2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useTheme } from "@/components/contexts/ThemeContext";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  getAccountAccessState,
  getDashboardPathByRole,
} from "@/lib/accountAccess";
import {
  disconnectSocket,
  initiateSocketConnection,
  subscribeToNotificationReads,
  subscribeToNotifications,
  subscribeToUserStatusUpdates,
} from "@/lib/socket";

const ADMIN_SECTIONS = [
  { title: "Core", items: [{ to: "/admin-dashboard", label: "Overview", icon: LayoutDashboard }] },
  { title: "Users", items: [{ to: "/admin/users", label: "Users", icon: Users }, { to: "/admin/providers", label: "Providers", icon: BriefcaseBusiness }] },
  { title: "Services", items: [{ to: "/admin/service-catalog", label: "Service Catalog", icon: BriefcaseBusiness }] },
  { title: "Finance", items: [{ to: "/admin/payouts", label: "Payouts", icon: Wallet2 }, { to: "/admin/transactions", label: "Transactions", icon: ReceiptText }] },
  { title: "Reviews", items: [{ to: "/admin/reviews", label: "Ratings & Reviews", icon: Star }, { to: "/admin/disputes", label: "Disputes", icon: MessagesSquare }] },
  { title: "Settings", items: [{ to: "/admin/settings", label: "Platform Settings", icon: Settings2 }, { to: "/admin/security", label: "Security", icon: ShieldCheck }] },
];

const ROLE_NAV = {
  CLIENT: [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/client/providers", label: "Providers", icon: BriefcaseBusiness },
    { to: "/client/bookings", label: "Bookings", icon: CalendarClock },
    { to: "/client/payments", label: "Payments", icon: Wallet2 },
    { to: "/client/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/client/tasks", label: "Tasks", icon: CheckCircle2 },
    { to: "/client/notifications", label: "Notifications", icon: Bell },
    { to: "/client/chat", label: "Chat", icon: MessageSquare },
    { to: "/client/disputes", label: "Disputes", icon: ShieldCheck },
    { to: "/client/verification", label: "Verification", icon: FileText },
  ],
  PROVIDER: [
    { to: "/provider-dashboard", label: "Dashboard", icon: Home },
    { to: "/provider/booking-management", label: "Bookings", icon: CalendarClock },
    { to: "/provider/earnings", label: "Earnings", icon: Wallet2 },
    { to: "/provider/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/provider/services", label: "Services", icon: BriefcaseBusiness },
    { to: "/provider/reputation", label: "Reputation", icon: Star },
    { to: "/provider/notifications", label: "Notifications", icon: Bell },
    { to: "/provider/chat", label: "Chat", icon: MessageSquare },
    { to: "/provider/disputes", label: "Disputes", icon: ShieldCheck },
    { to: "/provider/verification", label: "Verification", icon: FileText },
    { to: "/provider/availability", label: "Availability", icon: Clock },
  ],
};

const ROLE_UTIL = {
  CLIENT: [
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ],
  PROVIDER: [{ to: "/provider/settings", label: "Settings", icon: SettingsIcon }],
};

const SPECIAL_BOTTOM = {
  CLIENT: [{ to: "/help-support", label: "Support", icon: CircleHelp }],
  PROVIDER: [{ to: "/provider/help-support", label: "Support", icon: CircleHelp }],
};

const TITLES = {
  CLIENT: {
    "/dashboard": "Client Dashboard",
    "/client/providers": "Service Providers",
    "/client/bookings": "My Bookings",
    "/client/payments": "Payments & Invoices",
    "/client/analytics": "Spending Analytics",
    "/client/tasks": "Pending Tasks",
    "/client/notifications": "Notifications Center",
    "/client/chat": "Messages & Chat",
    "/client/disputes": "Disputes & Support",
    "/client/verification": "Identity Verification",
    "/settings": "Account Settings",
    "/help-support": "Help & Support",
  },
  PROVIDER: {
    "/provider-dashboard": "Provider Dashboard",
    "/provider/booking-management": "Bookings Management",
    "/provider/earnings": "Earnings Breakdown",
    "/provider/analytics": "Dashboard Analytics",
    "/provider/services": "Service Management",
    "/provider/reputation": "Reputation System",
    "/provider/notifications": "Notifications Center",
    "/provider/chat": "Chat System",
    "/provider/disputes": "Disputes & Issues",
    "/provider/verification": "Documents & Verification",
    "/provider/availability": "Availability & Sessions",
    "/provider/settings": "Settings",
    "/provider/help-support": "Support",
  },
  ADMIN: {
    "/admin-dashboard": "Admin Dashboard",
    "/admin/users": "Users",
    "/admin/providers": "Providers",
    "/admin/service-catalog": "Service Catalog",
    "/admin/transactions": "Transactions",
    "/admin/payouts": "Payouts",
    "/admin/reviews": "Ratings & Reviews",
    "/admin/disputes": "Disputes",
    "/admin/settings": "Platform Settings",
    "/admin/security": "Security",
  },
};

const getInitial = (value = "") => String(value).trim().charAt(0).toUpperCase() || "U";
const formatNotificationTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

function ShellLink({ item, active, collapsed, provider = false, adminLight = false, onClick }) {
  const Icon = item.icon;
  const adminActive = "admin-sidebar-link-active";
  const adminLightHover = "admin-sidebar-link-hover";
  const base = provider
    ? active
      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
      : "text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
    : active
      ? adminActive
      : adminLight
        ? adminLightHover
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  const iconBox = provider
    ? active
      ? "bg-white/15 text-primary-foreground"
      : "bg-sidebar-accent/45 text-sidebar-foreground/80"
    : adminLight && !active
      ? "admin-sidebar-icon-hover"
      : "";

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${base} ${collapsed ? "justify-center" : ""}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBox}`}>
        <Icon size={18} />
      </span>
      {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
    </NavLink>
  );
}

function ProfileMenu({ user, displayName, profileOpen, setProfileOpen, handleSettingsClick, handleLogout, provider = false, restricted = false }) {
  return (
    <div className="relative">
      <button
        type="button"
        className={`flex items-center gap-2 rounded-full border p-1 pr-2 transition-colors focus:outline-none ${
          provider ? "border-border/60 bg-card/75 hover:border-primary/30" : "border-transparent bg-transparent hover:bg-accent"
        }`}
        onClick={() => setProfileOpen((prev) => !prev)}
      >
        <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${provider ? "bg-primary/15 text-primary" : "bg-primary text-primary-foreground"}`}>
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt="profile" className="h-full w-full object-cover" />
          ) : (
            getInitial(displayName)
          )}
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${profileOpen ? "rotate-180 text-foreground" : ""}`} />
      </button>

      {profileOpen && (
        <div className={`absolute right-0 z-50 mt-3 w-60 rounded-[1.25rem] border p-2 shadow-2xl ${provider ? "border-border/70 bg-card/95 backdrop-blur-2xl" : "border-border bg-popover text-popover-foreground"}`}>
          <div className="mb-2 border-b border-border/60 px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          {!restricted ? (
            <button onClick={handleSettingsClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted/70">
              <Settings2 size={16} />
              Account Settings
            </button>
          ) : null}
          <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function RoleShell({ role }) {
  const { user, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const displayName = user?.name || user?.email || "User";
  const currentTitle = TITLES[role]?.[location.pathname] || `${role === "PROVIDER" ? "Provider" : role === "ADMIN" ? "Admin" : "Client"} Dashboard`;
  const themeClass = theme === "dark" ? "dark" : "";
  const isSpecialRole = role === "PROVIDER" || role === "CLIENT";
  const isAdminLight = role === "ADMIN" && theme === "light";
  const accountAccess = getAccountAccessState(user);
  const isRestrictedAccount = isSpecialRole && accountAccess.restricted;
  const visibleRoleNav = isRestrictedAccount ? (ROLE_NAV[role] || []).slice(0, 1) : ROLE_NAV[role] || [];
  const visibleRoleUtil = isRestrictedAccount ? [] : ROLE_UTIL[role] || [];
  const visibleSpecialBottom = isRestrictedAccount ? [] : SPECIAL_BOTTOM[role] || [];
  const roleScopeClass =
    role === "ADMIN"
      ? "role-scope-admin"
      : role === "PROVIDER"
        ? "role-scope-provider"
        : "role-scope-client";
  const adminSidebarShell = "border-border admin-sidebar-surface";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-client", "theme-provider", "theme-admin");
    root.classList.add(role === "ADMIN" ? "theme-admin" : role === "PROVIDER" ? "theme-provider" : "theme-client");
  }, [role]);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const applyNotificationReadState = (notificationIds = [], nextUnreadCount = null) => {
    if (notificationIds.length) {
      setNotifications((current) =>
        current.map((notification) =>
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      );
    }

    if (typeof nextUnreadCount === "number") {
      setUnreadNotificationCount(Math.max(0, nextUnreadCount));
    } else if (notificationIds.length) {
      setUnreadNotificationCount((current) => Math.max(0, current - notificationIds.length));
    }
  };

  const loadNotifications = async (showLoader = false) => {
    if (!user?.id) return;

    if (showLoader) {
      setNotificationsLoading(true);
    }

    try {
      const response = await api.get("/api/notifications?limit=8");
      const payload = response.data?.data || {};
      setNotifications(payload.items || []);
      setUnreadNotificationCount(payload.unreadCount || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      if (showLoader) {
        setNotificationsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!user?.id || isRestrictedAccount) return undefined;

    initiateSocketConnection(user.id);
    loadNotifications(true);

    const unsubscribeNew = subscribeToNotifications((err, payload) => {
      if (err || !payload?.notification) return;

      setNotifications((current) => {
        const deduped = current.filter(
          (notification) => notification.id !== payload.notification.id
        );
        return [payload.notification, ...deduped].slice(0, 8);
      });
      setUnreadNotificationCount((current) =>
        typeof payload.unreadCount === "number"
          ? payload.unreadCount
          : current + (payload.notification.read ? 0 : 1)
      );
    });

    const unsubscribeRead = subscribeToNotificationReads((err, payload) => {
      if (err) return;
      applyNotificationReadState(
        payload?.notificationIds || [],
        payload?.unreadCount
      );
    });

    const unsubscribeUserStatus = subscribeToUserStatusUpdates(
      async (err, payload) => {
        if (err || !payload?.userId || payload.userId !== user.id) {
          return;
        }

        await refreshProfile({ silent: true });
        if (payload.message) {
          toast.info(payload.message);
        }
      }
    );

    return () => {
      unsubscribeNew();
      unsubscribeRead();
      unsubscribeUserStatus();
      disconnectSocket();
    };
  }, [isRestrictedAccount, refreshProfile, user?.id]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  useEffect(() => {
    if (!notifications.length && unreadNotificationCount === 0) return;
    if (notifications.some((notification) => !notification.read)) return;
    if (unreadNotificationCount !== 0) setUnreadNotificationCount(0);
  }, [notifications, unreadNotificationCount]);

  const handleLogout = () => {
    logout();
  };

  const handleSettingsClick = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    if (isRestrictedAccount) {
      navigate(getDashboardPathByRole(role));
      return;
    }
    navigate(role === "ADMIN" ? "/admin/settings" : role === "PROVIDER" ? "/provider/settings" : "/settings");
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) setMobileOpen((prev) => !prev);
    else setSidebarCollapsed((prev) => !prev);
  };

  const closeDrawer = () => setMobileOpen(false);
  const showNotificationDot = Math.max(unreadNotificationCount, unreadNotifications) > 0;

  const handleNotificationToggle = () => {
    setProfileOpen(false);
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      loadNotifications(true);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      const payload = response.data?.data || {};
      applyNotificationReadState(
        payload.notification ? [payload.notification.id] : [notificationId],
        payload.unreadCount
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    if (!notification.read) {
      await handleMarkNotificationRead(notification.id);
    }

    setNotificationsOpen(false);

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const response = await api.put("/api/notifications/read-all");
      const payload = response.data?.data || {};
      applyNotificationReadState(
        payload.notificationIds || notifications.filter((notification) => !notification.read).map((notification) => notification.id),
        payload.unreadCount
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const sidebarBody = (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className={`px-2 ${isSpecialRole ? "pb-6 pt-5" : "mb-2 py-6 px-3"}`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center ${isSpecialRole ? `h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary ${role === "PROVIDER" ? "to-emerald-300" : "to-sky-300"} text-primary-foreground shadow-lg shadow-primary/25` : "h-8 w-8 rounded bg-primary text-primary-foreground"}`}>
            <BriefcaseBusiness size={isSpecialRole ? 20 : 18} />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-tight">{role === "ADMIN" ? "Admin" : role === "PROVIDER" ? "Provider" : "Client"}</p>
              {isSpecialRole ? <p className="mt-1 truncate text-xs text-sidebar-foreground/55">{isRestrictedAccount ? "Restricted access" : role === "PROVIDER" ? "Service workspace" : "Client workspace"}</p> : null}
            </div>
          )}
        </div>
      </div>

      <nav className="force-scrollbar flex-1 space-y-1 overflow-y-auto pr-1">
        {role === "ADMIN" ? (
          ADMIN_SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              {!sidebarCollapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/50">{section.title}</p>}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <ShellLink key={item.to} item={item} active={location.pathname === item.to} collapsed={sidebarCollapsed} adminLight={isAdminLight} onClick={closeDrawer} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            {visibleRoleNav.map((item) => (
              <ShellLink key={item.to} item={item} active={location.pathname === item.to} collapsed={sidebarCollapsed} provider={isSpecialRole} onClick={closeDrawer} />
            ))}

            {!isRestrictedAccount && (
              <div className="mt-6 border-t border-sidebar-foreground/10 pt-6">
                {visibleRoleUtil.map((item) => (
                  <ShellLink key={item.to} item={item} active={location.pathname === item.to} collapsed={sidebarCollapsed} provider={isSpecialRole} onClick={closeDrawer} />
                ))}
              </div>
            )}

            {isRestrictedAccount && !sidebarCollapsed ? (
              <div className="mt-6 rounded-[1.5rem] border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-6 text-sidebar-foreground/80">
                Your account can access only the dashboard until admin restores full access.
              </div>
            ) : null}
          </>
        )}
      </nav>

      {isSpecialRole ? (
        <div className="mt-auto space-y-3 border-t border-sidebar-foreground/10 pt-5">
          {visibleSpecialBottom.map((item) => (
            <ShellLink key={item.to} item={item} active={location.pathname === item.to} collapsed={sidebarCollapsed} provider onClick={closeDrawer} />
          ))}
          {!sidebarCollapsed && (
            <div className="rounded-[1.5rem] border border-sidebar-foreground/10 bg-sidebar-accent/45 p-3 shadow-[0_24px_48px_-30px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-sm font-semibold text-primary">
                  {user?.profilePhoto ? <img src={user.profilePhoto} alt="profile" className="h-full w-full object-cover" /> : getInitial(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-sidebar-foreground/60">{isRestrictedAccount ? "Access limited" : role === "PROVIDER" ? "Provider" : "Client"}</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-sidebar-foreground/72 transition-all hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground ${sidebarCollapsed ? "justify-center" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent/45">
              <LogOut size={18} />
            </span>
            {!sidebarCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      ) : (
        <div className="mb-4 mt-8 border-t border-sidebar-foreground/10 pt-4">
          {!sidebarCollapsed && user ? (
            <div className="mx-2 flex items-center gap-3 rounded-xl border border-sidebar-foreground/10 bg-sidebar-accent/50 px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                {user?.profilePhoto ? <img src={user.profilePhoto} alt="profile" className="h-full w-full object-cover" /> : <span className="text-sm font-bold uppercase">{getInitial(displayName)}</span>}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</span>
                <span className="truncate text-xs capitalize text-sidebar-foreground/60">{role.toLowerCase()}</span>
              </div>
            </div>
          ) : (
            <button onClick={handleLogout} className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut size={18} />
            </button>
          )}
          {!sidebarCollapsed && (
            <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut size={16} />
              <span className="whitespace-nowrap">Logout</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex min-h-screen bg-background font-sans text-foreground transition-colors duration-300 ${themeClass} ${roleScopeClass}`}>
      <aside className={`relative z-40 hidden flex-shrink-0 border-r px-4 py-2 md:block ${isSpecialRole ? (sidebarCollapsed ? "w-24" : "w-72") : (sidebarCollapsed ? "w-[88px]" : "w-[280px]")} ${isSpecialRole ? "border-border/60 bg-sidebar/95 shadow-[0_30px_80px_-45px_rgba(4,12,8,0.55)] backdrop-blur-2xl" : isAdminLight ? adminSidebarShell : "border-border bg-sidebar shadow-xl backdrop-blur-xl"}`}>
        {sidebarBody}
      </aside>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden" onClick={closeDrawer} />
          <div className={`fixed inset-y-0 left-0 z-50 w-72 border-r px-4 py-2 shadow-2xl md:hidden ${isSpecialRole ? "border-border/70 bg-sidebar/95 backdrop-blur-2xl" : isAdminLight ? adminSidebarShell : "border-border bg-sidebar"}`}>
            {sidebarBody}
          </div>
        </>
      )}

      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
        {isSpecialRole ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-8%] top-[-12%] h-[360px] w-[360px] rounded-full bg-primary/18 blur-[120px]" />
            <div className={`absolute bottom-[-14%] right-[-8%] h-[320px] w-[320px] rounded-full blur-[120px] dark:bg-primary/14 ${role === "PROVIDER" ? "bg-emerald-300/12" : "bg-sky-300/16"}`} />
          </div>
        ) : (
          <div className="pointer-events-none absolute left-1/4 top-[-10%] h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        )}

        <header className={`sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-2xl md:px-8 ${isSpecialRole ? "border-border/60 bg-background/82 supports-[backdrop-filter]:bg-background/72" : "border-border bg-background/80 supports-[backdrop-filter]:bg-background/60"}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" className={`inline-flex items-center justify-center transition-colors focus:outline-none ${isSpecialRole ? "h-11 w-11 rounded-2xl border border-border/60 bg-card/75 text-muted-foreground hover:border-primary/30 hover:text-primary" : "h-10 w-10 rounded-lg text-accent-foreground shadow-sm hover:bg-accent"}`} onClick={toggleSidebar}>
                {window.innerWidth < 768 ? <Menu size={20} /> : sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
              </button>
              <div className={`${isSpecialRole ? "min-w-0" : "relative ml-2 hidden max-w-md items-center text-sm text-muted-foreground md:flex"}`}>
                {isSpecialRole || window.innerWidth >= 768 ? <span className={`${isSpecialRole ? "truncate text-lg font-semibold tracking-tight text-foreground" : "font-semibold text-foreground"}`}>{currentTitle}</span> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleTheme} className={`inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none ${isSpecialRole ? "h-11 w-11 border-border/60 bg-card/75 text-muted-foreground hover:border-primary/30 hover:text-primary" : "h-10 w-10 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              {role === "CLIENT" && !isRestrictedAccount && (
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/75 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus:outline-none">
                  <Search size={19} />
                </button>
              )}
              {!isSpecialRole && (
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none">
                  <Search size={20} />
                </button>
              )}
              {!isRestrictedAccount ? <div className="relative">
                <button type="button" onClick={handleNotificationToggle} className={`relative inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none ${isSpecialRole ? "h-11 w-11 border-border/60 bg-card/75 text-muted-foreground hover:border-primary/30 hover:text-primary" : "h-10 w-10 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  <Bell size={isSpecialRole ? 19 : 20} />
                  {showNotificationDot ? (
                    <span className={`absolute inline-flex rounded-full ${isSpecialRole ? "right-3 top-3 h-2.5 w-2.5 bg-primary ring-2 ring-background" : "right-2 top-1 h-2 w-2 bg-destructive ring-2 ring-background"}`} />
                  ) : null}
                </button>

                {notificationsOpen && (
                  <div className={`absolute right-0 z-50 mt-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.5rem] border shadow-2xl ${isSpecialRole ? "border-border/70 bg-card/95 backdrop-blur-2xl" : "border-border bg-popover text-popover-foreground"}`}>
                    <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Notifications</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Math.max(unreadNotificationCount, unreadNotifications)} unread
                        </p>
                      </div>
                      {Math.max(unreadNotificationCount, unreadNotifications) > 0 ? (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-3">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center px-4 py-12 text-muted-foreground">
                          <Loader2 size={18} className="animate-spin" />
                        </div>
                      ) : notifications.length ? (
                        <div className="space-y-2">
                          {notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full rounded-[1.25rem] border p-4 text-left transition-all ${
                                notification.read
                                  ? "border-border/60 bg-background/45 hover:bg-muted/25"
                                  : "border-primary/15 bg-primary/8 hover:border-primary/25 hover:bg-primary/12"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? "bg-border" : "bg-primary"}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                      {notification.title}
                                    </p>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                                      {formatNotificationTime(notification.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted-foreground">
                                    {notification.message}
                                  </p>
                                  <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="rounded-full bg-muted/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      {notification.type || "general"}
                                    </span>
                                    {!notification.read ? (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleMarkNotificationRead(notification.id);
                                        }}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            handleMarkNotificationRead(notification.id);
                                          }
                                        }}
                                        className="text-xs font-semibold text-primary"
                                      >
                                        Mark as read
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-muted-foreground">
                                        Read
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-5 py-12 text-center">
                          <p className="text-sm font-medium text-foreground">
                            No notifications yet
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            New messages and updates will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div> : null}
              <ProfileMenu user={user} displayName={displayName} profileOpen={profileOpen} setProfileOpen={setProfileOpen} handleSettingsClick={handleSettingsClick} handleLogout={handleLogout} provider={isSpecialRole} restricted={isRestrictedAccount} />
            </div>
          </div>
        </header>

        <main className="relative z-10 w-full flex-1 overflow-x-hidden px-4 py-8 md:px-8 lg:px-10">
          <div className={`mx-auto w-full ${isSpecialRole ? "max-w-[1560px]" : "max-w-[1600px]"}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
