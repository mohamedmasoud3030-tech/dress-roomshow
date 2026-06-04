import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';
import { getDresses, getDressesFromLocalDb } from '../dresses/dress.service';
import type { Dress } from '../dresses/dress.types';
import { createServiceTask, filterServiceTasks, getServiceTasks, getServiceTasksFromLocalDb, updateServiceTaskStatus } from './serviceTask.service';
import type { ServiceTask, ServiceTaskFilters, ServiceTaskType } from './serviceTask.types';

const typeLabels: Record<ServiceTaskType, string> = { laundry: 'مغسلة', tailoring: 'تعديل', maintenance: 'صيانة' };
const statusLabels: Record<ServiceTask['status'], string> = { open: 'مفتوح', in_progress: 'قيد التنفيذ', completed: 'مكتمل' };

export function ServiceTasksPage() {
  const [tasks, setTasks] = useState<ServiceTask[]>(getServiceTasks());
  const [dresses, setDresses] = useState<Dress[]>(getDresses());
  const [filters, setFilters] = useState<ServiceTaskFilters>({ type: 'all', status: 'all', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({ dressCode: '', type: 'laundry' as ServiceTaskType, dueDate: '', notes: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const [localTasks, localDresses] = await Promise.all([getServiceTasksFromLocalDb(), getDressesFromLocalDb()]);
      if (localTasks) setTasks(localTasks);
      if (localDresses) setDresses(localDresses);
    })();
  }, []);

  const filteredTasks = useMemo(() => filterServiceTasks(tasks, filters), [tasks, filters]);
  const activeDresses = dresses.filter((dress) => dress.status !== 'sold' && dress.status !== 'inactive');

  const submitTask = async () => {
    const dress = dresses.find((candidate) => candidate.code === draft.dressCode);
    if (!dress) { setError('اختاري فستاناً صالحاً للخدمة.'); return; }
    try {
      setError('');
      const task = await createServiceTask({ dress, type: draft.type, dueDate: draft.dueDate, notes: draft.notes, existingTasks: tasks });
      setTasks((current) => [task, ...current]);
      setModalOpen(false);
      setDraft({ dressCode: '', type: 'laundry', dueDate: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء Task الخدمة.');
    }
  };

  const changeStatus = async (task: ServiceTask, status: ServiceTask['status']) => {
    try {
      const updated = await updateServiceTaskStatus(task, status);
      setTasks((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث الحالة.');
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الخدمة" title="Queue المغسلة والتعديل والصيانة" description="متابعة Tasks الخدمة المرتبطة بالفساتين ومنع التكرار النشط." action={<button type="button" onClick={() => setModalOpen(true)} className="rounded-xl bg-[#8B5E3C] px-5 py-3 text-sm font-semibold text-white">Task جديد</button>} />
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      <div className="grid gap-3 rounded-2xl border border-[#E8DED2] bg-white p-4 md:grid-cols-3">
        <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="بحث بالكود أو رقم Task" className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
        <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as ServiceTaskFilters['type'] }))} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm"><option value="all">كل الأنواع</option><option value="laundry">مغسلة</option><option value="tailoring">تعديل</option><option value="maintenance">صيانة</option></select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ServiceTaskFilters['status'] }))} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm"><option value="all">كل الحالات</option><option value="open">مفتوح</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredTasks.map((task) => <article key={task.id} className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-400">{task.taskNumber}</p><h3 className="text-lg font-bold">{task.dressCode} - {task.dressName}</h3><p className="text-sm text-[#7A7168]">{typeLabels[task.type]} - {statusLabels[task.status]}{task.dueDate ? ` - يستحق ${task.dueDate}` : ''}</p><p className="mt-2 text-sm">{task.notes}</p><div className="mt-4 flex gap-2"><button disabled={task.status !== 'open'} onClick={() => void changeStatus(task, 'in_progress')} className="rounded-xl bg-[#FAF7F2] px-3 py-2 text-sm font-semibold disabled:text-slate-400">بدء التنفيذ</button><button disabled={task.status === 'completed'} onClick={() => void changeStatus(task, 'completed')} className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300">إكمال</button></div></article>)}
      </div>
      <SimpleModal open={modalOpen} onClose={() => setModalOpen(false)} title="Task خدمة جديد" footer={<button onClick={submitTask} className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white">حفظ</button>}>
        <select value={draft.dressCode} onChange={(event) => setDraft((current) => ({ ...current, dressCode: event.target.value }))} className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm"><option value="">اختيار الفستان</option>{activeDresses.map((dress) => <option key={dress.code} value={dress.code}>{dress.code} - {dress.name}</option>)}</select>
        <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as ServiceTaskType }))} className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm"><option value="laundry">مغسلة</option><option value="tailoring">تعديل</option><option value="maintenance">صيانة</option></select>
        <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
        <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" className="h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
      </SimpleModal>
    </section>
  );
}
