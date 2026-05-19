import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PlaceholderPage } from '../components/shared/PlaceholderPage';
import { DeliveryReturnPage } from '../features/delivery-return/DeliveryReturnPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dresses" element={<PlaceholderPage title="الفساتين" />} />
        <Route path="customers" element={<PlaceholderPage title="العملاء" />} />
        <Route path="reservations" element={<PlaceholderPage title="الحجوزات" />} />
        <Route path="delivery-return" element={<DeliveryReturnPage />} />
        <Route path="payments" element={<PlaceholderPage title="المدفوعات" />} />
        <Route path="expenses" element={<PlaceholderPage title="المصروفات" />} />
        <Route path="reports" element={<PlaceholderPage title="التقارير البسيطة" />} />
      </Route>
    </Routes>
  );
}
