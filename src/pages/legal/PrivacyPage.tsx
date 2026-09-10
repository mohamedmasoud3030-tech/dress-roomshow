import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#faf8f4] p-6" dir="rtl">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">سياسة الخصوصية</h1>
        <p className="mt-2 text-sm text-slate-500">آخر تحديث: {new Date().toLocaleDateString('ar-OM')}</p>

        <section className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-base font-bold text-slate-900">1. ما البيانات التي نجمعها؟</h2>
          <p>نجمع بيانات المعرض التي تدخلينها: أسماء القطع، العملاء (اسم وهاتف)، الحجوزات، المدفوعات، المصروفات، صور حالة القطع. هذه البيانات تُحفظ في مشروع Supabase الخاص بمعرضك.</p>

          <h2 className="text-base font-bold text-slate-900">2. أين تُحفظ البيانات؟</h2>
          <p>البيانات تُحفظ في قاعدة Supabase (PostgreSQL) وتخزين Supabase Storage للصور والنسخ الاحتياطية. الاستضافة خارجية. كل معرض له مشروع منفصل، لا تُخلط البيانات بين المعارض.</p>

          <h2 className="text-base font-bold text-slate-900">3. الصفحة العامة</h2>
          <p>الصفحة العامة /landing تعرض فقط القطع المتاحة (code, name, صور) ومعلومات المعرض العامة. لا تعرض أسماء العملاء أو أرقامهم أو المدفوعات.</p>

          <h2 className="text-base font-bold text-slate-900">4. الدفع</h2>
          <p>لا يوجد دفع إلكتروني أونلاين داخل التطبيق. الدفع يُسجل يدوياً (نقدي/بطاقة/تحويل) من قبل موظفة المعرض. لا نحفظ بيانات بطاقات.</p>

          <h2 className="text-base font-bold text-slate-900">5. الواتساب</h2>
          <p>التطبيق يبني رابط wa.me لفتح محادثة واتساب مع رسالة مقترحة. الإرسال يدوي من هاتف الموظفة، وليس تلقائي عبر API. لا نرسل رسائل بدون تدخل بشري.</p>

          <h2 className="text-base font-bold text-slate-900">6. النسخ الاحتياطي</h2>
          <p>المديرة مسؤولة عن تنزيل نسخة احتياطية JSON بانتظام من صفحة الإعدادات. النسخة تحتوي كل بيانات المعرض وصور الحالة. احتفظي بها في مكان آمن.</p>

          <h2 className="text-base font-bold text-slate-900">7. حقوقك</h2>
          <p>يمكنك طلب تصدير بياناتك أو حذف حسابك عبر التواصل مع مديرة المعرض. الحذف النهائي يخضع لقيود السجل التجاري (الحجوزات والمدفوعات تُحفظ كسجل تاريخي).</p>

          <h2 className="text-base font-bold text-slate-900">8. التواصل</h2>
          <p>للاستفسار عن الخصوصية، تواصلي عبر صفحة المعرض أو عبر البريد المذكور في صفحة الاتصال.</p>
        </section>

        <div className="mt-8 flex gap-3">
          <Link to="/landing" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">العودة للصفحة العامة</Link>
          <Link to="/terms" className="rounded-xl border px-4 py-2 text-sm font-bold">الشروط والأحكام</Link>
        </div>
      </div>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="min-h-screen bg-[#faf8f4] p-6" dir="rtl">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">الشروط والأحكام</h1>
        <p className="mt-2 text-sm text-slate-500">آخر تحديث: {new Date().toLocaleDateString('ar-OM')}</p>

        <section className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-base font-bold text-slate-900">1. طبيعة الخدمة</h2>
          <p>التطبيق نظام تشغيل داخلي لمعرض واحد لفساتين المناسبات. ليس متجر إلكتروني ولا بوابة دفع ولا خدمة إرسال تلقائي.</p>

          <h2 className="text-base font-bold text-slate-900">2. الترخيص</h2>
          <p>يُباع الترخيص لمعرض واحد على مشروع Supabase خاص به. لا يجوز تشغيل معرضين مختلفين على نفس المشروع لأن البيانات ستختلط.</p>

          <h2 className="text-base font-bold text-slate-900">3. الدفع والمال</h2>
          <p>كل المدفوعات تُسجل يدوياً. التطبيق لا يعالج بطاقات ولا يحول أموال. أنتِ مسؤولة عن مطابقة النقد في إقفال اليومية.</p>

          <h2 className="text-base font-bold text-slate-900">4. الواتساب والتذكيرات</h2>
          <p>التذكيرات تفتح واتساب برابط يدوي. الإرسال مسؤوليتك. لا يوجد إرسال تلقائي في الخلفية.</p>

          <h2 className="text-base font-bold text-slate-900">5. النسخ والاسترجاع</h2>
          <p>يجب تنزيل نسخة احتياطية بعد كل إقفال يومية أو على الأقل أسبوعياً. الاسترجاع يستبدل كل البيانات الحالية.</p>

          <h2 className="text-base font-bold text-slate-900">6. الدعم</h2>
          <p>الدعم يشمل تأسيس أول مديرة، تدريب أولي، ومساعدة 14 يوم. لا يشمل تطوير ميزات جديدة أو تعدد فروع إلا بعقد منفصل.</p>

          <h2 className="text-base font-bold text-slate-900">7. المسؤولية</h2>
          <p>المؤسس غير مسؤول عن فقدان بيانات بسبب عدم تنزيل نسخ أو بسبب مشاركة حسابات. حافظي على كلمات المرور وفعلي النسخ السحابي.</p>
        </section>

        <div className="mt-8 flex gap-3">
          <Link to="/landing" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">العودة للصفحة العامة</Link>
          <Link to="/privacy" className="rounded-xl border px-4 py-2 text-sm font-bold">سياسة الخصوصية</Link>
        </div>
      </div>
    </main>
  );
}
