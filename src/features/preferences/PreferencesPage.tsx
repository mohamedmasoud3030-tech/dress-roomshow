import { useEffect, useRef, useState } from 'react';
import { Cloud, DatabaseBackup, Download, HardDrive, RefreshCw, RotateCcw, Save, Upload } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { PageHeader } from '../../components/shared/PageHeader';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { StorageCapacityIndicator } from '../../components/shared/StorageCapacityIndicator';
import { isIndexedDBAvailable } from '@platform/images';
import { getAppPreferences, type AppPreferences } from './preferences.service';
import {
  importDatabaseBackupCommand,
  migrateImagesCommand,
  resetApplicationDataCommand,
  saveAppPreferencesCommand,
} from '../workflows';
import { ShowroomProfileEditor } from './ShowroomProfileEditor';
import { AccountSettings } from './AccountSettings';
import { AccountManagement } from '../auth/AccountManagement';
import { SystemErrorsSummary } from '../observability/SystemErrorsSummary';
import { getAppBuildInfo } from '@platform/app-update';
import { downloadJson } from '@platform/download';
import {
  downloadCloudBackupCopy,
  listCloudBackupCopies,
  type CloudBackupCopy,
} from '@platform/backups';
import {
  classifySnapshotSize,
  readSnapshotSizeReading,
  SHOWROOM_SNAPSHOT_MAX_BYTES,
} from '../sync/snapshotSizeMetrics';
import { MessageTemplatesEditor } from './MessageTemplatesEditor';
import { PrintSettingsEditor } from './PrintSettingsEditor';
import { describeCloudCopyStatus, exportBackupForDownload } from './backupExport.service';
import {
  DESTRUCTIVE_SECTION_ID,
  PREFERENCES_SECTIONS,
  focusPreferencesSection,
} from './preferencesSections';
import { PreferencesSectionGroup } from './PreferencesSectionGroup';
import { runGuardedSettingsAction } from './runSettingsAction';

type CloudCopiesState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; copies: CloudBackupCopy[] };

// Restoring means JSON.parse of the whole file in memory; a multi-GB hostile
// or accidental file would freeze the counter device. 100 MiB mirrors the
// backups bucket per-file ceiling and is far above any real showroom backup.
const MAX_BACKUP_IMPORT_BYTES = 100 * 1024 * 1024;

function formatCopyBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const preferenceFieldClassName = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

/**
 * One labelled numeric setting.
 *
 * The operating-rules and late-fee cards used to hand-write nine near-identical
 * `<label><input type="number" …/></label>` blocks; the repetition is what made
 * this file's duplication measurable at all, and it made a change to the shared
 * field styling a nine-place edit.
 */
function NumberPreferenceField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  inputMode,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: 'decimal' | 'numeric';
  disabled?: boolean;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={preferenceFieldClassName}
      />
    </label>
  );
}

