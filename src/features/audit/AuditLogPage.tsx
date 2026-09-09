import { useMemo, useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { downloadCsv } from '@platform/download';
import { Button } from '../../components/shared/Button';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/StateViews';
import { FilterBar, SearchFilter, SelectFilter } from '../../components/shared/FilterBar';
import { PageHeader } from '../../components/shared/PageHeader';
import { buildAuditCsv, ledgerFileName } from '../reports/ledgerExports';
import { filterAuditLog, getAuditLog } from './audit.service';
import type { AuditActionType, AuditEntityType, AuditLogEntry, AuditLogFilters } from './audit.types';

const entityLabels: Record<AuditEntityType, string> = {
  customer: 'عميلة',
  dress: 'عنصر مخزون',
  accessory: 'ملحق',
  reservation: 'حجز',
  appointment: 'موعد',
  payment: 'حركة مالية',
  expense: 'مصروف',
  sale: 'بيع',
  'delivery-return': 'تسليم أو استرجاع',
  stocktake: 'جرد المخزون',
  'daily-closing': 'يومية نقدية',
  preferences: 'إعدادات',
  backup: 'نسخة احتياطية',
  database: 'قاعدة البيانات',
  storage: 'تخزين',
};

const actionLabels: Record<AuditActionType, string> = {
  create: 'إضافة',
  update: 'تعديل',
  'status-change': 'تغيير حالة',
  cancel: 'إلغاء',
  deliver: 'تسليم',
  return: 'استرجاع',
  payment: 'تحصيل',
  refund: 'استرجاع مالي',
  sale: 'بيع',
  'close-day': 'إقفال يومية',
  'reopen-day': 'إعادة فتح يومية',
  'import-backup': 'استيراد نسخة',
  'reset-data': 'تصفير البيانات',
  'migrate-images': 'ترحيل الصور',
  archive: 'أرشفة',
  restore: 'إعادة تفعيل',
  delete: 'حذف نهائي',
};

const entityOptions: Array<{ value: AuditEntityType | 'all'; label: string }> = [
  { value: 'all', label: 'كل الأقسام' },
  ...Object.entries(entityLabels).map(([value, label]) => ({ value: value as AuditEntityType, label })),
];
const actionOptions: Array<{ value: AuditActionType | 'all'; label: string }> = [
  { value: 'all', label: 'كل الحركات' },
  ...Object.entries(actionLabels).map(([value, label]) => ({ value: value as AuditActionType, label })),
];

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('ar-OM');
}

const auditColumns = [
  {
    key: 'summary',
    header: 'الحركة',
    priority: 'primary' as const,
    render: (entry: AuditLogEntry) => <span className="font-bold text-slate-950">{entry.summary}</span>,
  },
  {
    key: 'entity',
    header: 'القسم',
    priority: 'secondary' as const,
    render: (entry: AuditLogEntry) => entityLabels[entry.entityType],
  },
  {
    key: 'action',
    header: 'نوع الحركة',
    priority: 'secondary' as const,
    render: (entry: AuditLogEntry) => <span className="font-semibold">{actionLabels[entry.action]}</span>,
  },
  {
    key: 'operator',
    header: 'بواسطة',
    priority: 'secondary' as const,
    render: (entry: AuditLogEntry) => entry.performedBy ?? 'غير مسجّل',
  },
  {
    key: 'timestamp',
    header: 'التاريخ والوقت',
    priority: 'secondary' as const,
    render: (entry: AuditLogEntry) => <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>,
  },
  {
    key: 'entity-id',
    header: 'المعرف',
    priority: 'optional' as const,
    render: (entry: AuditLogEntry) => <span dir="ltr">{entry.entityId}</span>,
  },
];

export function AuditLogPage() {
  const entries = useMemo(() => getAuditLog(), []);
  const [filters, setFilters] = useState<AuditLogFilters>({ search: '', entityType: 'all', action: 'all' });
  const filteredEntries = useMemo(() => filterAuditLog(entries, filters), [entries, filters]);
  const hasActiveFilters = filters.search !== '' || filters.entityType !== 'all' || filters.action !== 'all';

  const handleExport = () => {
    downloadCsv(ledgerFileName('سجل-التدقيق'), buildAuditCsv(filteredEntries));
  };

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="الرقابة"
        title="سجل التدقيق"
        actions={(
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Download aria-hidden="true" className="h-5 w-5" />
            تصدير CSV
          </Button>
        )}
      />

      <FilterBar>
        <SearchFilter
          label="البحث في سجل التدقيق"
          value={filters.search}
          onChange={(search) => setFilters((current) => ({ ...current, search }))}
          placeholder="ابحثي في ملخص الحركة أو رقم السجل"
        />
        <SelectFilter
          label="قسم الحركة"
          value={filters.entityType}
          onChange={(entityType) => setFilters((current) => ({ ...current, entityType }))}
          options={entityOptions}
        />
        <SelectFilter
          label="نوع الحركة"
          value={filters.action}
          onChange={(action) => setFilters((current) => ({ ...current, action }))}
          options={actionOptions}
        />
        {hasActiveFilters ? (
          <Button type="button" variant="quiet" size="sm" onClick={() => setFilters({ search: '', entityType: 'all', action: 'all' })} className="justify-self-start text-slate-600 hover:bg-stone-100 xl:justify-self-end">
            مسح الفلاتر
          </Button>
        ) : null}
      </FilterBar>

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" className="h-10 w-10" />}
          title="لا توجد حركات مطابقة"
          description="سيظهر هنا سجل الحركات الجديدة بعد تنفيذ العمليات التشغيلية."
        />
      ) : (
        <DataTable
          rows={filteredEntries}
          columns={auditColumns}
          rowKey={(entry) => entry.id}
          caption="سجل التدقيق"
        />
      )}
    </section>
  );
}
