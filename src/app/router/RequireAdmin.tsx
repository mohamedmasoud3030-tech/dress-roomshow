import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center shadow-sm" role="alert">
        <h1 className="text-xl font-black text-slate-950">هذه الصفحة للمديرة فقط</h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">حسابك يعمل بصورة طبيعية، لكن إعدادات النسخ والحسابات والصلاحيات تحتاج حساب مديرة.</p>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">العودة إلى لوحة التحكم</Link>
      </section>
    );
  }
  return <>{children}</>;
}
