# دليل تركيب عميل جديد - معرض واحد = مشروع Supabase واحد

هذا الدليل يحل مشكلة P0 تسريب البيانات عند البيع كـ SaaS مشترك.

## المبدأ
كل معرض له مشروع Supabase منفصل:
- URL خاص
- publishable key خاص
- قاعدة بيانات خاصة مع showroom_state id='main' واحد

لا تضع معرضين على نفس المشروع.

## خطوات التركيب (10 دقائق)

### 1. إنشاء مشروع Supabase جديد
- ادخل supabase.com → New Project
- اسم المشروع: lena-showroom-<اسم-المعرض>
- Region قريب من عمان (مثلاً eu-central-1 أو ap-southeast-1)
- احفظ DB password

### 2. تشغيل migrations
- افتح SQL Editor في Supabase
- شغّل كل ملفات supabase/migrations بالترتيب من 0001 إلى 0033
- أو استخدم supabase CLI: `supabase db push`

### 3. إنشاء buckets
تأكد من وجود buckets:
- catalogue-images (public)
- condition-photos (private)
- backups (private)

إذا لم توجد، أنشئها من Storage في لوحة Supabase.

### 4. إعداد Auth
- في Authentication → Providers → Email → Enable
- في Authentication → Settings → Disable Signups = OFF مؤقتاً لأول تأسيس، ثم يمكنك تفعيل ON بعد تأسيس أول مديرة
- Site URL = رابط Vercel الخاص بالمعرض

### 5. نشر الواجهة على Vercel
- اربط GitHub repo
- أضف متغيرات البيئة:
  - VITE_SUPABASE_URL = https://<project>.supabase.co
  - VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_...
- لا تضع service_role أبداً في Vercel env للواجهة الأمامية

### 6. تأسيس أول مديرة (بدون مهندس بعد الآن)
- افتح https://<domain>/setup
- إذا لا يوجد مديرة فعالة، ستظهر صفحة التأسيس
- اختر "حساب جديد" → اكتب الاسم الكامل والبريد وكلمة المرور → إنشاء
- سيتم تلقائياً استدعاء claim_first_owner() وترقيتك لمديرة
- بعدها الصفحة /setup ستتوقف عن العمل وتظهر "المعرض مجهز بالفعل"

### 7. إنشاء حسابات موظفات
- سجلي دخول كمديرة → /preferences → حسابات الموظفات
- اطلبي من الموظفة إنشاء حساب عبر /login → (إذا Signups مقفل، أنشئيه من لوحة Supabase Auth → Users → Add User)
- ثم فعلي حسابها من /preferences

### 8. نسخ احتياطي أولي
- /preferences → تصدير نسخة JSON → احتفظي بها

## ماذا لو أراد العميل نقل بيانات قديمة؟
- استخدمي /preferences → استيراد نسخة

## ملاحظات أمان
- لا تشاركي service_role key
- لا تضعي .env.production في Git
- كل معرض = مشروع منفصل = عزل كامل

## التحقق
- افتحي /landing → يجب أن تعرض القطع المتاحة فقط بدون بيانات عملاء
- افتحي /privacy و /terms → يجب أن تظهر صفحات الخصوصية
