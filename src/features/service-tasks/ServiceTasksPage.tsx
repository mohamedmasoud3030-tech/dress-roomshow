import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, Wrench } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getDresses } from '../dresses/dress.service';
import { createServiceTask, filterServiceTasks, getServiceTasks, updateServiceTask } from './serviceTask.service';
import type { ServiceTask, ServiceTaskFilters, ServiceTaskStatus, ServiceTaskType } from './serviceTask.types';

const typeLabels: Record<ServiceTaskType, string> = { laundry: 'غسيل', tailoring: 'تعديل', maintenance: 'صيانة', inspection: 'فحص' };
const statusLabels: Record<ServiceTaskStatus, string> = { pending: 'بانتظار الإرسال', in_progress: 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغاة' };
const activeStatuses = new Set<ServiceTaskStatus>(['pending', 'in_progress']);
const field = 'min-h-11 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

function TaskCard({ task, onComplete }: { task: ServiceTask; onComplete: (task: ServiceTask) => void }) {
  const overdue = activeStatuses.has(task.status) && task.expectedCompletionDate < getTodayISO();
  return <article className={`rounded-2xl border bg-white p-5 shadow-sm ${overdue ? 'border-rose-200 ring-2 ring-rose-100' : 'border-slate-200'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-400" dir="ltr">{task.taskNumber}</p><h2 className="mt-1 text-lg font-bold">{typeLabels[task.type]} · {task.dressCode}</h2><p className="mt-1 text-sm text-slate-500">{task.dressName}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${overdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{overdue ? 'متأخرة' : statusLabels[task.status]}</span></div>
    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-slate-400">الإرسال</p><b>{task.sentDate}</b></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-slate-400">المتوقع</p><b>{task.expectedCompletionDate}</b></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-slate-400">التكلفة</p><b>{formatMoneyOMR(task.cost)}</b></div></div>
    {task.notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{task.notes}</p>}
    {activeStatuses.has(task.status) && <button type="button" onClick={() => onComplete(task)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />إكمال المهمة</button>}
  </article>;
}

export function ServiceTasksPage() {
  const [tasks, setTasks] = useState<ServiceTask[]>(() => getServiceTasks());
  const [filters, setFilters] = useState<ServiceTaskFilters>({ search: '', type: 'all', status: 'all', due: 'all' });
  const [form, setForm] = useState({ dressCode: '', type: 'laundry' as ServiceTaskType, sentDate: getTodayISO(), expectedCompletionDate: getTodayISO(), cost: '0', paymentMethod: 'cash' as const, notes: '' });
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const dresses = useMemo(() => getDresses().filter((dress) => dress.status !== 'sold' && dress.status !== 'inactive'), []);
  const filteredTasks = useMemo(() => filterServiceTasks(tasks, filters), [tasks, filters]);
  const overdue = tasks.filter((task) => activeStatuses.has(task.status) && task.expectedCompletionDate < getTodayISO()).length;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const task = createServiceTask({ ...form, cost: Number(form.cost) });
      setTasks([task, ...getServiceTasks().filter((item) => item.id !== task.id)]);
      setFeedback({ tone: 'success', message: `تم إنشاء مهمة الخدمة ${task.taskNumber}.` });
      setForm((current) => ({ ...current, dressCode: '', cost: '0', notes: '' }));
    } catch (error: unknown) { setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر إنشاء مهمة الخدمة.' }); }
  }

  function complete(task: ServiceTask) {
    try {
      updateServiceTask(task.id, { status: 'completed', actualCompletionDate: getTodayISO() });
      setTasks(getServiceTasks());
      setFeedback({ tone: 'success', message: `تم إكمال مهمة الخدمة ${task.taskNumber}.` });
    } catch (error: unknown) { setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر إكمال مهمة الخدمة.' }); }
  }

  return <section className="space-y-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><PageHeader eyebrow="الخدمات" title="طابور خدمة الفساتين" description="متابعة الغسيل والتعديل والصيانة والفحص مع ربط التكلفة بالمصروفات وربحية الفستان." /></div>
    {feedback && <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{feedback.message}</div>}
    <div className="grid gap-4 md:grid-cols-3"><SummaryCard label="مهام نشطة" value={tasks.filter((task) => activeStatuses.has(task.status)).length} /><SummaryCard label="مهام متأخرة" value={overdue} tone={overdue ? 'danger' : 'default'} /><SummaryCard label="تكلفة مفتوحة" value={formatMoneyOMR(tasks.filter((task) => activeStatuses.has(task.status)).reduce((sum, task) => sum + task.cost, 0))} /></div>
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1.2fr_140px_150px_150px_120px_140px]"><select required value={form.dressCode} onChange={(event) => setForm((current) => ({ ...current, dressCode: event.target.value }))} className={field}><option value="">اختاري الفستان</option>{dresses.map((dress) => <option key={dress.id} value={dress.code}>{dress.code} — {dress.name}</option>)}</select><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ServiceTaskType }))} className={field}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="date" max={getTodayISO()} value={form.sentDate} onChange={(event) => setForm((current) => ({ ...current, sentDate: event.target.value }))} className={field} /><input type="date" value={form.expectedCompletionDate} onChange={(event) => setForm((current) => ({ ...current, expectedCompletionDate: event.target.value }))} className={field} /><input type="number" min="0" step="0.001" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} className={field} /><button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />إضافة</button></div><textarea placeholder="ملاحظات الخدمة" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={`${field} mt-3 min-h-20 py-3`} /></form>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_150px]"><label className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="بحث بالكود أو رقم المهمة" className={`${field} pr-11`} /></label><select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as ServiceTaskFilters['type'] }))} className={field}><option value="all">كل الأنواع</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ServiceTaskFilters['status'] }))} className={field}><option value="all">كل الحالات</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={filters.due} onChange={(event) => setFilters((current) => ({ ...current, due: event.target.value as ServiceTaskFilters['due'] }))} className={field}><option value="all">كل المواعيد</option><option value="overdue">المتأخرة</option><option value="today">اليوم</option><option value="upcoming">القادمة</option></select></div></div>
    {filteredTasks.length ? <div className="grid gap-4 xl:grid-cols-2">{filteredTasks.map((task) => <TaskCard key={task.id} task={task} onComplete={complete} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Wrench className="mx-auto h-10 w-10 text-amber-700" /><p className="mt-4 text-lg font-bold">لا توجد مهام خدمة مطابقة</p><p className="mt-2 text-sm text-slate-500">أضيفي مهمة خدمة أو غيّري الفلاتر الحالية.</p></div>}
  </section>;
}
