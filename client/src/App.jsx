import ScrollToHash from "./lib/ScrollToHash";
import ProvidersList from "./components/providers/ProvidersList";
import ProviderProfile from "./components/providers/ProviderProfile";

import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";

import Index from "./components/pages/Index.jsx";
import NotFound from "./components/pages/NotFound.jsx";
import SignIn from "./components/auth/SignIn.jsx";
import SignUp from "./components/auth/SignUp.jsx";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";
import MyAccountRoute from "./components/auth/MyAccountRoute";
import RoleShell from "./components/layouts/RoleShell";

import BookingPage from "./components/booking/BookingPage";
import BookingConfirmationPage from "./components/booking/BookingConfirmationPage";
import AdminDashboard from "./components/adminDashboard/AdminDashboard";
import AdminUsers from "./components/adminDashboard/AdminUsers";
import AdminBookings from "./components/adminDashboard/AdminBookings";
import AdminTransactions from "./components/adminDashboard/AdminTransactions";
import AdminDisputes from "./components/adminDashboard/AdminDisputes";
import AdminContactMessages from "./components/adminDashboard/AdminContactMessages";
import AdminSettings from "./components/adminDashboard/AdminSettings";
import AdminAdvancedSettings from "./components/adminDashboard/AdminAdvancedSettings";
import AdminCacheSettings from "./components/adminDashboard/AdminCacheSettings";
import AdminExportSettings from "./components/adminDashboard/AdminExportSettings";
import AdminSecurity from "./components/adminDashboard/AdminSecurity";
import ProviderDashboard from "./components/providerDashboard/ProviderDashboard";
import ProviderReviews from "./components/providerDashboard/ProviderReviews";

// Client Dashboard (New High-Fidelity)
import ClientDashboard from "./components/clientDashboard/ClientDashboard";
import ClientProviders from "./components/dashboard/client/ClientProviders";
import ClientBookings from "./components/dashboard/client/ClientBookings";
import ClientPayments from "./components/dashboard/client/ClientPayments";
import ClientAnalytics from "./components/dashboard/client/ClientAnalytics";
import ClientTasks from "./components/dashboard/client/ClientTasks";
import ClientNotifications from "./components/dashboard/client/ClientNotifications";
import ClientChat from "./components/dashboard/client/ClientChat";
import ClientDisputes from "./components/dashboard/client/ClientDisputes";
import ClientSupport from "./components/dashboard/client/ClientSupport";
import ClientVerification from "./components/dashboard/client/ClientVerification";

// Provider Dashboard (New High-Fidelity)
import ProviderBookings from "./components/dashboard/provider/ProviderBookings";
import ProviderEarnings from "./components/dashboard/provider/ProviderEarnings";
import ProviderAnalytics from "./components/dashboard/provider/ProviderAnalytics";
import ProviderServices from "./components/dashboard/provider/ProviderServices";
import ProviderReputation from "./components/dashboard/provider/ProviderReputation";
import ProviderNotifications from "./components/dashboard/provider/ProviderNotifications";
import ProviderChat from "./components/dashboard/provider/ProviderChat";
import ProviderDisputes from "./components/dashboard/provider/ProviderDisputes";
import ProviderVerification from "./components/dashboard/provider/ProviderVerification";
import ProviderProfileDashboard from "./components/dashboard/provider/ProviderProfile";

import SectionPage from "./components/shared/SectionPage";
import SmoothScrollLayout from "./components/shared/SmoothScrollLayout";
import SettingsLayout from "./components/settings/SettingsLayout";
import GlobalFeedback from "./components/shared/GlobalFeedback";

// SaaS Pages
import SolutionsCustomers from "./components/pages/saas/SolutionsCustomers";
import SolutionsProviders from "./components/pages/saas/SolutionsProviders";
import SolutionsBusinesses from "./components/pages/saas/SolutionsBusinesses";
import Pricing from "./components/pages/saas/Pricing";
import AboutUs from "./components/pages/saas/AboutUs";
import Careers from "./components/pages/saas/Careers";
import Contact from "./components/pages/saas/Contact";
import Legal from "./components/pages/saas/Legal";

import { ThemeProvider } from "./components/contexts/ThemeContext";
import { useAuth } from "./components/contexts/AuthContext";
import { useMaintenance } from "./components/contexts/MaintenanceContext";
import MaintenanceScreen from "./components/shared/MaintenanceScreen";
import {
  getAccountAccessState,
  getDashboardPathByRole,
  isRestrictedRouteAllowed,
} from "./lib/accountAccess";

