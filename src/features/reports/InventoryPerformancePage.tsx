import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Printer } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { DataTable } from '../../components/shared/DataTable';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { EmptyState } from '../../components/shared/StateViews';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { ACCESSORY_CATEGORY_LABELS, ACCESSORY_CATEGORY_OPTIONS, ACCESSORY_STATUS_LABELS } from '../../shared/domain/accessoryConstants';
import { DRESS_CATEGORIES, DRESS_STATUS_LABELS, DRESS_STATUS_OPTIONS } from '../../shared/domain/dressConstants';
import { AMBER_FOCUS_RING_CLASS_NAME } from '../../shared/domain/formConstants';
import { downloadCsv } from '@platform/download';
import { toCsvFileName } from '../../shared/utils/csv';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { InventoryPerformanceDetailPanel } from './InventoryPerformanceDetailPanel';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import {
  PERFORMANCE_GRANULARITY_LABELS,
  PERFORMANCE_SORT_LABELS,
  buildInventoryPerformanceReport,
  getDefaultPerformanceFilters,
  getInventoryPerformanceDetail,
} from './inventoryPerformance.service';
import {
  buildInventoryPerformanceCsv,
  printInventoryPerformanceReport,
} from './inventoryPerformanceExport';
import type {
  DesignPerformanceRow,
  InventoryPerformanceDetail,
  InventoryPerformanceFilters,
  InventoryPerformanceRow,
  PerformanceSortKey,
} from './inventoryPerformance.types';

const fieldClassName =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

const SORT_KEYS: PerformanceSortKey[] = ['revenue', 'netResult', 'rentalCount', 'utilisationRate', 'idleDays', 'serviceCost'];

