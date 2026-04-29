import { Suspense, createElement, lazy } from "react";
import ScrollToHash from "./lib/ScrollToHash";

import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";
import MyAccountRoute from "./components/auth/MyAccountRoute";
import RoleShell from "./components/layouts/RoleShell";

import SectionPage from "./components/shared/SectionPage";
import SmoothScrollLayout from "./components/shared/SmoothScrollLayout";
import GlobalFeedback from "./components/shared/GlobalFeedback";

import { ThemeProvider } from "./components/contexts/ThemeContext";
import { WebSocketProvider } from "./components/contexts/WebSocketContext";
import { useAuth } from "./components/contexts/AuthContext";
import { useMaintenance } from "./components/contexts/MaintenanceContext";
import MaintenanceScreen from "./components/shared/MaintenanceScreen";
import {
  getAccountAccessState,
  getDashboardPathByRole,
  isRestrictedRouteAllowed,
} from "./lib/accountAccess";

const Index = lazy(() => import("./components/pages/Index.jsx"));
const NotFound = lazy(() => import("./components/pages/NotFound.jsx"));
const SignIn = lazy(() => import("./components/auth/SignIn.jsx"));
const SignUp = lazy(() => import("./components/auth/SignUp.jsx"));
const ProvidersList = lazy(
  () => import("./components/providers/ProvidersList"),
);
const ProviderProfile = lazy(
  () => import("./components/providers/ProviderProfile"),
);
const BookingPage = lazy(() => import("./components/booking/BookingPage"));
const BookingConfirmationPage = lazy(
  () => import("./components/booking/BookingConfirmationPage"),
);
const BookingPaymentPage = lazy(
  () => import("./components/booking/BookingPaymentPage"),
);

const AdminDashboard = lazy(
  () => import("./components/adminDashboard/AdminDashboard"),
);
const AdminUsers = lazy(() => import("./components/adminDashboard/AdminUsers"));
const AdminVerification = lazy(
  () => import("./components/adminDashboard/AdminVerification"),
);
const AdminBookings = lazy(
  () => import("./components/adminDashboard/AdminBookings"),
);
const AdminTransactions = lazy(
  () => import("./components/adminDashboard/AdminTransactions"),
);
const AdminDisputes = lazy(
  () => import("./components/adminDashboard/AdminDisputes"),
);
const AdminContactMessages = lazy(
  () => import("./components/adminDashboard/AdminContactMessages"),
);
const AdminSettings = lazy(
  () => import("./components/adminDashboard/AdminSettings"),
);
const AdminAdvancedSettings = lazy(
  () => import("./components/adminDashboard/AdminAdvancedSettings"),
);
const AdminCacheSettings = lazy(
  () => import("./components/adminDashboard/AdminCacheSettings"),
);
const AdminExportSettings = lazy(
  () => import("./components/adminDashboard/AdminExportSettings"),
);
const AdminSecurity = lazy(
  () => import("./components/adminDashboard/AdminSecurity"),
);

const ProviderDashboard = lazy(
  () => import("./components/providerDashboard/ProviderDashboard"),
);
const ProviderQuickActions = lazy(
  () => import("./components/providerDashboard/ProviderQuickActions"),
);
const ProviderIntegrationTest = lazy(
  () => import("./components/providerDashboard/ProviderIntegrationTest"),
);

const ClientDashboard = lazy(
  () => import("./components/clientDashboard/ClientDashboard"),
);
const ClientProviders = lazy(
  () => import("./components/clientDashboard/ClientProviders"),
);
const ClientBookings = lazy(
  () => import("./components/clientDashboard/ClientBookings"),
);
const ClientPayments = lazy(
  () => import("./components/clientDashboard/ClientPayments"),
);
const ClientAnalytics = lazy(
  () => import("./components/clientDashboard/ClientAnalytics"),
);
const ClientTasks = lazy(
  () => import("./components/clientDashboard/ClientTasks"),
);
const ClientNotifications = lazy(
  () => import("./components/clientDashboard/ClientNotifications"),
);
const ClientChat = lazy(
  () => import("./components/clientDashboard/ClientChat"),
);
const ClientDisputes = lazy(
  () => import("./components/clientDashboard/ClientDisputes"),
);
const ClientSupport = lazy(
  () => import("./components/clientDashboard/ClientSupport"),
);
const ProviderSupport = lazy(
  () => import("./components/providerDashboard/ProviderSupport"),
);
const ClientVerification = lazy(
  () => import("./components/clientDashboard/ClientVerification"),
);