// Inner component that has access to useLocation
function AppRoutes() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const {
    maintenanceMode,
    platformName,
    supportEmail,
    maintenanceMessage,
    loading: maintenanceLoading,
  } = useMaintenance();

  const normalizedRole = String(user?.role || "").toUpperCase();
  const isAdminUser = normalizedRole === "ADMIN";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isSignInRoute = location.pathname === "/signin";
  const accountAccess = getAccountAccessState(user);

  if (authLoading || maintenanceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Loading workspace
          </p>
        </div>
      </div>
    );
  }

  if (maintenanceMode && !isAdminUser && !isAdminRoute && !isSignInRoute) {
    return (
      <MaintenanceScreen
        platformName={platformName}
        supportEmail={supportEmail}
        maintenanceMessage={maintenanceMessage}
      />
    );
  }

  if (
    accountAccess.restricted &&
    !isSignInRoute &&
    !isRestrictedRouteAllowed(user, location.pathname)
  ) {
    return (
      <Navigate
        to={getDashboardPathByRole(normalizedRole)}
        replace
        state={{
          message:
            "Your account has limited access. Please use your dashboard to contact the admin.",
        }}
      />
    );
  }

  return (
    <SmoothScrollLayout>
      <GlobalFeedback />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route
          path="/signin"
          element={
            <PublicOnlyRoute>
              <SignIn />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignUp />
            </PublicOnlyRoute>
          }
        />
        <Route path="/my-account" element={<MyAccountRoute />} />

        <Route path="/providers" element={<ProvidersList />} />
        <Route path="/providers/:id" element={<ProviderProfile />} />

        <Route
          element={
            <ProtectedRoute roles={["CLIENT"]}>
              <RoleShell role="CLIENT" />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/client/providers" element={<ClientProviders />} />
          <Route path="/client/bookings" element={<ClientBookings />} />
          <Route path="/client/payments" element={<ClientPayments />} />
          <Route path="/client/analytics" element={<ClientAnalytics />} />
          <Route path="/client/tasks" element={<ClientTasks />} />
          <Route path="/client/notifications" element={<ClientNotifications />} />
          <Route path="/client/chat" element={<ClientChat />} />
          <Route path="/client/disputes" element={<ClientDisputes />} />
          <Route path="/client/support" element={<ClientSupport />} />
          <Route path="/client/verification" element={<ClientVerification />} />
          <Route
            path="/settings"
            element={<SettingsLayout role="CLIENT" />}
          />
          <Route
            path="/help-support"
            element={<ClientSupport />}
          />
          <Route path="/booking/:id" element={<BookingPage />} />
          <Route
            path="/booking/:id/confirm"
            element={<BookingConfirmationPage />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute roles={["PROVIDER"]}>
              <RoleShell role="PROVIDER" />
            </ProtectedRoute>
          }
        >
          <Route path="/provider-dashboard" element={<ProviderDashboard />} />
          <Route
            path="/provider/booking-management"
            element={<ProviderBookings />}
          />
          <Route
            path="/provider/earnings"
            element={<ProviderEarnings />}
          />
          <Route
            path="/provider/analytics"
            element={<ProviderAnalytics />}
          />
          <Route
            path="/provider/services"
            element={<ProviderServices />}
          />
          <Route
            path="/provider/reputation"
            element={<ProviderReputation />}
          />
          <Route
            path="/provider/notifications"
            element={<ProviderNotifications />}
          />
          <Route
            path="/provider/chat"
            element={<ProviderChat />}
          />
          <Route
            path="/provider/disputes"
            element={<ProviderDisputes />}
          />
          <Route
            path="/provider/verification"
            element={<ProviderVerification />}
          />
          <Route
            path="/provider/availability"
            element={<ProviderProfileDashboard />}
          />
          <Route
            path="/provider/settings"
            element={<SettingsLayout role="PROVIDER" />}
          />
          <Route
            path="/provider/help-support"
            element={
              <SectionPage
                title="Provider Help & Support"
                description="Contact support for booking and payout assistance."
              />
            }
          />
        </Route>

        <Route
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RoleShell role="ADMIN" />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route
            path="/admin/transactions"
            element={<AdminTransactions />}
          />
          <Route path="/admin/disputes" element={<AdminDisputes />} />
          <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/settings/advanced" element={<AdminAdvancedSettings />} />
          <Route path="/admin/settings/cache" element={<AdminCacheSettings />} />
          <Route path="/admin/settings/export" element={<AdminExportSettings />} />
          <Route path="/admin/settings/security" element={<AdminSecurity />} />
        </Route>

        {/* SaaS Navbar Routes */}
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/solutions/customers" element={<SolutionsCustomers />} />
        <Route path="/solutions/providers" element={<SolutionsProviders />} />
        <Route path="/solutions/businesses" element={<SolutionsBusinesses />} />
        <Route path="/resources/blog" element={<SectionPage title="Our blog" description="Latest news and tips." />} />
        <Route path="/resources/help" element={<SectionPage title="Help center" description="Find answers to your questions." />} />
        <Route path="/resources/faqs" element={<SectionPage title="FAQs" description="Frequently asked questions." />} />
        <Route path="/resources/guides" element={<SectionPage title="Guides" description="Learn how to use GoLocal." />} />
        <Route path="/company/about" element={<AboutUs />} />
        <Route path="/company/careers" element={<Careers />} />
        <Route path="/company/contact" element={<Contact />} />
        <Route path="/company/legal" element={<Legal />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </SmoothScrollLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ScrollToHash />
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
