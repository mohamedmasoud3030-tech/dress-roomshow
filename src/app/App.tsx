import '../services/desktopDatabase';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuditLogPage } from '../features/audit/AuditLogPage';
import { AppointmentsPage } from '../features/appointments/AppointmentsPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { DashboardWithClosingAlertPage } from '../features/dashboard/DashboardWithClosingAlertPage';
import { DeliveryReturnPage } from '../features/delivery-return/DeliveryReturnPage';
import { DressesPage } from '../features/dresses/DressesPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { PreferencesPage } from '../features/preferences/PreferencesPage';
import { DailyClosingPage } from '../features/reports/DailyClosingPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ReservationsPage } from '../features/reservations/ReservationsPage';
import { LandingPage } from '../pages/landing/LandingPage';

export function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardWithClosingAlertPage />} />
        <Route path="dresses" element={<DressesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="delivery-return" element={<DeliveryReturnPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="daily-closing" element={<DailyClosingPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="preferences" element={<PreferencesPage />} />
        <Route path="*" element={<DashboardWithClosingAlertPage />} />
      </Route>
    </Routes>
  );
}
