import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CustomersPage } from '../features/customers/CustomersPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DeliveryReturnPage } from '../features/delivery-return/DeliveryReturnPage';
import { DressesPage } from '../features/dresses/DressesPage';
import { DressDetailsPage } from '../features/dresses/DressDetailsPage';
import { SalesLedgerPage } from '../features/dresses/SalesLedgerPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ReservationsPage } from '../features/reservations/ReservationsPage';
import { ReservationsCalendarPage } from '../features/reservations/ReservationsCalendarPage';
import { ServiceTasksPage } from '../features/service-tasks/ServiceTasksPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
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
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