const ProviderBookings = lazy(
  () => import("./components/providerDashboard/ProviderBookings"),
);
const ProviderEarnings = lazy(
  () => import("./components/providerDashboard/ProviderEarnings"),
);
const ProviderAnalytics = lazy(
  () => import("./components/providerDashboard/ProviderAnalytics"),
);
const ProviderServices = lazy(
  () => import("./components/providerDashboard/ProviderServices"),
);
const ProviderReputation = lazy(
  () => import("./components/providerDashboard/ProviderReputation"),
);
const ProviderNotifications = lazy(
  () => import("./components/providerDashboard/ProviderNotifications"),
);
const ProviderChat = lazy(
  () => import("./components/providerDashboard/ProviderChat"),
);
const ProviderDisputes = lazy(
  () => import("./components/providerDashboard/ProviderDisputes"),
);
const ProviderVerification = lazy(
  () => import("./components/providerDashboard/ProviderVerification"),
);
const ProviderDashboardProfile = lazy(
  () => import("./components/providerDashboard/ProviderProfile"),
);
const SettingsLayout = lazy(
  () => import("./components/settings/SettingsLayout"),
);

const SolutionsCustomers = lazy(
  () => import("./components/pages/saas/SolutionsCustomers"),
);
const SolutionsProviders = lazy(
  () => import("./components/pages/saas/SolutionsProviders"),
);
const SolutionsBusinesses = lazy(
  () => import("./components/pages/saas/SolutionsBusinesses"),
);
const Pricing = lazy(() => import("./components/pages/saas/Pricing"));
const AboutUs = lazy(() => import("./components/pages/saas/AboutUs"));
const Careers = lazy(() => import("./components/pages/saas/Careers"));
const Contact = lazy(() => import("./components/pages/saas/Contact"));
const Legal = lazy(() => import("./components/pages/saas/Legal"));

