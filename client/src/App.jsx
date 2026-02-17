import ScrollToHash from "./lib/ScrollToHash";
import ProvidersList from "./components/providers/ProvidersList";
import ProviderProfile from "./components/providers/ProviderProfile";

import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./components/pages/Index.jsx";
import NotFound from "./components/pages/NotFound.jsx";
import SignIn from "./components/pages/SignIn/SignIn.jsx";
import SignUp from "./components/pages/SignUp/SignUp.jsx";

// Auth Guard
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Components (placeholder imports - these need to be created)
import BookingPage from "./components/booking/BookingPage";
import AdminDashboard from "./components/adminDashboard/AdminDashboard";
import ProviderDashboard from "./components/providerDashboard/ProviderDashboard";

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToHash />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected User Routes */}

        {/* Protected Provider Routes */}

        {/* Protected Admin Routes */}

        {/* 404 */}
        <Route path="/providers" element={<ProvidersList />} />
        <Route path="/providers/:id" element={<ProviderProfile />} />

        <Route
          path="/booking/:id"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider-dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
