import { getCustomers } from './customer.service';

export function CustomersPage() {
  const customers = getCustomers();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">إدارة العملاء</h1>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">الاسم</th><th className="px-4 py-3">الهاتف</th><th className="px-4 py-3">المدينة</th><th className="px-4 py-3">الحجوزات النشطة</th></tr></thead>
          <tbody>{customers.map((customer)=><tr key={customer.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{customer.fullName}</td><td className="px-4 py-3">{customer.phone}</td><td className="px-4 py-3">{customer.city}</td><td className="px-4 py-3">{customer.activeReservations}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
