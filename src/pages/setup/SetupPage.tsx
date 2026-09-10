import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Store } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { TextField } from '../../components/shared/FormField';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { claimFirstOwner, isFirstOwnerSetupNeeded, signIn, signUp } from '../../features/auth/auth.service';
import { useBrandName } from '../../features/preferences/useBrandName';

export function SetupPage() {
  const brandName = useBrandName();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isFirstOwnerSetupNeeded().then((needed) => {
      if (cancelled) return;
      setSetupNeeded(needed);
      setChecking(false);
      if (!needed) {
        setInfo('يوجد مديرة فعالة بالفعل. يمكنك تسجيل الدخول.');
      }
    }).catch(() => {
      if (!cancelled) setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const session = await signUp(email, password, fullName);
        if (!session) {
          setInfo('تم إنشاء الحساب. إذا كان تأكيد البريد مطلوباً، أكدي البريد ثم سجلي الدخول بنفس البريد لتتولي دور المديرة.');
          setMode('signin');
          return;
        }
        // session created, now claim ownership
        await claimFirstOwner();
        setInfo('تم تأسيس حساب المديرة بنجاح. جارٍ التحويل إلى لوحة التحكم...');
        setTimeout(() => navigate('/', { replace: true }), 800);
      } else {
        await signIn(email, password);
        await claimFirstOwner();
        setInfo('تم تأسيس حساب المديرة بنجاح. جارٍ التحويل إلى لوحة التحكم...');
        setTimeout(() => navigate('/', { replace: true }), 800);
      }
    } catch (reason) {
      setError(reason);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 p-6" dir="rtl">
        <p className="text-sm font-bold text-slate-600">جارٍ التحقق من حالة التأسيس...</p>
      </main>
    );
  }

  if (!setupNeeded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 p-6" dir="rtl">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-lg font-black">المعرض مُجهّز بالفعل</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">يوجد حساب مديرة فعال. لا يمكن تأسيس مديرة جديدة من هذه الصفحة. سجلي الدخول كمديرة لإدارة الحسابات.</p>
          <Link to="/login" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">الذهاب لتسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 px-4 py-12" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-l from-amber-200/50 via-transparent to-amber-100/60" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Store aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-950">{brandName} — تأسيس أولي</h1>
          <p className="mt-1 text-sm text-slate-600">هذه الصفحة تعمل مرة واحدة فقط عند عدم وجود مديرة. ستصبحين مديرة المعرض.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر التأسيس." className="mb-4" />}
          {info && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{info}</p>}

          <div className="mb-4 flex gap-2 rounded-xl bg-stone-100 p-1">
            <button type="button" onClick={() => setMode('signup')} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode==='signup' ? 'bg-white shadow' : 'text-slate-500'}`}>حساب جديد</button>
            <button type="button" onClick={() => setMode('signin')} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode==='signin' ? 'bg-white shadow' : 'text-slate-500'}`}>لدي حساب</button>
          </div>

          <div className="space-y-4">
            {mode==='signup' && (
              <TextField label="الاسم الكامل" value={fullName} onChange={(e)=>setFullName(e.target.value)} required disabled={submitting} />
            )}
            <TextField label="البريد الإلكتروني" type="email" autoComplete="username" value={email} onChange={(e)=>setEmail(e.target.value)} required disabled={submitting} />
            <TextField label="كلمة المرور" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={(e)=>setPassword(e.target.value)} required disabled={submitting} />
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={submitting} loading={submitting} loadingLabel="جارٍ التأسيس...">
            {mode==='signup' ? 'إنشاء حساب المديرة' : 'تسجيل دخول وتولي الإدارة'}
          </Button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            بعد التأسيس، هذه الصفحة ستتوقف عن العمل تلقائياً. يمكنك بعدها إنشاء حسابات موظفات من الإعدادات. البيانات تُحفظ في Supabase الخاص بمعرضك.
          </p>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs font-bold text-slate-600 underline">الذهاب لتسجيل الدخول</Link>
            <span className="mx-2 text-slate-300">·</span>
            <Link to="/landing" className="text-xs font-bold text-slate-600 underline">الصفحة العامة</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