const KIND_LABELS = { dress: 'فستان', accessory: 'ملحق' } as const;

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function RowList({ title, description, rows, emptyText, onOpen }: {
  title: string;
  description: string;
  rows: InventoryPerformanceRow[];
  emptyText: string;
  onOpen: (row: InventoryPerformanceRow) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Button
                type="button"
                variant="quiet"
                onClick={() => onOpen(row)}
                aria-label={`فتح تفاصيل أداء ${row.code}`}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-stone-50 p-3 text-right hover:bg-stone-100"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">{row.code} — {row.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {KIND_LABELS[row.kind]} · إشغال {percent(row.utilisationRate)} · {row.rentalCount} تأجير
                  </span>
                </span>
                <span className={`shrink-0 text-sm font-extrabold ${row.netResult < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatMoneyOMR(row.netResult)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function InventoryPerformancePage() {
  const [filters, setFilters] = useState<InventoryPerformanceFilters>(() => getDefaultPerformanceFilters());
  const [detail, setDetail] = useState<InventoryPerformanceDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const report = useMemo(() => {
    try {
      const built = buildInventoryPerformanceReport(filters);
      setError(null);
      return built;
    } catch (reason: unknown) {
      setError(reason);
      return null;
    }
  }, [filters]);

  const update = <Key extends keyof InventoryPerformanceFilters>(key: Key, value: InventoryPerformanceFilters[Key]) => {
    setFeedback(null);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (key: PerformanceSortKey) => {
    setFilters((current) => ({
      ...current,
      sortBy: key,
      sortDirection: current.sortBy === key && current.sortDirection === 'desc' ? 'asc' : 'desc',
    }));
  };

  const openDetail = (row: InventoryPerformanceRow) => {
    setDetail(getInventoryPerformanceDetail(row.id, filters));
  };

  const exportCsv = () => {
    if (!report) return;
    // The BOM is inside the string; the shared helper must not re-encode it.
    downloadCsv(toCsvFileName('تقرير-أداء-المخزون', getTodayISO()), buildInventoryPerformanceCsv(report));
    setFeedback('تم تجهيز ملف CSV للتحميل بترميز يدعم العربية.');
  };

  const printReport = () => {
    if (!report) return;
    try {
      printInventoryPerformanceReport(report);
      setFeedback(null);
    } catch (reason: unknown) {
      setError(reason);
    }
  };

  const designColumns = [
    {
      key: 'design',
      header: 'التصميم',
      priority: 'primary' as const,
      render: (design: DesignPerformanceRow) => (
        <div>
          <Link
            to={`/designs/${encodeURIComponent(design.code)}`}
            className={`block font-bold text-slate-900 underline-offset-2 hover:underline ${AMBER_FOCUS_RING_CLASS_NAME}`}
          >
            {design.code} — {design.name}
          </Link>
          <span className="block text-xs text-slate-500">{design.category}</span>
        </div>
      ),
    },
    { key: 'pieces', header: 'القطع', priority: 'secondary' as const, render: (design: DesignPerformanceRow) => design.pieceCount },
    { key: 'rentals', header: 'تأجير', priority: 'secondary' as const, render: (design: DesignPerformanceRow) => design.rentalCount },
    { key: 'revenue', header: 'الإيراد', priority: 'secondary' as const, render: (design: DesignPerformanceRow) => formatMoneyOMR(design.totalRevenue) },
    { key: 'net', header: 'صافي العائد', priority: 'secondary' as const, render: (design: DesignPerformanceRow) => <span className={design.netResult < 0 ? 'font-bold text-rose-700' : 'font-bold text-emerald-700'}>{formatMoneyOMR(design.netResult)}</span> },
    { key: 'utilisation', header: 'الإشغال', priority: 'secondary' as const, render: (design: DesignPerformanceRow) => percent(design.utilisationRate) },
    { key: 'idle', header: 'قطع راكدة', priority: 'secondary' as const, render: (design: DesignPerformanceRow) => <span className={design.idlePieceCount > 0 ? 'font-bold text-amber-700' : undefined}>{design.idlePieceCount}</span> },
  ];

  const performanceColumns = [
    {
      key: 'item',
      header: 'العنصر',
      priority: 'primary' as const,
      render: (row: InventoryPerformanceRow) => <div><span className="block font-bold text-slate-900">{row.code} — {row.name}</span><span className="block text-xs text-slate-500">{KIND_LABELS[row.kind]} · {row.category} · {row.status}</span></div>,
    },
    { key: 'rentals', header: <Button type="button" variant="quiet" size="sm" onClick={() => toggleSort('rentalCount')} aria-label="ترتيب حسب عدد مرات التأجير" className="min-h-9 px-2 text-xs">تأجير</Button>, priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => row.rentalCount },
    { key: 'sales', header: 'بيع', priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => row.saleCount },
    { key: 'revenue', header: <Button type="button" variant="quiet" size="sm" onClick={() => toggleSort('revenue')} aria-label="ترتيب حسب الإيراد" className="min-h-9 px-2 text-xs">الإيراد</Button>, priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => formatMoneyOMR(row.totalRevenue) },
    { key: 'cost', header: <Button type="button" variant="quiet" size="sm" onClick={() => toggleSort('serviceCost')} aria-label="ترتيب حسب تكلفة الصيانة" className="min-h-9 px-2 text-xs">التكاليف</Button>, priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => formatMoneyOMR(row.totalCost) },
    { key: 'net', header: <Button type="button" variant="quiet" size="sm" onClick={() => toggleSort('netResult')} aria-label="ترتيب حسب صافي العائد" className="min-h-9 px-2 text-xs">صافي العائد</Button>, priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => <span className={row.netResult < 0 ? 'font-bold text-rose-700' : 'font-bold text-emerald-700'}>{formatMoneyOMR(row.netResult)}</span> },
    { key: 'utilisation', header: <Button type="button" variant="quiet" size="sm" onClick={() => toggleSort('utilisationRate')} aria-label="ترتيب حسب نسبة الإشغال" className="min-h-9 px-2 text-xs">الإشغال</Button>, priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => percent(row.utilisationRate) },
    { key: 'idle', header: <Button type="button" variant="quiet" size="sm" onClick={() => toggleSort('idleDays')} aria-label="ترتيب حسب الركود" className="min-h-9 px-2 text-xs">ركود</Button>, priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => row.idleDays === null ? '—' : row.idleDays },
    { key: 'details', header: 'التفاصيل', priority: 'secondary' as const, render: (row: InventoryPerformanceRow) => <Button type="button" variant="secondary" size="sm" onClick={() => openDetail(row)} aria-label={`فتح تفاصيل أداء ${row.code}`}>عرض</Button> },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="التقارير"
        title="أداء المخزون والربحية"
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={exportCsv} disabled={!report} className="no-print">
              <Download aria-hidden="true" className="h-5 w-5" />
              تصدير CSV
            </Button>
            <Button type="button" onClick={printReport} disabled={!report} className="no-print">
              <Printer aria-hidden="true" className="h-5 w-5" />
              طباعة أو PDF
            </Button>
          </>
        )}
      />

      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر بناء التقرير." />}

      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-bold text-slate-600">
            من تاريخ
            <input type="date" value={filters.from} onChange={(event) => update('from', event.target.value)} className={`mt-1 ${fieldClassName}`} />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            إلى تاريخ
            <input type="date" value={filters.to} onChange={(event) => update('to', event.target.value)} className={`mt-1 ${fieldClassName}`} />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            نوع العنصر
            <select value={filters.kind} onChange={(event) => update('kind', event.target.value as InventoryPerformanceFilters['kind'])} className={`mt-1 ${fieldClassName}`}>
              <option value="all">فساتين وملحقات</option>
              <option value="dress">فساتين فقط</option>
              <option value="accessory">ملحقات فقط</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            نوع العملية
            <select value={filters.operation} onChange={(event) => update('operation', event.target.value as InventoryPerformanceFilters['operation'])} className={`mt-1 ${fieldClassName}`}>
              <option value="both">تأجير وبيع</option>
              <option value="rental">تأجير</option>
              <option value="sale">بيع</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            الفئة
            <select value={filters.category} onChange={(event) => update('category', event.target.value as InventoryPerformanceFilters['category'])} className={`mt-1 ${fieldClassName}`}>
              <option value="all">كل الفئات</option>
              <optgroup label="فساتين">
                {DRESS_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </optgroup>
              <optgroup label="ملحقات">
                {ACCESSORY_CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{ACCESSORY_CATEGORY_LABELS[category]}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            الحالة
            <select value={filters.status} onChange={(event) => update('status', event.target.value as InventoryPerformanceFilters['status'])} className={`mt-1 ${fieldClassName}`}>
              <option value="all">كل الحالات</option>
              <optgroup label="فساتين">
                {DRESS_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{DRESS_STATUS_LABELS[status]}</option>)}
              </optgroup>
              <optgroup label="ملحقات">
                {Object.entries(ACCESSORY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            العرض الزمني
            <select value={filters.granularity} onChange={(event) => update('granularity', event.target.value as InventoryPerformanceFilters['granularity'])} className={`mt-1 ${fieldClassName}`}>
              {Object.entries(PERFORMANCE_GRANULARITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            حد الركود (أيام)
            <input
              type="number"
              min={1}
              max={3650}
              value={filters.idleThresholdDays}
              onChange={(event) => update('idleThresholdDays', Number(event.target.value) || 1)}
              className={`mt-1 ${fieldClassName}`}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
            بحث
            <input
              type="search"
              value={filters.search}
              onChange={(event) => update('search', event.target.value)}
              placeholder="ابحثي بكود أو اسم العنصر"
              className={`mt-1 ${fieldClassName}`}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
            الترتيب حسب
            <select value={filters.sortBy} onChange={(event) => update('sortBy', event.target.value as PerformanceSortKey)} className={`mt-1 ${fieldClassName}`}>
              {SORT_KEYS.map((key) => <option key={key} value={key}>{PERFORMANCE_SORT_LABELS[key]}</option>)}
            </select>
          </label>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <SummaryCard label="إجمالي الإيراد" value={formatMoneyOMR(report.totals.totalRevenue)} hint="إيراد محقق فقط" />
            <SummaryCard label="صافي العائد" value={formatMoneyOMR(report.totals.netResult)} tone={report.totals.netResult < 0 ? 'danger' : 'positive'} hint="بعد التكاليف المرتبطة" />
            <SummaryCard label="متوسط نسبة الإشغال" value={percent(report.totals.averageUtilisationRate)} hint="أيام الحجز ÷ الأيام المتاحة" />
            <SummaryCard label="عناصر راكدة" value={report.totals.idleItemCount} tone={report.totals.idleItemCount > 0 ? 'warning' : 'default'} hint={`بلا استخدام ${filters.idleThresholdDays}+ يوماً`} />
            <SummaryCard label="عدد العناصر" value={report.totals.itemCount} />
            <SummaryCard label="مرات التأجير" value={report.totals.rentalCount} />
            <SummaryCard label="إجمالي الخصومات" value={formatMoneyOMR(report.totals.discounts)} />
            <SummaryCard label="تكلفتها تفوق عائدها" value={report.totals.costHeavyItemCount} tone={report.totals.costHeavyItemCount > 0 ? 'warning' : 'default'} />
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">الإيراد مقابل التكاليف عبر الزمن</h2>
            <div className="mt-4">
              <PerformanceTrendChart points={report.timeline} />
            </div>
          </article>

          <div className="grid gap-4 xl:grid-cols-2">
            <RowList
              title="أعلى العناصر أداءً"
              description="مرتبة على صافي العائد ونسبة الإشغال معاً، وليس على عدد الحجوزات فقط."
              rows={report.topPerformers}
              emptyText="لا توجد عناصر ذات حركة في هذه الفترة."
              onOpen={openDetail}
            />
            <RowList
              title="أقل العناصر أداءً"
              description="عناصر تحركت لكن عائدها الصافي هو الأضعف."
              rows={report.lowPerformers}
              emptyText="لا توجد عناصر ذات حركة في هذه الفترة."
              onOpen={openDetail}
            />
            <RowList
              title="العناصر الراكدة"
              description={`لم تُستخدم منذ ${filters.idleThresholdDays} يوماً أو أكثر.`}
              rows={report.idleItems}
              emptyText="لا توجد عناصر راكدة."
              onOpen={openDetail}
            />
            <RowList
              title="العناصر كثيرة الصيانة"
              description="تكلفة الصيانة والتلف تمثل 35% أو أكثر من عائدها."
              rows={report.serviceHeavyItems}
              emptyText="لا توجد عناصر مرتفعة التكلفة."
              onOpen={openDetail}
            />
            <RowList
              title="العناصر المتأخرة باستمرار"
              description="عناصر تكرر تأخر إرجاعها خلال الفترة."
              rows={report.chronicallyLateItems}
              emptyText="لا توجد حالات تأخير في هذه الفترة."
              onOpen={openDetail}
            />
          </div>

          {report.designRows.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">أداء التصاميم</h2>
              <p className="mt-1 text-xs text-slate-500">
                مجمّع من قطع كل تصميم. نسبة الإشغال محسوبة على مجموع أيام القطع، فقطعة مشغولة لا تُخفي قطعاً راكدة.
              </p>
              <div className="mt-4 min-w-0 overflow-x-auto">
                <DataTable
                  rows={report.designRows}
                  columns={designColumns}
                  rowKey={(design) => design.designId}
                  caption="أداء كل تصميم خلال الفترة المحددة"
                />
              </div>
            </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">الجدول التفصيلي</h2>
            {report.rows.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="لا توجد عناصر مطابقة" description="غيّري الفترة أو الفلاتر لعرض نتائج أخرى." />
              </div>
            ) : (
              <>
                <p className="sr-only">أداء كل عنصر خلال الفترة المحددة</p>
                <div className="mt-4 min-w-0 overflow-x-auto">
                <DataTable
                  rows={report.rows}
                  columns={performanceColumns}
                  rowKey={(row) => row.id}
                  caption="أداء كل عنصر خلال الفترة المحددة"
                />
                </div>
              </>
            )}
          </article>

          <p className="rounded-xl bg-stone-50 p-4 text-xs leading-6 text-slate-600">
            نسبة الإشغال = أيام الحجز الفعلية داخل الفترة ÷ الأيام المتاحة داخل الفترة.
            صافي العائد = الإيراد المحقق ناقص تكاليف الصيانة والتنظيف والتلف المرتبطة بالعنصر؛ الخصومات مستبعدة من الإيراد أصلاً لأنها لم تُحصّل.
            العنصر الراكد = مضى على آخر استخدام له {filters.idleThresholdDays} يوماً أو أكثر.
            الحجوزات الملغاة لا تُحتسب إيراداً ولا إشغالاً، والحجز غير المدفوع لا يُحتسب دخلاً.
          </p>
        </>
      )}

      <InventoryPerformanceDetailPanel detail={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
