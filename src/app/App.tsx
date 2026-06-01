import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CustomersPage } from '../features/customers/CustomersPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DeliveryReturnPage } from '../features/delivery-return/DeliveryReturnPage';
import { DressesPage } from '../features/dresses/DressesPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { PreferencesPage } from '../features/preferences/PreferencesPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ReservationsPage } from '../features/reservations/ReservationsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dresses" element={<DressesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="delivery-return" element={<DeliveryReturnPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="preferences" element={<PreferencesPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
