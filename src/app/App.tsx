import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { PlaceholderPage } from '../components/shared/PlaceholderPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DressesPage } from '../features/dresses/DressesPage';
import { ReservationsPage } from '../features/reservations/ReservationsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dresses" element={<DressesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="delivery-return" element={<PlaceholderPage title="التسليم والاسترجاع" />} />
        <Route path="payments" element={<PlaceholderPage title="المدفوعات" />} />
        <Route path="expenses" element={<PlaceholderPage title="المصروفات" />} />
        <Route path="reports" element={<PlaceholderPage title="التقارير البسيطة" />} />
      </Route>
    </Routes>
  );
}
