import '../services/desktopDatabase';
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { NotFoundPage } from '../components/shared/NotFoundPage';
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

const DressDetailsPage = lazy(async () => {
  const module = await import('../features/dresses/DressDetailsPage');
  return { default: module.DressDetailsPage };
});

export function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardWithClosingAlertPage />} />
        <Route path="inventory" element={<DressesPage />} />
        <Route
          path="inventory/:code"
          element={
            <Suspense
              fallback={
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <p className="text-lg font-bold text-slate-900">جاري تحميل تفاصيل العنصر…</p>
                  <p className="mt-2 text-sm text-slate-500">انتظر لحظة حتى يتم تجهيز بيانات الباركود والطباعة.</p>
                </section>
              }
            >
              <DressDetailsPage />
            </Suspense>
          }
        />
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
