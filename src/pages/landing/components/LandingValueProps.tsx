import { ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';

const items = [
  { title: 'معاينة أولية أوضح', description: 'عرض العميلة للخيارات الحالية بطريقة منظمة قبل الزيارة الفعلية.', icon: Sparkles, iconClass: 'bg-violet-50 text-violet-700' },
  { title: 'فئات أوسع من الفساتين فقط', description: 'يمكن عرض الإكسسوارات والحقائب والملحقات ضمن نفس واجهة المعرض.', icon: ShoppingBag, iconClass: 'bg-emerald-50 text-emerald-700' },
  { title: 'مناسبة لإعادة البيع', description: 'بيانات المعرض قابلة للتبديل لكل عميل عبر ملف محتوى مركزي بدل النصوص الثابتة.', icon: ShieldCheck, iconClass: 'bg-amber-50 text-amber-700' },
];

export function LandingValueProps() {
  return (
    <section className="mt-10 grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-3 ${item.iconClass}`}><Icon className="h-5 w-5" /></div>
              <div><h3 className="font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p></div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