function RouteLoader({ label = "Loading content..." }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function LazyRoute({ component, label, ...props }) {
  return (
    <Suspense fallback={<RouteLoader label={label} />}>
      {createElement(component, props)}
    </Suspense>
  );
}

// Inner component that has access to useLocation
function AppRoutes() {
  const location = useLocation();
  const { user } = useAuth();
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

  // Only show loading screen for maintenance loading, not auth
  // Auth loads in background now for faster initial paint
  if (maintenanceLoading) {
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
        <Route
          path="/"
          element={<LazyRoute component={Index} label="Loading homepage..." />}
        />
        <Route
          path="/signin"
          element={
            <PublicOnlyRoute>
              <LazyRoute component={SignIn} label="Loading sign in..." />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <LazyRoute component={SignUp} label="Loading sign up..." />
            </PublicOnlyRoute>
          }
        />
        <Route path="/my-account" element={<MyAccountRoute />} />

        <Route
          path="/providers"
          element={
            <LazyRoute component={ProvidersList} label="Loading providers..." />
          }
        />
        <Route
          path="/providers/:id"
          element={
            <LazyRoute
              component={ProviderProfile}
              label="Loading provider profile..."
            />
          }
        />

        <Route
          element={
            <ProtectedRoute roles={["CLIENT"]}>
              <RoleShell role="CLIENT" />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <LazyRoute
                component={ClientDashboard}
                label="Loading dashboard..."
              />
            }
          />
          <Route
            path="/client/providers"
            element={
              <LazyRoute
                component={ClientProviders}
                label="Loading providers..."
              />
            }
          />
          <Route
            path="/client/bookings"
            element={
              <LazyRoute
                component={ClientBookings}
                label="Loading bookings..."
              />
            }
          />
          <Route
            path="/client/payments"
            element={
              <LazyRoute
                component={ClientPayments}
                label="Loading payments..."
              />
            }
          />
          <Route
            path="/client/analytics"
            element={
              <LazyRoute
                component={ClientAnalytics}
                label="Loading analytics..."
              />
            }
          />
          <Route
            path="/client/tasks"
            element={
              <LazyRoute component={ClientTasks} label="Loading tasks..." />
            }
          />
          <Route
            path="/client/notifications"
            element={
              <LazyRoute
                component={ClientNotifications}
                label="Loading notifications..."
              />
            }
          />
          <Route
            path="/client/chat"
            element={
              <LazyRoute component={ClientChat} label="Loading chat..." />
            }
          />
          <Route
            path="/client/disputes"
            element={
              <LazyRoute
                component={ClientDisputes}
                label="Loading disputes..."
              />
            }
          />
          <Route
            path="/client/support"
            element={
              <LazyRoute component={ClientSupport} label="Loading support..." />
            }
          />
          <Route
            path="/client/verification"
            element={
              <LazyRoute
                component={ClientVerification}
                label="Loading verification..."
              />
            }
          />
          <Route
            path="/settings"
            element={
              <LazyRoute
                component={SettingsLayout}
                role="CLIENT"
                label="Loading settings..."
              />
            }
          />
          <Route
            path="/help-support"
            element={
              <LazyRoute component={ClientSupport} label="Loading support..." />
            }
          />
          <Route
            path="/booking/:id"
            element={
              <LazyRoute component={BookingPage} label="Loading booking..." />
            }
          />
          <Route
            path="/booking/:id/confirm"
            element={
              <LazyRoute
                component={BookingConfirmationPage}
                label="Loading confirmation..."
              />
            }
          />
          <Route
            path="/bookings/:bookingId/payment"
            element={
              <LazyRoute
                component={BookingPaymentPage}
                label="Loading payment..."
              />
            }
          />
        </Route>

        <Route
          element={
            <ProtectedRoute roles={["PROVIDER"]}>
              <RoleShell role="PROVIDER" />
            </ProtectedRoute>
          }
        >
          <Route
            path="/provider-dashboard"
            element={
              <LazyRoute
                component={ProviderDashboard}
                label="Loading dashboard..."
              />
            }
          />
          <Route
            path="/provider/booking-management"
            element={
              <LazyRoute
                component={ProviderBookings}
                label="Loading bookings..."
              />
            }
          />
          <Route
            path="/provider/earnings"
            element={
              <LazyRoute
                component={ProviderEarnings}
                label="Loading earnings..."
              />
            }
          />
          <Route
            path="/provider/analytics"
            element={
              <LazyRoute
                component={ProviderAnalytics}
                label="Loading analytics..."
              />
            }
          />
          <Route
            path="/provider/services"
            element={
              <LazyRoute
                component={ProviderServices}
                label="Loading services..."
              />
            }
          />
          <Route
            path="/provider/quick-actions"
            element={
              <LazyRoute
                component={ProviderQuickActions}
                label="Loading quick actions..."
              />
            }
          />
          <Route
            path="/provider/profile"
            element={
              <LazyRoute
                component={SettingsLayout}
                role="PROVIDER"
                label="Loading profile..."
              />
            }
          />
          <Route
            path="/provider/integration-test"
            element={
              <LazyRoute
                component={ProviderIntegrationTest}
                label="Loading integration tools..."
              />
            }
          />
          <Route
            path="/provider/reputation"
            element={
              <LazyRoute
                component={ProviderReputation}
                label="Loading reputation..."
              />
            }
          />
          <Route
            path="/provider/notifications"
            element={
              <LazyRoute
                component={ProviderNotifications}
                label="Loading notifications..."
              />
            }
          />
          <Route
            path="/provider/chat"
            element={
              <LazyRoute component={ProviderChat} label="Loading chat..." />
            }
          />
          <Route
            path="/provider/disputes"
            element={
              <LazyRoute
                component={ProviderDisputes}
                label="Loading disputes..."
              />
            }
          />
          <Route
            path="/provider/verification"
            element={
              <LazyRoute
                component={ProviderVerification}
                label="Loading verification..."
              />
            }
          />
          <Route
            path="/provider/workspace"
            element={
              <LazyRoute
                component={ProviderDashboardProfile}
                label="Loading provider workspace..."
              />
            }
          />
          <Route
            path="/provider/settings"
            element={
              <LazyRoute
                component={SettingsLayout}
                role="PROVIDER"
                label="Loading settings..."
              />
            }
          />
          <Route
            path="/provider/help-support"
            element={
              <LazyRoute
                component={ProviderSupport}
                label="Loading provider support..."
              />
            }
          />
          <Route
            path="/provider/support"
            element={
              <LazyRoute
                component={ProviderSupport}
                label="Loading provider support..."
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
          <Route
            path="/admin"
            element={
              <LazyRoute
                component={AdminDashboard}
                label="Loading admin dashboard..."
              />
            }
          />
          <Route
            path="/admin/users"
            element={
              <LazyRoute component={AdminUsers} label="Loading users..." />
            }
          />
          <Route
            path="/admin/verification"
            element={
              <LazyRoute
                component={AdminVerification}
                label="Loading verification..."
              />
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <LazyRoute
                component={AdminBookings}
                label="Loading bookings..."
              />
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <LazyRoute
                component={AdminTransactions}
                label="Loading transactions..."
              />
            }
          />
          <Route
            path="/admin/disputes"
            element={
              <LazyRoute
                component={AdminDisputes}
                label="Loading disputes..."
              />
            }
          />
          <Route
            path="/admin/contact-messages"
            element={
              <LazyRoute
                component={AdminContactMessages}
                label="Loading support..."
              />
            }
          />
          <Route
            path="/admin/settings"
            element={
              <LazyRoute
                component={AdminSettings}
                label="Loading settings..."
              />
            }
          />
          <Route
            path="/admin/settings/advanced"
            element={
              <LazyRoute
                component={AdminAdvancedSettings}
                label="Loading advanced settings..."
              />
            }
          />
          <Route
            path="/admin/settings/cache"
            element={
              <LazyRoute
                component={AdminCacheSettings}
                label="Loading cache settings..."
              />
            }
          />
          <Route
            path="/admin/settings/export"
            element={
              <LazyRoute
                component={AdminExportSettings}
                label="Loading export settings..."
              />
            }
          />
          <Route
            path="/admin/settings/security"
            element={
              <LazyRoute
                component={AdminSecurity}
                label="Loading security settings..."
              />
            }
          />
        </Route>

        {/* SaaS Navbar Routes */}
        <Route
          path="/pricing"
          element={<LazyRoute component={Pricing} label="Loading pricing..." />}
        />
        <Route
          path="/solutions/customers"
          element={
            <LazyRoute
              component={SolutionsCustomers}
              label="Loading solutions..."
            />
          }
        />
        <Route
          path="/solutions/providers"
          element={
            <LazyRoute
              component={SolutionsProviders}
              label="Loading solutions..."
            />
          }
        />
        <Route
          path="/solutions/businesses"
          element={
            <LazyRoute
              component={SolutionsBusinesses}
              label="Loading solutions..."
            />
          }
        />
        <Route
          path="/resources/blog"
          element={
            <SectionPage title="Our blog" description="Latest news and tips." />
          }
        />
        <Route
          path="/resources/help"
          element={
            <SectionPage
              title="Help center"
              description="Find answers to your questions."
            />
          }
        />
        <Route
          path="/resources/faqs"
          element={
            <SectionPage
              title="FAQs"
              description="Frequently asked questions."
            />
          }
        />
        <Route
          path="/resources/guides"
          element={
            <SectionPage
              title="Guides"
              description="Learn how to use GoLocal."
            />
          }
        />
        <Route
          path="/company/about"
          element={<LazyRoute component={AboutUs} label="Loading about..." />}
        />
        <Route
          path="/company/careers"
          element={<LazyRoute component={Careers} label="Loading careers..." />}
        />
        <Route
          path="/company/contact"
          element={<LazyRoute component={Contact} label="Loading contact..." />}
        />
        <Route
          path="/company/legal"
          element={<LazyRoute component={Legal} label="Loading legal..." />}
        />

        <Route
          path="*"
          element={<LazyRoute component={NotFound} label="Loading page..." />}
        />
      </Routes>
    </SmoothScrollLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WebSocketProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollToHash />
          <AppRoutes />
        </BrowserRouter>
      </WebSocketProvider>
    </ThemeProvider>
  );
}
