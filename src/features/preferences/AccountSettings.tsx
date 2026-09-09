import { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Section } from '../../components/shared/Section';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { useAuth } from '../auth/AuthContext';

const ROLE_LABELS: Record<'admin' | 'staff', string> = {
  admin: 'مديرة',
  staff: 'موظفة',
};

/** The real, server-checked account — separate from the per-device operator name below. */
export function AccountSettings() {
  const { session, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSignOut = async () => {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (reason) {
      setError(reason);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Section title="الحساب" description="حساب الدخول المرتبط بهذا المتصفح، ويحدد صلاحية الوصول إلى بيانات المعرض.">
      {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر تسجيل الخروج." className="mb-3" />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {profile?.fullName ?? session?.user.email ?? '—'}
            </p>
            <p className="truncate text-xs text-slate-500" dir="ltr">
              {session?.user.email}
              {profile && ` · ${ROLE_LABELS[profile.role]}`}
            </p>
          </div>
        </div>

        <Button type="button" variant="secondary" onClick={handleSignOut} disabled={signingOut} loading={signingOut} loadingLabel="جارٍ الخروج...">
          <LogOut aria-hidden="true" className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </Section>
  );
}
