const metrics = [
  { label: 'فساتين', value: '0', hint: 'إجمالي المخزون' },
  { label: 'عملاء', value: '0', hint: 'إجمالي العملاء' },
  { label: 'حجوزات اليوم', value: '0', hint: 'تسليم واسترجاع' },
  { label: 'إيراد اليوم', value: '0 ر.ع', hint: 'مدفوعات مسجلة' },
];

export function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <p className="mt-2 text-slate-600">نقطة البداية لمتابعة الفساتين، الحجوزات، المدفوعات، والمصروفات.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-500">{metric.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">أعمال اليوم</h2>
          <p className="mt-2 text-sm text-slate-500">سيتم عرض حجوزات اليوم، التسليمات، والاسترجاعات هنا.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">تنبيهات مهمة</h2>
          <p className="mt-2 text-sm text-slate-500">سيتم عرض الحجوزات المتأخرة والفساتين التي تحتاج متابعة هنا.</p>
        </article>
      </div>
    </section>
  );
}
