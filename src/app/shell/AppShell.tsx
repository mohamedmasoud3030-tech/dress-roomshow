import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PersistenceErrorBoundary } from '../../components/shared/PersistenceErrorBoundary';
import { PageContainer } from '../../components/shared/PageContainer';
import { StorageCapacityIndicator } from '../../components/shared/StorageCapacityIndicator';
import { CloudSaveAckToast } from '../../components/shared/CloudSaveAckToast';
import { AppHeader } from './AppHeader';
import { DesktopNavigation } from './DesktopNavigation';
import { MobileMoreMenu } from './MobileMoreMenu';
import { MobileNavigation } from './MobileNavigation';
import { focusRing } from './navigation';
import { useAdminTheme } from './useAdminTheme';
import { usePersistenceStatus } from './usePersistenceStatus';

export function AppShell() {
  const location = useLocation();
  const persistenceStatus = usePersistenceStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const adminTheme = useAdminTheme();

  const showPersistenceNotice =
    persistenceStatus.state === 'error' ||
    persistenceStatus.state === 'offline' ||
    persistenceStatus.state === 'local-only';

  return (
    <div className="min-h-screen overflow-hidden" dir="rtl" style={{ background: 'var(--canvas)', color: 'var(--ink)' }}>
      <a
        href="#main-content"
        className={`fixed right-4 top-4 z-50 -translate-y-24 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold shadow-lg transition focus:translate-y-0 ${focusRing}`}
      >
        الانتقال إلى المحتوى الرئيسي
      </a>

      <DesktopNavigation />

      <main id="main-content" className="relative min-h-screen w-full min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pr-72">
        <AppHeader theme={adminTheme.theme} onToggleTheme={adminTheme.toggle} />

        <PageContainer>
          {showPersistenceNotice && (
            <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              {persistenceStatus.message}
            </div>
          )}
          <div className="mb-4">
            <StorageCapacityIndicator compact />
          </div>
          <PersistenceErrorBoundary key={location.pathname}>
            <Outlet />
          </PersistenceErrorBoundary>
        </PageContainer>
      </main>

      <MobileNavigation onOpenMenu={() => setMobileMenuOpen(true)} />
      <MobileMoreMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      {/* Operational routes only: the public landing page never commits a
          money command, so it must never show this acknowledgement. */}
      <CloudSaveAckToast />
    </div>
  );
}
