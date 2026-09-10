# FIXES_APPLIED.md — ما تم إصلاحه فوراً بعد التدقيق

## تاريخ: 2026-09-11
## الفرع: main

### 1. حل P1-1: تأسيس أول مديرة بدون مهندس
- **المشكلة**: إنشاء أول حساب مديرة كان يتطلب تشغيل دالة private.bootstrap_lena_owner بصلاحية service_role في SQL. لا يوجد تسجيل ذاتي.
- **الحل**:
  - إضافة migration 0033_allow_first_owner_self_bootstrap.sql
    - دالة public.claim_first_owner() SECURITY DEFINER تسمح للمستخدم المسجل بترقية نفسه لمديرة فقط إذا لا يوجد مديرة فعالة
    - دالة public.is_first_owner_setup_needed() ترجع true إذا لا يوجد admin فعال (مسموحة لـ anon و authenticated)
    - مع حماية advisory lock لمنع سباق
  - إضافة src/pages/setup/SetupPage.tsx
    - صفحة عامة /setup تتحقق هل التأسيس مطلوب
    - تدعم وضعين: إنشاء حساب جديد (signUp) أو تسجيل دخول ثم تولي الإدارة
    - بعد النجاح تتحول للوحة التحكم
    - إذا يوجد مديرة بالفعل، تعرض "المعرض مجهز بالفعل"
  - إضافة دوال في auth.service.ts: signUp, claimFirstOwner, isFirstOwnerSetupNeeded
  - إضافة routes /setup, /privacy, /terms في AppRoutes.tsx و routePages.ts
  - إضافة رابط "تأسيس المعرض لأول مرة" في LoginPage
- **التحقق**: tsc -b نجح، vite build نجح، اختبارات auth مرت

### 2. حل P0 تسريب SaaS متعدد
- **المشكلة**: كل المعارض تشترك في showroom_state id='main' واحد
- **الحل**:
  - توثيق في docs/CLIENT_SETUP_GUIDE.md: كل معرض = مشروع Supabase منفصل
  - شرح خطوات إنشاء مشروع، تشغيل migrations 0001-0033، إنشاء buckets، إعداد Auth، نشر Vercel
  - لا كود يخلط البيانات، لكن التوثيق يمنع البيع الخاطئ
- **الحل طويل المدى**: إذا أردت SaaS حقيقي متعدد المستأجرين، يجب إعادة تصميم العزل (مشروع منفصل)

### 3. حل نقص الخصوصية والشروط
- **المشكلة**: لا يوجد صفحة privacy/terms
- **الحل**:
  - إضافة src/pages/legal/PrivacyPage.tsx و TermsPage
    - Privacy: توضح أين تُحفظ البيانات، الصفحة العامة تعرض المتاح فقط، الدفع يدوي، واتساب يدوي، النسخ مسؤولية المديرة
    - Terms: توضح الترخيص لمعرض واحد، الدفع يدوي، واتساب يدوي، النسخ والاسترجاع، الدعم
  - إضافة routes /privacy و /terms
  - إضافة روابط في LandingFooter
- **التحقق**: build نجح، الصفحات عامة بدون auth

### 4. توضيح الدفع اليدوي
- **المشكلة**: اسم "المدفوعات" قد يوحي بدفع إلكتروني
- **الحل**:
  - تغيير navigation label من "المدفوعات" إلى "دفتر التحصيل اليدوي" في navigation.ts
  - تغيير DocumentTitle
  - إضافة تنبيه أصفر في PaymentsPage: "دفتر يدوي - لا يوجد دفع إلكتروني أونلاين"
  - تحديث PageHeader eyebrow

### 5. توضيح الواتساب اليدوي
- **المشكلة**: قد يُفهم أن التذكيرات ترسل تلقائياً
- **الحل**:
  - في RemindersPage: تغيير eyebrow إلى "يدوي - يفتح واتساب فقط" وإضافة تنبيه أصفر يوضح wa.me يدوي
  - في LandingContact: إضافة جملة "الزر يفتح واتساب برابط يدوي فقط، الإرسال يتم من هاتفك وليس تلقائياً"
  - في PaymentsPage و RemindersPage تم التوضيح

### 6. إزالة .env.production من المستودع
- **المشكلة**: ملف .env.production كان مُتتبع في Git مع !.env.production في .gitignore مما يبقيه منشور
- **الحل**:
  - تعديل .gitignore لإزالة سطر !.env.production
  - git rm --cached .env.production لإزالته من التتبع مع إبقائه محلياً للبناء
  - الآن المفتاح publishable لن يُنشر في المستودع مرة أخرى
  - يجب استخدام متغيرات بيئة Vercel في الإنتاج

### 7. تحسينات إضافية
- تحديث CLIENT_SETUP_GUIDE.md يشرح كل خطوات التركيب لعميل جديد
- تحديث LoginPage ليشمل رابط تأسيس

### ما لم نفعله (يتطلب قرار تجاري)
- لم نضف بوابة دفع إلكتروني (Stripe) لأنها ميزة جديدة وليست إصلاح حاجب
- لم نضف واتساب Business API تلقائي لأنه ميزة جديدة
- لم نضف تعدد فروع/معارض في نفس المشروع لأنه مشروع إعادة تصميم

### التحقق النهائي
- tsc -b: نجح (بعد إصلاح TS2322 في SetupPage)
- vite build: نجح، 149 ملف precache
- npm run test:auth: 10/10 pass
- npm run test:architecture: 7/7 pass
- npm run test:finance: 9/9 pass
- npm run test:reservation-conflicts: 15/15 pass

### الحكم الجديد بعد الإصلاحات
- قبل: SALEABLE WITH CONDITIONS (يحتاج مهندس لتأسيس أول مديرة، لا خصوصية)
- بعد: READY TO SELL لمعرض واحد مع تأسيس ذاتي، مع شروط بسيطة (مشروع Supabase منفصل، توضيح دفع يدوي وواتساب يدوي)

الملفات المضافة/المعدلة:
- supabase/migrations/0033_allow_first_owner_self_bootstrap.sql (جديد)
- src/pages/setup/SetupPage.tsx (جديد)
- src/pages/legal/PrivacyPage.tsx (جديد، يحتوي PrivacyPage و TermsPage)
- src/app/router/AppRoutes.tsx (تعديل)
- src/app/router/routePages.ts (تعديل)
- src/app/router/DocumentTitle.tsx (تعديل)
- src/app/shell/navigation.ts (تعديل)
- src/features/auth/auth.service.ts (تعديل: signUp, claimFirstOwner, isFirstOwnerSetupNeeded)
- src/features/auth/LoginPage.tsx (تعديل: رابط تأسيس)
- src/features/payments/PaymentsPage.tsx (تعديل: توضيح يدوي)
- src/features/reminders/RemindersPage.tsx (تعديل: توضيح يدوي)
- src/pages/landing/components/LandingContact.tsx (تعديل)
- src/pages/landing/components/LandingFooter.tsx (تعديل)
- .gitignore (تعديل)
- docs/CLIENT_SETUP_GUIDE.md (جديد)
- FIXES_APPLIED.md (هذا الملف)
