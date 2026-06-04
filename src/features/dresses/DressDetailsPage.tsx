import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getExpenses } from '../expenses/expense.service';
import { getReservations, getReservationsFromLocalDb } from '../reservations/reservation.service';
import type { Reservation } from '../reservations/reservation.types';
import { getServiceTasks, getServiceTasksFromLocalDb } from '../service-tasks/serviceTask.service';
import type { ServiceTask } from '../service-tasks/serviceTask.types';
import { createCode128DataUrl } from './barcode';
import { getDresses, getDressesFromLocalDb } from './dress.service';
import type { Dress } from './dress.types';
import { printDressLabel } from './printDressLabel';
import { getSalesInvoices, getSalesReturns, getSalesInvoicesFromLocalDb, getSalesReturnsFromLocalDb } from './salesLedger.service';
import type { SaleInvoice, SaleReturn } from './salesLedger.types';

const statusLabels: Record<Dress['status'], string> = {
  available: 'متاح', reserved: 'محجوز', rented: 'مؤجر', laundry: 'في المغسلة', maintenance: 'تحت التعديل', damaged: 'تالف', sold: 'مباع', inactive: 'غير نشط',
};

export function DressDetailsPage() {
  const { code = '' } = useParams();
  const [dresses, setDresses] = useState<Dress[]>(getDresses());
  const [reservations, setReservations] = useState<Reservation[]>(getReservations());
  const [invoices, setInvoices] = useState<SaleInvoice[]>(getSalesInvoices());
  const [returns, setReturns] = useState<SaleReturn[]>(getSalesReturns());
  const [tasks, setTasks] = useState<ServiceTask[]>(getServiceTasks());

  useEffect(() => {
    void (async () => {
      const [localDresses, localReservations, localInvoices, localReturns, localTasks] = await Promise.all([
        getDressesFromLocalDb(), getReservationsFromLocalDb(), getSalesInvoicesFromLocalDb(), getSalesReturnsFromLocalDb(), getServiceTasksFromLocalDb(),
      ]);
      if (localDresses) setDresses(localDresses);
      if (localReservations) setReservations(localReservations);
      if (localInvoices) setInvoices(localInvoices);
      if (localReturns) setReturns(localReturns);
      if (localTasks) setTasks(localTasks);
    })();
  }, []);

  const dress = dresses.find((candidate) => candidate.code === code);
  const relatedReservations = useMemo(() => reservations.filter((reservation) => reservation.dressCode === code), [code, reservations]);
  const relatedExpenses = useMemo(() => getExpenses().filter((expense) => expense.relatedDressCode === code), [code]);
  const relatedInvoices = useMemo(() => invoices.filter((invoice) => invoice.items.some((item) => item.dressCode === code)), [code, invoices]);
  const relatedReturns = useMemo(() => returns.filter((record) => record.dressCode === code), [code, returns]);
  const relatedTasks = useMemo(() => tasks.filter((task) => task.dressCode === code), [code, tasks]);

  if (!dress) return <EmptyState title="لم يتم العثور على الفستان" description="الكود المطلوب غير موجود في المخزون الحالي." />;

  const revenue = relatedReservations.reduce((sum, reservation) => sum + reservation.paidAmount, 0) + relatedInvoices.reduce((sum, invoice) => sum + invoice.items.filter((item) => item.dressCode === code).reduce((itemSum, item) => itemSum + item.unitPrice, 0), 0) - relatedReturns.reduce((sum, record) => sum + record.amount, 0);
  const costs = dress.purchasePrice + relatedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const roi = revenue - costs;
  const activeTask = relatedTasks.find((task) => task.status !== 'completed');

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="تفاصيل الفستان" title={`${dress.code} - ${dress.name}`} description="ملف lifecycle للفستان يشمل الأسعار والحجوزات والمبيعات والخدمة." action={<Link to="/dresses" className="rounded-xl border border-[#E8DED2] px-5 py-3 text-sm font-semibold text-[#8B5E3C]">عودة للمخزون</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['SKU', dress.code], ['اللون', dress.color], ['المقاس', dress.size], ['الفئة', dress.category], ['الحالة الحالية', statusLabels[dress.status]], ['متاح للإيجار', dress.isForRent ? 'نعم' : 'لا'], ['متاح للبيع', dress.isForSale ? 'نعم' : 'لا'], ['عدد مرات التأجير', dress.timesRented], ['سعر الشراء', formatMoneyOMR(dress.purchasePrice)], ['سعر الإيجار', formatMoneyOMR(dress.rentalPrice)], ['سعر البيع', formatMoneyOMR(dress.salePrice)], ['التأمين', formatMoneyOMR(dress.depositAmount)],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm"><p className="text-sm text-[#7A7168]">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}
          <div className="rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm md:col-span-2"><p className="text-sm text-[#7A7168]">الوصف والملاحظات</p><p className="mt-1 font-semibold">{dress.description}</p><p className="mt-2 text-sm text-[#7A7168]">{dress.notes ?? 'لا توجد ملاحظات.'}</p></div>
        </div>
        <aside className="rounded-2xl border border-[#E8DED2] bg-white p-5 text-center shadow-sm">
          <img src={createCode128DataUrl(dress.code)} alt={`Barcode ${dress.code}`} className="mx-auto max-w-full" />
          <p className="mt-3 text-sm text-[#7A7168]">Barcode Code 128 يمثّل الكود: <span className="font-bold">{dress.code}</span></p>
          <button type="button" onClick={() => printDressLabel(dress)} className="mt-4 rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white">طباعة Label</button>
        </aside>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="الحجوزات المرتبطة" rows={relatedReservations.map((row) => `${row.reservationNumber} - ${row.customerName} - ${row.pickupDate}/${row.returnDate}`)} />
        <Panel title="المصروفات المرتبطة" rows={relatedExpenses.map((row) => `${row.expenseNumber} - ${row.title} - ${formatMoneyOMR(row.amount)}`)} />
        <Panel title="المبيعات والمرتجعات" rows={[...relatedInvoices.map((row) => `${row.invoiceNumber} - ${formatMoneyOMR(row.subtotal)}`), ...relatedReturns.map((row) => `${row.returnNumber} - مرتجع ${formatMoneyOMR(row.amount)}`)]} />
        <Panel title="الخدمة و ROI" rows={[`حالة الخدمة الحالية: ${activeTask ? `${activeTask.taskNumber} - ${activeTask.status}` : 'لا توجد خدمة نشطة'}`, `الإيراد: ${formatMoneyOMR(revenue)}`, `التكلفة: ${formatMoneyOMR(costs)}`, `ROI تقريبي: ${formatMoneyOMR(roi)}`]} />
      </div>
    </section>
  );
}

function Panel({ title, rows }: Readonly<{ title: string; rows: string[] }>) {
  return <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><h3 className="text-lg font-bold">{title}</h3>{rows.length ? <div className="mt-3 space-y-2">{rows.map((row) => <p key={row} className="rounded-xl bg-[#FAF7F2] p-3 text-sm">{row}</p>)}</div> : <p className="mt-3 text-sm text-[#7A7168]">لا توجد بيانات مرتبطة.</p>}</article>;
}
