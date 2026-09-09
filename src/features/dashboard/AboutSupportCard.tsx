import { Info } from 'lucide-react';
import { getAppBuildInfo } from '@platform/app-update';

/**
 * «عن التطبيق والدعم» (UX-M3) — visible to staff, not admin-only.
 *
 * Until now the build identity lived only inside the admin preferences, so a
 * staff member hitting a problem had no in-app way to say which version she
 * runs or how errors reach support. This card answers both without inventing
 * any contact channel (PD-6: the app never fabricates contact information).
 */
export function AboutSupportCard() {
  const build = getAppBuildInfo();

  return (
    <article aria-label="عن التطبيق والدعم" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Info aria-hidden="true" className="h-6 w-6 text-amber-700" />
        <div>
          <h2 className="text-lg font-bold text-slate-950">عن التطبيق والدعم</h2>
          <p className="mt-1 text-sm text-slate-600">
            CARMEN GALLERY — نظام تشغيل المعرض. الإصدار الحالي: <span dir="ltr" className="font-bold text-slate-800">{build.label}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2 rounded-xl bg-stone-50 p-4 text-sm leading-6 text-slate-700">
        <p>عند ملاحظة أي عطل أو سلوك غير متوقع: تواصلي مع المديرة أو الدعم الفني، وأرفقي رقم الإصدار أعلاه — فهو يساعد على تحديد السبب بسرعة.</p>
        <p>الأعطال التقنية تُسجَّل تلقائيًا في سجل مركزي آمن تطّلع عليه المديرة من صفحة الإعدادات، حتى لو لم تُبلَّغي عنها بنفسك.</p>
      </div>
    </article>
  );
}
