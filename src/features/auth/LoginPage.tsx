import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { TextField } from '../../components/shared/FormField';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { useAuth } from './AuthContext';
import { getSafeReturnPath } from './auth.model';
import { requestPasswordReset } from './auth.service';
import { useBrandName } from '../preferences/useBrandName';
import { useAdminTheme } from '../../app/shell/useAdminTheme';

/**
 * The real front door.
 *
 * Everything behind `AppShell` is now gated on a signed-in Supabase session
 * (see `RequireAuth`); this is the only screen reachable without one.
 */
export function LoginPage() {
  useAdminTheme();
  const brandName = useBrandName();
  const { status, message, signIn, signOut, retry } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  if (status === 'signed-in') {
    const redirectTo = getSafeReturnPath((location.state as { from?: string } | null)?.from);
    return <Navigate to={redirectTo} replace />;
  }

  const accountNotice =
    status === 'disabled'
      ? 'هذا الحساب موقوف. تواصلي مع مديرة المعرض لتفعيله.'
      : status === 'profile-missing'
        ? 'الحساب موجود لكن ملف الصلاحيات غير مكتمل. أعيدي المحاولة بعد لحظات.'
        : status === 'auth-error'
          ? (message ?? 'تعذر التحقق من الحساب الآن.')
          : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (reason) {
      setError(reason);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setFeedback(null);
    setResetting(true);
    try {
      await requestPasswordReset(email);
      setFeedback('أرسلنا رابط استعادة كلمة المرور إلى بريدك. افتحي الرسالة واتبعي الخطوات ثم عودي لتسجيل الدخول.');
    } catch (reason) {
      setError(reason);
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12" dir="rtl" style={{ background: 'var(--canvas)', color: 'var(--ink)' }}>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            <Lock aria-hidden="true" className="h-5 w-5" style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight" title={brandName}>{brandName}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>تسجيل الدخول لإدارة المعرض</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          {error !== null && (
            <UserFacingErrorAlert error={error} fallback="تعذر تسجيل الدخول." className="mb-4" />
          )}
          {feedback && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</p>}
          {accountNotice && (
            <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              {accountNotice}
              <div className="mt-3 flex flex-wrap gap-2">
                {status !== 'disabled' && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => void retry()}>
                    إعادة المحاولة
                  </Button>
                )}
                {(status === 'disabled' || status === 'profile-missing') && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => void signOut()}>
                    استخدام حساب آخر
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <TextField
              label="البريد الإلكتروني"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={submitting || status === 'loading'}
            />
            <TextField
              label="كلمة المرور"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={submitting || status === 'loading'}
            />
          </div>

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={submitting || resetting || status === 'loading'}
            loading={submitting || status === 'loading'}
            loadingLabel="جارٍ التحقق..."
          >
            دخول
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => void handlePasswordReset()}
            disabled={submitting || resetting || status === 'loading'}
            loading={resetting}
            loadingLabel="جارٍ إرسال رابط الاستعادة..."
          >
            نسيت كلمة المرور
          </Button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">الحسابات الجديدة تنشئها مديرة المعرض. إذا كان حسابك موقوفًا، تواصلي معها لتفعيله. أول مرة؟ استخدمي صفحة التأسيس لإنشاء حساب المديرة.</p>
          <div className="mt-3 flex justify-center gap-3 text-xs">
            <Link to="/setup" className="font-bold text-amber-700 underline">تأسيس المعرض لأول مرة</Link>
            <Link to="/landing" className="font-bold text-slate-600 underline">الصفحة العامة</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