export function PreferencesPage() {
  const [preferences, setPreferences] = useState<AppPreferences>(() => getAppPreferences());
  const buildInfo = getAppBuildInfo();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [cloudCopies, setCloudCopies] = useState<CloudCopiesState>({ status: 'loading' });
  const [busyCopy, setBusyCopy] = useState<string | null>(null);
  const [snapshotReading] = useState(() => readSnapshotSizeReading());
  const snapshotLevel = classifySnapshotSize(snapshotReading?.bytes ?? null);
  const snapshotPercent = snapshotReading
    ? Math.min(100, Math.round((snapshotReading.bytes / SHOWROOM_SNAPSHOT_MAX_BYTES) * 100))
    : null;
  const importInput = useRef<HTMLInputElement>(null);

  const refreshCloudCopies = async () => {
    setCloudCopies({ status: 'loading' });
    const copies = await listCloudBackupCopies();
    setCloudCopies(copies === null ? { status: 'unavailable' } : { status: 'ready', copies });
  };

  useEffect(() => {
    void refreshCloudCopies();
  }, []);

  /**
   * Every settings action reports its outcome the same way: one success line or
   * the failure, never both, and the busy flag always clears. Returning `null`
   * means "the operator cancelled" — the screen is left exactly as it was, with
   * no message and no error cleared, which is what the previous early `return`
   * inside the try block did. The contract itself is unit-tested in
   * `tests/preferences-sections.test.mjs` via `runGuardedSettingsAction`.
   */
  const runSettingsAction = (action: () => Promise<string | null>, onSettled?: () => void) =>
    runGuardedSettingsAction({ setFeedback, setError }, action, onSettled);

  const exportBackup = async () => {
    setIsExporting(true);
    await runSettingsAction(async () => {
      const { cloudCopy } = await exportBackupForDownload({ source: 'manual' });
      if (cloudCopy === 'saved') void refreshCloudCopies();
      return `تم تجهيز النسخة الاحتياطية الكاملة للتحميل. احتفظي بها في مكان آمن.${describeCloudCopyStatus(cloudCopy)}`;
    }, () => setIsExporting(false));
  };

  const restoreCloudCopy = async (name: string) => {
    if (!window.confirm('سيتم استبدال بيانات التطبيق الحالية بالكامل بنسخة الخادم المختارة. هل أنتِ متأكدة؟')) return;
    setBusyCopy(name);
    await runSettingsAction(async () => {
      const parsed = await downloadCloudBackupCopy(name);
      if (parsed === null) throw new Error('تعذر تنزيل نسخة الخادم أو قراءتها.');
      await importDatabaseBackupCommand(parsed);
      setPreferences(getAppPreferences());
      return 'تمت الاستعادة من نسخة الخادم بنجاح. أعيدي تحميل الصفحة عند الحاجة لمراجعة جميع الأقسام.';
    }, () => setBusyCopy(null));
  };

  const downloadCloudCopy = async (name: string) => {
    setBusyCopy(name);
    await runSettingsAction(async () => {
      const parsed = await downloadCloudBackupCopy(name);
      if (parsed === null) throw new Error('تعذر تنزيل نسخة الخادم أو قراءتها.');
      downloadJson(name, parsed);
      return 'تم تنزيل نسخة الخادم إلى هذا الجهاز.';
    }, () => setBusyCopy(null));
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BACKUP_IMPORT_BYTES) {
      setError(`ملف النسخة أكبر من الحد المسموح (${formatCopyBytes(MAX_BACKUP_IMPORT_BYTES)}). تجاهلي هذا الملف واستخدمي نسخة سليمة.`);
      setFeedback(null);
      if (importInput.current) importInput.current.value = '';
      return;
    }
    await runSettingsAction(async () => {
      const parsed: unknown = JSON.parse(await file.text());
      if (!window.confirm('سيتم استبدال بيانات التطبيق الحالية بالكامل بالنسخة المختارة. هل أنتِ متأكدة؟')) return null;
      await importDatabaseBackupCommand(parsed);
      setPreferences(getAppPreferences());
      return 'تم استيراد النسخة الاحتياطية بنجاح. أعيدي تحميل الصفحة عند الحاجة لمراجعة جميع الأقسام.';
    }, () => {
      if (importInput.current) importInput.current.value = '';
    });
  };

  const resetAllData = () => {
    const confirmation = window.prompt('هذا الإجراء يمسح جميع البيانات نهائياً. اكتبي: تصفير البيانات');
    if (confirmation !== 'تصفير البيانات') {
      setError('لم يتم التصفير. عبارة التأكيد غير مطابقة.');
      setFeedback(null);
      return;
    }
    resetApplicationDataCommand();
    setPreferences(getAppPreferences());
    setFeedback('تم تصفير بيانات التطبيق.');
    setError(null);
  };

  const savePreferences = () => {
    try {
      setPreferences(saveAppPreferencesCommand(preferences));
      setFeedback('تم حفظ إعدادات التشغيل.');
      setError(null);
    } catch (saveError: unknown) {
      setError(saveError);
    }
  };

  const migrateImages = async () => {
    try {
      const result = await migrateImagesCommand();
      if (result.skipped) {
        setFeedback('الصور محفوظة بالفعل بالطريقة المحسّنة، أو أن الجهاز لا يدعم نقلها الآن.');
      } else {
        setFeedback(`تم تحسين حفظ ${result.migrated} صورة بنجاح.`);
      }
      setError(null);
    } catch (migrateError: unknown) {
      setError(migrateError);
      setFeedback(null);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الإعدادات" title="النسخ الاحتياطي وإعدادات التشغيل" />
      {/* Sticky so the tabs survive the scroll they exist to shorten. Sits just
          under the app header (z-20) and never above it. */}
      <nav aria-label="أقسام الإعدادات" className="sticky top-[4.25rem] z-10 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        {PREFERENCES_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => focusPreferencesSection(section.id)}
            className={`min-h-10 shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              section.id === DESTRUCTIVE_SECTION_ID ? 'text-rose-800 hover:bg-rose-50' : 'text-slate-700 hover:bg-stone-100'
            }`}
          >
            {section.label}
          </a>
        ))}
      </nav>
      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر إكمال عملية البيانات." />}

      <PreferencesSectionGroup id="data-backup">
        <StorageCapacityIndicator />

        <article className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <DatabaseBackup aria-hidden="true" className="h-6 w-6 text-amber-700" />
            <div><h2 className="text-lg font-bold">النسخ الاحتياطي والاستعادة</h2><p className="mt-1 text-sm text-slate-500">احتفظي بنسخة آمنة قبل استبدال البيانات أو تصفيرها.</p></div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">صدّري نسخة قبل أي استيراد أو تصفير. الاستيراد يستبدل البيانات الحالية فقط بعد تأكيد صريح.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void exportBackup()} disabled={isExporting} loading={isExporting} loadingLabel="جارٍ تجهيز النسخة...">
              <Download aria-hidden="true" className="h-4 w-4" />
              تنزيل نسخة احتياطية
            </Button>
            <Button type="button" variant="secondary" onClick={() => importInput.current?.click()}>
              <Upload aria-hidden="true" className="h-4 w-4" />
              استعادة نسخة احتياطية
            </Button>
            <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importBackup(event.target.files?.[0])} />

          </div>
        </article>

        <article id="cloud-backups" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Cloud aria-hidden="true" className="h-6 w-6 text-amber-700" />
            <div><h2 className="text-lg font-bold">نسخ الخادم الاحتياطية</h2><p className="mt-1 text-sm text-slate-500">كل نسخة تُصدَّر تُحفظ أيضًا على الخادم بحجمها الكامل، فيبقى بإمكانك الرجوع إلى نقطة زمنية سابقة حتى لو فُقد الجهاز.</p></div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">يحتفظ الخادم بآخر ٢٠ نسخة تلقائيًا. الاستعادة من هنا تستبدل البيانات الحالية بعد تأكيد صريح، وهي محمية بنفس تحقق الاستيراد وتراجعه.</p>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => void refreshCloudCopies()} loading={cloudCopies.status === 'loading'} loadingLabel="جارٍ التحميل...">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              تحديث القائمة
            </Button>
          </div>
          {cloudCopies.status === 'unavailable' && (
            <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">قائمة نسخ الخادم غير متاحة الآن. تحققي من الاتصال بالإنترنت ثم أعيدي التحميل.</p>
          )}
          {cloudCopies.status === 'ready' && cloudCopies.copies.length === 0 && (
            <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">لا توجد نسخ محفوظة على الخادم بعد. ستظهر هنا تلقائيًا بعد أول تصدير أو إقفال يومية.</p>
          )}
          {cloudCopies.status === 'ready' && cloudCopies.copies.length > 0 && (
            <ul className="mt-4 space-y-3">
              {cloudCopies.copies.map((copy) => (
                <li key={copy.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{copy.createdAt ? new Date(copy.createdAt).toLocaleString('ar-OM') : copy.name}</p>
                    <p className="mt-1 text-xs text-slate-500">الحجم: {formatCopyBytes(copy.bytes)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => void downloadCloudCopy(copy.name)} disabled={busyCopy !== null}>
                      <Download aria-hidden="true" className="h-4 w-4" />
                      تنزيل
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => void restoreCloudCopy(copy.name)} disabled={busyCopy !== null} loading={busyCopy === copy.name} loadingLabel="جارٍ التنفيذ..." className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100">
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      استعادة
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article id="storage-capacity" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">حجم قاعدة البيانات المركزية</h2>
          <p className="mt-1 text-sm text-slate-500">تُقاس تلقائيًا عند فتح التطبيق وبعد كل حفظ ناجٍ، ويقبل الخادم حتى {formatCopyBytes(SHOWROOM_SNAPSHOT_MAX_BYTES)} كحد أقصى.</p>
          {snapshotLevel === 'unknown' || snapshotPercent === null || !snapshotReading ? (
            <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">لا توجد قراءة بعد. افتحي التطبيق باتصال بالإنترنت ليُسجَّل القياس الأول.</p>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p className={`font-bold ${snapshotLevel === 'critical' ? 'text-rose-800' : snapshotLevel === 'warning' ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {formatCopyBytes(snapshotReading.bytes)} من {formatCopyBytes(SHOWROOM_SNAPSHOT_MAX_BYTES)} ({snapshotPercent}٪)
                </p>
                <p className="text-xs text-slate-500">آخر قياس: {new Date(snapshotReading.measuredAt).toLocaleString('ar-OM')}</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`نسبة امتلاء قاعدة البيانات المركزية ${snapshotPercent} بالمئة`}>
                <div className={`h-full rounded-full ${snapshotLevel === 'critical' ? 'bg-rose-500' : snapshotLevel === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(2, snapshotPercent)}%` }} />
              </div>
              {snapshotLevel === 'warning' && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">المساحة تجاوزت النصف. راجعي الدعم لترشيق بيانات الصور القديمة قبل الاقتراب من الحد.</p>
              )}
              {snapshotLevel === 'critical' && (
                <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-900">المساحة قاربت الامتلاء. عندها سيتوقف حفظ أي عملية جديدة حتى تُرشَّق البيانات — تواصلي مع الدعم الآن.</p>
              )}
            </div>
          )}
        </article>

        <article id="image-storage" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <HardDrive aria-hidden="true" className="h-6 w-6 text-amber-700" />
            <div><h2 className="text-lg font-bold">تحسين حفظ الصور</h2><p className="mt-1 text-sm text-slate-500">نقل الصور القديمة إلى مساحة أكثر ملاءمة داخل الجهاز.</p></div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">استخدمي هذه العملية مرة واحدة إذا كانت لديك صور قديمة كثيرة، لتقليل احتمالات امتلاء المساحة أثناء العمل.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void migrateImages()}>
              <HardDrive aria-hidden="true" className="h-4 w-4" />
              تحسين حفظ الصور القديمة
            </Button>
            {!isIndexedDBAvailable() && (
              <p className="self-center text-xs font-bold text-amber-700">هذا الجهاز لا يدعم نقل الصور القديمة تلقائيًا.</p>
            )}
          </div>
        </article>
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="operations">
        <article className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">قواعد التشغيل</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <NumberPreferenceField
              label="مدة التجهيز قبل التسليم (أيام)"
              min={0}
              max={14}
              value={preferences.preparationDaysBeforePickup}
              onChange={(next) => setPreferences((current) => ({ ...current, preparationDaysBeforePickup: next }))}
            />
                        <NumberPreferenceField
              label="مدة التنظيف بعد الإرجاع (أيام)"
              min={0}
              max={14}
              value={preferences.cleaningDaysAfterReturn}
              onChange={(next) => setPreferences((current) => ({ ...current, cleaningDaysAfterReturn: next }))}
            />
            <label className="text-sm font-bold text-slate-700">وقت الاستلام الافتراضي<input type="time" value={preferences.defaultPickupTime} onChange={(event) => setPreferences((current) => ({ ...current, defaultPickupTime: event.target.value }))} className={preferenceFieldClassName} /></label>
            <label className="text-sm font-bold text-slate-700">وقت الإرجاع الافتراضي<input type="time" value={preferences.defaultReturnTime} onChange={(event) => setPreferences((current) => ({ ...current, defaultReturnTime: event.target.value }))} className={preferenceFieldClassName} /></label>
                        <NumberPreferenceField
              label="حد العنصر الراكد بالأيام"
              min={1}
              max={3650}
              value={preferences.dormantDressDays}
              onChange={(next) => setPreferences((current) => ({ ...current, dormantDressDays: next }))}
            />
          </div>
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-slate-600">
            مدة التجهيز ومدة التنظيف تُوسّعان فترة الحجز المحجوبة تلقائياً، فلا يُقبل حجز جديد لنفس الفستان أو الملحق داخل هذه المدد.
          </p>

          {/* The fee is proposed, never imposed: waiving it for a good customer
              stays a decision the showroom makes, not the software. */}
          <h3 className="mt-6 text-base font-bold text-slate-900">سياسة رسوم التأخير</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">
              طريقة الاحتساب
              <select
                value={preferences.lateFeePolicy.mode}
                onChange={(event) => setPreferences((current) => ({
                  ...current,
                  lateFeePolicy: { ...current.lateFeePolicy, mode: event.target.value as AppPreferences['lateFeePolicy']['mode'] },
                }))}
                className={preferenceFieldClassName}
              >
                <option value="none">بدون احتساب تلقائي</option>
                <option value="fixed_per_day">مبلغ ثابت لكل يوم</option>
                <option value="percent_of_rental_per_day">نسبة من الإيجار لكل يوم</option>
              </select>
            </label>
            <NumberPreferenceField
              label="المبلغ اليومي (ر.ع)"
              min={0}
              step={0.001}
              inputMode="decimal"
              disabled={preferences.lateFeePolicy.mode !== 'fixed_per_day'}
              value={preferences.lateFeePolicy.amountPerDay}
              onChange={(next) => setPreferences((current) => ({
                ...current,
                lateFeePolicy: { ...current.lateFeePolicy, amountPerDay: next },
              }))}
            />
            <NumberPreferenceField
              label="النسبة اليومية (%)"
              min={0}
              max={100}
              inputMode="decimal"
              disabled={preferences.lateFeePolicy.mode !== 'percent_of_rental_per_day'}
              value={preferences.lateFeePolicy.percentPerDay}
              onChange={(next) => setPreferences((current) => ({
                ...current,
                lateFeePolicy: { ...current.lateFeePolicy, percentPerDay: next },
              }))}
            />
            <NumberPreferenceField
              label="مهلة السماح (أيام)"
              min={0}
              max={30}
              value={preferences.lateFeePolicy.graceDays}
              onChange={(next) => setPreferences((current) => ({
                ...current,
                lateFeePolicy: { ...current.lateFeePolicy, graceDays: next },
              }))}
            />
            <NumberPreferenceField
              label="الحد الأقصى (% من الإيجار)"
              min={0}
              max={1000}
              value={preferences.lateFeePolicy.maxPercentOfRental}
              onChange={(next) => setPreferences((current) => ({
                ...current,
                lateFeePolicy: { ...current.lateFeePolicy, maxPercentOfRental: next },
              }))}
            />
          </div>
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-slate-600">
            يقترح النظام قيمة رسوم التأخير عند تسجيل الاسترجاع، ويظل بإمكانك تعديلها أو إلغاؤها. صفر في الحد الأقصى يعني بلا سقف.
          </p>
          <Button type="button" onClick={savePreferences} className="mt-4">
            <Save aria-hidden="true" className="h-4 w-4" />
            حفظ الإعدادات
          </Button>
        </article>
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="accounts">
        <AccountSettings />

        <AccountManagement />
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="messages">
        <MessageTemplatesEditor />
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="printing">
        <PrintSettingsEditor />
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="public-profile">
        <ShowroomProfileEditor />
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="monitoring">
        <SystemErrorsSummary />
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="about">
        {/* Named here because support is impossible while the operator cannot
            answer "which version are you on?". */}
        <article className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">عن التطبيق</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">الإصدار</dt>
              <dd className="font-bold text-slate-950" dir="ltr">{buildInfo.version}</dd>
            </div>
            <div>
              <dt className="text-slate-500">تاريخ النسخة</dt>
              <dd className="font-bold text-slate-950" dir="ltr">{buildInfo.buildTime ? buildInfo.buildTime.slice(0, 10) : '—'}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-slate-600">
            اذكري رقم الإصدار عند طلب الدعم. التحديثات لا تُطبّق تلقائياً أثناء العمل؛ سيظهر لكِ تنبيه لاختيار وقت التحديث.
          </p>
        </article>
      </PreferencesSectionGroup>

      <PreferencesSectionGroup id="danger-zone">
        <article className="scroll-mt-24 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm">
          <p className="mt-2 text-sm leading-6 text-rose-800">تصفير البيانات يمسح سجلات التشغيل من مساحة المعرض. نزّلي نسخة احتياطية حديثة وتحققي من حفظها قبل المتابعة.</p>
          <Button type="button" variant="danger" onClick={resetAllData} className="mt-4">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            تصفير جميع البيانات
          </Button>
        </article>
      </PreferencesSectionGroup>
    </section>
  );
}
