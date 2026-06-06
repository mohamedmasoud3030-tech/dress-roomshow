import '../services/desktopDatabase';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuditLogPage } from '../features/audit/AuditLogPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { DashboardWithClosingAlertPage } from '../features/dashboard/DashboardWithClosingAlertPage';
import { DeliveryReturnPage } from '../features/delivery-return/DeliveryReturnPage';
import { DressDetailsPage } from '../features/dresses/DressDetailsPage';
import { DressesPage } from '../features/dresses/DressesPage';
import { SalesLedgerPage } from '../features/dresses/SalesLedgerPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { PreferencesPage } from '../features/preferences/PreferencesPage';
import { DailyClosingPage } from '../features/reports/DailyClosingPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ReservationsCalendarPage } from '../features/reservations/ReservationsCalendarPage';
import { ReservationsPage } from '../features/reservations/ReservationsPage';
import { ServiceTasksPage } from '../features/service-tasks/ServiceTasksPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardWithClosingAlertPage />} />
        <Route path="dresses" element={<DressesPage />} />
        <Route path="dresses/:code" element={<DressDetailsPage />} />
        <Route path="sales" element={<SalesLedgerPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/calendar" element={<ReservationsCalendarPage />} />
        <Route path="service-tasks" element={<ServiceTasksPage />} />
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
