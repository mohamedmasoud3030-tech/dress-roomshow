import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@app/shell/AppShell';
import { LoginPage } from '../../features/auth/LoginPage';
import { RequireAuth } from './RequireAuth';
import { RootGate } from './RootGate';
import { CloudDataGate } from '../../features/sync/CloudDataGate';
import { RouteLoadingFallback } from './RouteLoadingFallback';
import { RequireAdmin } from './RequireAdmin';
import {
  AccessoriesPage,
  AppointmentsPage,
  AuditLogPage,
  AvailabilitySearchPage,
  CustomersPage,
  CustomerDetailsPage,
  DailyClosingPage,
  DesignDetailsPage,
  DashboardWithClosingAlertPage,
  DeliveryReturnPage,
  DressDetailsPage,
  DressesPage,
  ExpensesPage,
  InventoryPerformancePage,
  LandingPage,
  LandingPiecePage,
  NotFoundPage,
  PaymentsPage,
  PreferencesPage,
  RemindersPage,
  ReportsPage,
  ReservationsPage,
  SalesLedgerPage,
  ServiceQueuePage,
  StocktakePage,
  WaitlistPage,
  SetupPage,
  PrivacyPage,
  TermsPage,
} from './routePages';

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/piece/:code" element={<LandingPiecePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/" element={<RootGate />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardWithClosingAlertPage />} />
        </Route>
      </Route>

      <Route
        element={
          <RequireAuth>
            <CloudDataGate>
              <AppShell />
            </CloudDataGate>
          </RequireAuth>
        }
      >
        <Route path="inventory" element={<DressesPage />} />
        <Route
          path="inventory/:code"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <DressDetailsPage />
            </Suspense>
          }
        />
        <Route
          path="designs/:code"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <DesignDetailsPage />
            </Suspense>
          }
        />
        <Route path="availability" element={<AvailabilitySearchPage />} />
        <Route path="accessories" element={<AccessoriesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="delivery-return" element={<DeliveryReturnPage />} />
        <Route path="sales" element={<SalesLedgerPage />} />
        <Route path="service" element={<ServiceQueuePage />} />
        <Route path="stocktake" element={<StocktakePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="daily-closing" element={<DailyClosingPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="inventory-performance"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <InventoryPerformancePage />
            </Suspense>
          }
        />
        <Route path="preferences" element={<RequireAdmin><PreferencesPage /></RequireAdmin>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
