import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProviderDashboard from '../components/providerDashboard/ProviderDashboard';
import ProviderServices from '../components/providerDashboard/ProviderServices';
import ProviderBookings from '../components/providerDashboard/ProviderBookings';
import ProviderEarnings from '../components/providerDashboard/ProviderEarnings';
import ProviderQuickActions from '../components/providerDashboard/ProviderQuickActions';
import ProviderProfileSettings from '../components/providerDashboard/ProviderProfileSettings';
import ProtectedRoute from '../components/auth/ProtectedRoute';

const ProviderRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderServices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/earnings"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderEarnings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quick-actions"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderQuickActions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute roles={['provider']}>
            <ProviderProfileSettings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default ProviderRoutes;
