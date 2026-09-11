import { getAppBuildInfo } from '@platform/app-update';
import { useBrandName } from '../preferences/useBrandName';

/**
 * «عن التطبيق والدعم» (UX-M3) — visible to staff, not admin-only.
 *
 * Until now the build identity lived only inside the admin preferences, so a
 * staff member hitting a problem had no in-app way to say which version she
 * runs or how errors reach support. This card answers both without inventing
 * any contact channel (PD-6: the app never fabricates contact information).
 */
export function AboutSupportCard() {
  const brandName = useBrandName();
  const build = getAppBuildInfo();

  return (
    <article aria-label="عن التطبيق والدعم" className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[11px] font-bold tracking-[0.16em] text-amber-700">عن التطبيق والدعم</p>
      <p className="mt-2 text-sm text-slate-600">
        {brandName} — نظام تشغيل المعرض. الإصدار الحالي:{' '}
        <span dir="ltr" className="font-semibold text-slate-800">{build.label}</span>
      </p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
        <p>عند ملاحظة أي عطل أو سلوك غير متوقع: تواصلي مع المديرة أو الدعم الفني، وأرفقي رقم الإصدار أعلاه — فهو يساعد على تحديد السبب بسرعة.</p>
        <p>الأعطال التقنية تُسجَّل تلقائيًا في سجل مركزي آمن تطّلع عليه المديرة من صفحة الإعدادات، حتى لو لم تُبلَّغي عنها بنفسك.</p>
      </div>
    </article>
  );
}
