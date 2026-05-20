import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';

const todayCards = [
  { label: 'حجوزات اليوم', value: 6 },
  { label: 'تسليم اليوم', value: 4 },
  { label: 'استرجاع اليوم', value: 3 },
  { label: 'مدفوعات اليوم', value: '245 ر.ع' },
];

export function DashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="لوحة التشغيل" title="لوحة العمليات اليومية" description="نظرة أنيقة على الحجوزات، التسليمات، الاسترجاعات، والمدفوعات لضمان تشغيل منظم." />
      <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">مرحباً بك في صالة التشغيل الفاخرة</h2>
        <p className="mt-2 text-[#7A7168]">تابعي أعمال اليوم بسرعة: ما يحتاج متابعة فورية، وما تم إنجازه، وما ينتظر التأكيد.</p>
      </article>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{todayCards.map((c)=><SummaryCard key={c.label} label={c.label} value={c.value} />)}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">إجراءات سريعة</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {['حجز جديد','إضافة فستان','إضافة عميلة','تسجيل دفعة'].map((label)=><button key={label} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-4 py-3 text-sm font-semibold text-[#8B5E3C]">{label}</button>)}
          </div>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">تنبيهات تشغيلية</h3>
          <ul className="mt-4 space-y-3 text-sm text-[#7A7168]">
            <li className="rounded-xl bg-[#FAF7F2] p-3">حجوزات تحتاج تأكيد: <span className="font-bold text-[#1F1B18]">2</span></li>
            <li className="rounded-xl bg-[#FAF7F2] p-3">فساتين في المغسلة: <span className="font-bold text-[#1F1B18]">5</span></li>
            <li className="rounded-xl bg-[#FFF3DF] p-3 text-[#D69E2E]">استرجاعات متأخرة: <span className="font-bold">1</span></li>
          </ul>
        </article>
      </div>
    </section>
  );
}
