import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '../pages/landing/LandingPage';
import { DashboardWithClosingAlertPage } from '../features/dashboard/DashboardWithClosingAlertPage';
import { DressesPage } from '../features/dresses/DressesPage';
import { AppointmentsPage } from '../features/appointments/AppointmentsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardWithClosingAlertPage />} />
        <Route path="/dresses" element={<DressesPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
