import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// User portal pages
import DashboardPage from './pages/DashboardPage';
import SlotBookingPage from './pages/SlotBookingPage';
import HistoryPage from './pages/HistoryPage';
import CalendarPage from './pages/CalendarPage';
import FeedbackPage from './pages/FeedbackPage';
import SettingsPage from './pages/SettingsPage';

// Coordinator pages
import CoordinatorEventsPage from './pages/coordinator/CoordinatorEventsPage';
import CoordinatorVenuesPage from './pages/coordinator/CoordinatorVenuesPage';

// Executive pages
import ExecutiveDashboardPage from './pages/executive/ExecutiveDashboardPage';
import CalendarManagementPage from './pages/executive/CalendarManagementPage';
import CoordinatorAccessPage from './pages/executive/CoordinatorAccessPage';
import BookingApprovalsPage from './pages/executive/BookingApprovalsPage';
import FeedbackReportsPage from './pages/executive/FeedbackReportsPage';
import AnalyticsPage from './pages/executive/AnalyticsPage';
import AuditLogPage from './pages/executive/AuditLogPage';
import UserManagementPage from './pages/executive/UserManagementPage';
import FacilityManagementPage from './pages/executive/FacilityManagementPage';
import PenaltyManagementPage from './pages/executive/PenaltyManagementPage';
import ExecutiveSettingsPage from './pages/executive/ExecutiveSettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Routes — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={<AppLayout><DashboardPage /></AppLayout>}
            />
            <Route
              path="/slot-booking"
              element={<AppLayout><SlotBookingPage /></AppLayout>}
            />
            <Route
              path="/history"
              element={<AppLayout><HistoryPage /></AppLayout>}
            />
            <Route
              path="/calendar"
              element={<AppLayout><CalendarPage /></AppLayout>}
            />
            <Route
              path="/feedback"
              element={<AppLayout><FeedbackPage /></AppLayout>}
            />
            <Route
              path="/settings"
              element={<AppLayout><SettingsPage /></AppLayout>}
            />
          </Route>

          {/* Coordinator Routes — coordinator, executive, admin only */}
          <Route element={<ProtectedRoute allowedRoles={['coordinator', 'executive', 'admin']} />}>
            <Route
              path="/coordinator/events"
              element={<AppLayout><CoordinatorEventsPage /></AppLayout>}
            />
            <Route
              path="/coordinator/venues"
              element={<AppLayout><CoordinatorVenuesPage /></AppLayout>}
            />
          </Route>

          {/* Executive Routes — executive, admin only */}
          <Route element={<ProtectedRoute allowedRoles={['executive', 'admin']} />}>
            <Route
              path="/executive/dashboard"
              element={<AppLayout><ExecutiveDashboardPage /></AppLayout>}
            />
            <Route
              path="/executive/calendar"
              element={<AppLayout><CalendarManagementPage /></AppLayout>}
            />
            <Route
              path="/executive/coordinators"
              element={<AppLayout><CoordinatorAccessPage /></AppLayout>}
            />
            <Route
              path="/executive/approvals"
              element={<AppLayout><BookingApprovalsPage /></AppLayout>}
            />
            <Route
              path="/executive/feedback"
              element={<AppLayout><FeedbackReportsPage /></AppLayout>}
            />
            <Route
              path="/executive/analytics"
              element={<AppLayout><AnalyticsPage /></AppLayout>}
            />
            <Route
              path="/executive/audit-log"
              element={<AppLayout><AuditLogPage /></AppLayout>}
            />
            <Route
              path="/executive/users"
              element={<AppLayout><UserManagementPage /></AppLayout>}
            />
            <Route
              path="/executive/facilities"
              element={<AppLayout><FacilityManagementPage /></AppLayout>}
            />
            <Route
              path="/executive/penalties"
              element={<AppLayout><PenaltyManagementPage /></AppLayout>}
            />
            <Route
              path="/executive/settings"
              element={<AppLayout><ExecutiveSettingsPage /></AppLayout>}
            />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
