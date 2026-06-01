import { useState } from 'react';
import { DatabaseBackup, Download, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { CURRENT_STORAGE_SCHEMA_VERSION, exportDatabaseBackup } from '../../services/localDatabase';
import { getAppPreferences, saveAppPreferences, type AppPreferences } from './preferences.service';

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
  const [error, setError] = useState<string | null>(null);

  const exportBackup = () => {
    const backup = exportDatabaseBackup();
    downloadJson(`dress-roomshow-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
    setFeedback('تم تجهيز النسخة الاحتياطية للتحميل.');
    setError(null);
  };

  const savePreferences = () => {
    try {
      setPreferences(saveAppPreferences(preferences));
      setFeedback('تم حفظ إعدادات التشغيل.');
      setError(null);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ إعدادات التشغيل.');
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الإعدادات" title="النسخ الاحتياطي وإعدادات التشغيل" description="احفظي نسخة آمنة من بيانات المحل واضبطي قواعد الحجز الأساسية من مكان واحد." />
      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div>}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <DatabaseBackup aria-hidden="true" className="h-6 w-6 text-amber-700" />
          <div><h2 className="text-lg font-bold">إدارة البيانات</h2><p className="mt-1 text-sm text-slate-500">إصدار هيكل التخزين: {CURRENT_STORAGE_SCHEMA_VERSION}</p></div>
        </div>
        <button type="button" onClick={exportBackup} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"><Download aria-hidden="true" className="h-4 w-4" /> تصدير نسخة JSON</button>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">قواعد التشغيل</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">اسم المعرض<input value={preferences.showroomName} onChange={(event) => setPreferences((current) => ({ ...current, showroomName: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="text-sm font-bold text-slate-700">أيام التجهيز قبل وبعد الحجز<input type="number" min="0" max="14" value={preferences.reservationBufferDays} onChange={(event) => setPreferences((current) => ({ ...current, reservationBufferDays: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="text-sm font-bold text-slate-700">حد الفستان الراكد بالأيام<input type="number" min="1" max="3650" value={preferences.dormantDressDays} onChange={(event) => setPreferences((current) => ({ ...current, dormantDressDays: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
        </div>
        <button type="button" onClick={savePreferences} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"><Save aria-hidden="true" className="h-4 w-4" /> حفظ الإعدادات</button>
      </article>
    </section>
  );
}
