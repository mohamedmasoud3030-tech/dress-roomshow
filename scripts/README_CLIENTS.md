# بيع لـ 100 معرض بمشاريع منفصلة — كيف؟

## الفكرة ببساطة
- التطبيق الحالي معرض واحد = مشروع Supabase واحد (id='main')
- لا يمكن وضع 100 معرض في نفس المشروع لأن البيانات ستختلط (P0)
- الحل: كل عميل تعطيه مشروع Supabase خاص + نشر Vercel خاص
- هذا آمن 100% ومعزول

## هل هذا SaaS؟
- لا، هذا Single-Tenant per Client
- كثير أنظمة معارض تبيعه هكذا
- الفرق: تدير 100 مشروع بدل مشروع واحد
- الميزة: عزل كامل، لا تسريب، كل عميل يدفع Supabase الخاص به

## طريقتان للإنشاء

### الطريقة A: تلقائي عبر API (موصى بها عند 100 عميل)
```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxx  # من https://supabase.com/dashboard/account/tokens
export SUPABASE_ORG_ID=xxx            # من org settings
node scripts/create-client-project.mjs alnoor --region eu-central-1
```
ينشئ مشروع جديد وينتظر حتى يصبح ACTIVE_HEALTHY ويطبع الخطوات التالية.

### الطريقة B: يدوي (5 دقائق)
1. Supabase Dashboard -> New Project -> lena-showroom-alnoor
2. SQL Editor -> شغّل كل ملفات supabase/migrations بالترتيب
3. Storage -> أنشئ buckets: catalogue-images (public), condition-photos (private), backups (private)
4. Auth -> Email Provider Enable, Disable Signups OFF مؤقتاً
5. شغّل:
```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx ./scripts/setup-client-migrations.sh alnoor
```
6. Vercel -> New Project -> اربط repo -> ضع env:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
7. افتح https://your-domain.vercel.app/setup وأسس أول مديرة

## بعد التأسيس
- /setup تتوقف عن العمل تلقائياً بعد وجود مديرة فعالة
- المديرة تنشئ حسابات موظفات من /preferences
- المديرة تنزل نسخة احتياطية من /preferences

## التكلفة
- Supabase Free: يكفي لمعرض صغير (500MB DB, 1GB storage)
- Pro: $25/شهر لكل مشروع إذا كبر
- يمكنك تحميل التكلفة على العميل

## أتمتة 100 عميل
- استخدم الطريقة A مع loop:
```bash
for client in alnoor alzahra alamal alrayan; do
  node scripts/create-client-project.mjs $client
done
```
- أو استخدم Supabase Management API + Vercel API لإنشاء النشر تلقائياً

## متى تحتاج Multi-Tenant حقيقي؟
- لو تريد موقع واحد app.lena.com يدخله 100 معرض بنفس الرابط
- هذا يحتاج إضافة tenant_id لكل جدول وتعديل RLS
- مشروع جديد، ليس إصلاح
