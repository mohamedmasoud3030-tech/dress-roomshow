import { useBrandName } from '../../features/preferences/useBrandName';
import { NavLink } from 'react-router-dom';
import { focusRing, navigationGroups, publicPageLink } from './navigation';
import { useAuth } from '../../features/auth/AuthContext';

export function DesktopNavigation() {
  const brandName = useBrandName();
  const { profile } = useAuth();

  return (
    <aside
      className="fixed inset-y-0 right-0 hidden w-72 overflow-y-auto border-l px-3 py-5 lg:block"
      style={{ background: 'var(--canvas)', borderColor: 'var(--line)', color: 'var(--ink)' }}
    >
      <div className="mb-7 px-3 pt-1">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0">
            <p title={brandName} className="truncate text-[11px] font-bold tracking-[0.18em]" style={{ color: 'var(--gold)' }}>
              {brandName}
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">إدارة المعرض</h1>
          </div>
        </div>
      </div>

      <nav aria-label="التنقل الرئيسي" className="space-y-6">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || profile?.role === 'admin');
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `relative flex min-h-11 items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition duration-200 ${focusRing} ${
                        isActive ? '' : 'hover:bg-white/5'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'inset -2px 0 0 var(--gold)' }
                        : { color: 'var(--muted)' }
                    }
                  >
                    <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <NavLink
        to={publicPageLink.to}
        className={`mt-8 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-medium transition hover:bg-white/5 ${focusRing}`}
        style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
      >
        <publicPageLink.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{publicPageLink.label}</span>
      </NavLink>
    </aside>
  );
}
