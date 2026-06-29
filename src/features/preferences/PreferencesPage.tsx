import { useRef, useState } from 'react';
import { DatabaseBackup, Download, RotateCcw, Save, Upload } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  exportDatabaseBackup,
  importDatabaseBackup,
  resetDatabase,
} from '../../services/localDatabase';
import { recordAudit } from '../audit/audit.service';
import { getAppPreferences, saveAppPreferences, type AppPreferences } from './preferences.service';
import { ShowroomProfileEditor } from './ShowroomProfileEditor';

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PreferencesPage() {
  const [preferences, setPreferences] = useState<AppPreferences>(() => getAppPreferences());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const backup = exportDatabaseBackup();
    downloadJson(`dress-roomshow-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
    recordAudit({ action: 'create', entityType: 'backup', entityId: backup.exportedAt, summary: 'تم تصدير نسخة احتياطية من بيانات التطبيق.' });
    setFeedback('تم تجهيز النسخة الاحتياطية للتحميل. احتفظي بها في مكان آمن.');
    setError(null);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!window.confirm('سيتم استبدال بيانات التطبيق الحالية بالكامل بالنسخة المختارة. هل أنتِ متأكدة؟')) return;
      const restored = importDatabaseBackup(parsed);
      recordAudit({ action: 'import-backup', entityType: 'backup', entityId: restored.exportedAt, summary: 'تم استيراد نسخة احتياطية واستبدال بيانات التطبيق الحالية.' });
      setPreferences(getAppPreferences());
      setFeedback('تم استيراد النسخة الاحتياطية بنجاح. أعيدي تحميل الصفحة عند الحاجة لمراجعة جميع الأقسام.');
      setError(null);
    } catch (reason: unknown) {
      setError(reason);
      setFeedback(null);
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };

  const resetAllData = () => {
    const confirmation = window.prompt('هذا الإجراء يمسح جميع البيانات نهائياً. اكتبي: تصفير البيانات');
    if (confirmation !== 'تصفير البيانات') {
      setError('لم يتم التصفير. عبارة التأكيد غير مطابقة.');
      setFeedback(null);
      return;
    }
    resetDatabase();
    recordAudit({ action: 'reset-data', entityType: 'database', entityId: new Date().toISOString(), summary: 'تم تصفير بيانات التطبيق بعد تأكيد صريح.' });
    setPreferences(getAppPreferences());
    setFeedback('تم تصفير بيانات التطبيق.');
    setError(null);
  };

  const savePreferences = () => {
    try {
      setPreferences(saveAppPreferences(preferences));
      setFeedback('تم حفظ إعدادات التشغيل.');
      setError(null);
    } catch (saveError: unknown) {
      setError(saveError);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الإعدادات" title="النسخ الاحتياطي وإعدادات التشغيل" description="احفظي نسخة آمنة من بيانات المحل واضبطي قواعد الحجز الأساسية من مكان واحد." />
      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر إكمال عملية البيانات." />}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <DatabaseBackup aria-hidden="true" className="h-6 w-6 text-amber-700" />
          <div><h2 className="text-lg font-bold">إدارة البيانات</h2><p className="mt-1 text-sm text-slate-500">إصدار هيكل التخزين: {CURRENT_STORAGE_SCHEMA_VERSION}</p></div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">صدّري نسخة قبل أي استيراد أو تصفير. الاستيراد يستبدل البيانات الحالية فقط بعد تأكيد صريح.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={exportBackup} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"><Download aria-hidden="true" className="h-4 w-4" />تصدير نسخة JSON</button>
          <button type="button" onClick={() => importInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-stone-100"><Upload aria-hidden="true" className="h-4 w-4" />استيراد نسخة JSON</button>
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importBackup(event.target.files?.[0])} />
          <button type="button" onClick={resetAllData} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"><RotateCcw aria-hidden="true" className="h-4 w-4" />تصفير جميع البيانات</button>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">قواعد التشغيل</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">اسم المعرض<input value={preferences.showroomName} onChange={(event) => setPreferences((current) => ({ ...current, showroomName: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="text-sm font-bold text-slate-700">أيام التجهيز قبل وبعد الحجز<input type="number" min="0" max="14" value={preferences.reservationBufferDays} onChange={(event) => setPreferences((current) => ({ ...current, reservationBufferDays: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="text-sm font-bold text-slate-700">حد العنصر الراكد بالأيام<input type="number" min="1" max="3650" value={preferences.dormantDressDays} onChange={(event) => setPreferences((current) => ({ ...current, dormantDressDays: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
        </div>
        <button type="button" onClick={savePreferences} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"><Save aria-hidden="true" className="h-4 w-4" />حفظ الإعدادات</button>
      </article>

      <ShowroomProfileEditor />
    </section>
  );
}
