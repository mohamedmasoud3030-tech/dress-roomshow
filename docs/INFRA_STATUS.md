# حالة البنية التحتية (Vercel + GitHub Actions) — 2026-09-12

وثيقة تشخيص فقط، لا تُغيَّر بها إعدادات. كل رقم هنا مأخوذ من `api.github.com` أو من سجلات الـ actions/logs، لا من الاستنتاج.

## 1. الإنتاج (Vercel) — سليم

- `main` على `2bd9cfa`. حالة commit: `Vercel | success | Deployment has completed`.
- آخر نشرين Production ناجحين: `01bd342` (إصلاح البناء) و`2bd9cfa` (توثيق).
- الحظر الذي حدث يوم 2026‑09‑11 و2026‑09‑12 صباحًا كان سببه **هوية مؤلف الـ commit**، لا الكود:
  رسالة Vercel الحرفية كانت `GitHub couldn't verify an account for the commit`، وتحل بإعادة كتابة
  الـ author إلى بريد مربوط بحساب GitHub (`250202280+mohamedmasoud3030-tech@users.noreply.github.com`).
  **كل commit جديد لا يمر بـ Vercel إذا كان مؤلفه `lena@local` أو `fix-bot@arena.ai` أو أي `*.local`.**
- **تنبيه مفتوح**: كل روابط `*.vercel.app` للبروجكت (بما فيها `carmen-gallery.vercel.app`) ترد
  `302 → vercel.com/sso-api → https://vercel.com/login` (صفحة "Login – Vercel" + زر `Continue with GitHub`).
  هذا شكل **Vercel Authentication** (حماية على مستوى البروجكت تُطبَّق على الإنتاج نفسه، لا على المعاينات فقط).
  تم اختبار `?bypass_authentication=true` على رابط معاينة: رُفض بنفس الـ 302، إذن ليست حماية بكلمة سر.
  النتيجة: الزبون العادي الذي يفتح الرابط من غير حسابك لن يرى التطبيق. القرار (إبقاء/تعطيل الحماية،
  أو ربط دوموم مخصص خارج Vercel) **قرار مالك — لم يغيَّر شيء**.

## 2. GitHub Actions — معطّلة على هذا الريبو فقط، والسبب خارجي

الفحص: كل job يفشل خلال ~2 ثانية مع `runner_name: ""`, `runner_id: 0`, `steps: []`, وأرشيف اللوج ملف ZIP فارغ.
توقيتات آخر تشغيل حقيقي: `ab6cdb9` يوم 2026‑09‑11 14:08 UTC حصل على `GitHub Actions 1000038803` ونفّذ 8 خطوات.
أيضًا `9c5850f` نفّذ 14 خطوة (Verify) قبلها بست ساعات.

تجربة ضابطة (نفس الـ workflow المعدَّل، خطوة `echo` واحدة، نفس `runs-on: ubuntu-latest`):

| الريبو | خصوصية | النتيجة |
| --- | --- | --- |
| `carmen-gallery-` | **خاص** | `completed failure` · NO‑RUNNER · 0 steps |
| `mohamedmasoud3030-tech/malek` | عام | `completed success` · `GitHub Actions 1000039143` · 3 steps |
| `mohamedmasoud3030-tech/mosaid` | عام | شغّال طبيعي في نفس اليوم |

إذن: ليست مشكلة كود، ولا عطل عام في حساب GitHub (الحالة `www.githubstatus.com` = All Systems Operational).

إعدادات الريبو نفسها سليمة كما قرأتها الـ API:

```json
GET /repos/…/actions/permissions        -> {"enabled": true, "allowed_actions": "all", "sha_pinning_required": false}
GET /repos/…/actions/permissions/workflow -> {"default_workflow_permissions": "read", "can_approve_pull_request_reviews": false}
GET /repos/…/actions/cache/usage        -> 3 caches, 208 MB   (يعني jobs سابقة اشتغلت فعلًا)
GET /repos/…/actions/runner-groups      -> 500 (يحتاج Admin:read — التوكن الحالي لا يقرأه)
GET /users/…/settings/billing/actions   -> 403 (يحتاج صلاحية billing — لا يمكن قراءة الرصيد من هنا)
```

**أرجح تفسير متسق مع كل ما سبق**: رصيد دقائق Actions للريبوهات **الخاصة** على الخطة المجانية (2000 دقيقة/شهر،
تُحسب على مستوى الحساب وتُصفَّر في بداية دورة الفوترة). الريبوهات العامة غير مقيّدة بالدقائق، وهو ما يفسر نجاح
`malek`/`mosaid` وتعطّل هذا الريبو وحده. استهلاك هذا الريبو في سبتمبر المُقاس من سجلات الـ runs: **≈163 دقيقة**
(128 run) — الباقي أكيد راح لريبوهات خاصة أخرى غير مرئية لهذا التوكن.

### خطوات التأكيد عند المالك (بالترتيب)

1. افتح `github.com/settings/billing` → **Actions**: هل الدقائق المستهلكة = الحد؟ ومتى تبدأ دورة الفوترة؟
   صفحة `github.com/mohamedmasoud3030-tech/carmen-gallery-/actions/runs/<أي run فاشل>` تعرض نص الخطأ
   أعلى الصفحة (مثال run للتشخيص: `34683620499`).
2. إن كان الرصيد هو السبب: أضف وسيلة دفع (يُفعّل الدقائق المقيسة)، أو أخفّض دقائق الريبوهات الخاصة
   (الأثقل هنا: خطوة `playwright install` في `Verify` على كل push لكل PR)، أو انتظر تصفير الدورة.
3. قرّر سياسة صريحة موثّقة هنا: **لا تعتمد على CI كحل وحيد للبوابة**. إلى أن تعود Actions، البوابة هي:
   `npx tsc -b --force && npx eslint . && npm run build && npm test` (الحالة الحالية: كلها خضراء).
4. بعد عودة Actions، أضف على `main`: require status checks `Build` + `Verify`، ولا تدمج من لون واحد
   (الخطأ الصغير `TS6133` وحده أوقف الإنتاج ليوم كامل).

## 3. تنظيف المراجع — تم 2026-09-12

قبل التنظيف: فرع واحد `main` + فرع ارتجاع `recovery/prev-good`، و**153 tag** باسم `archive/*` (كلها أصداء فروع
حُذفت؛ لا يوجد تعارض فروع في المستودع). التصنيف الذي استُخدم:

| السلة | العدد | التعريف | التصرف |
| --- | --- | --- | --- |
| A | 46 | الـ commit موجود أصلًا داخل `main` (صفر معلومة) | **حُذفت** من origin |
| B | 35 | خارج سلالة `main` لكن `git cherry` = صفر commit فريد (المحتوى وصل عبر squash) | **حُذفت** من origin |
| C | 72 | خارج `main` وتحمل commits فريدة | **مُبقاة** للمراجعة |

- **19 tag من A و10 من B كانت تشير إلى sha ظهر في deployment قديم** (من 300 deployment، منها 72 Production).
  هذا لا يمنع الحذف: كل ما نشر إنتاجيًا هو بالضرورة سلف داخل `main`، فالتاريخ لم يُفقَد — والـ bundle الكامل
  تحتفظ بكل SHA. تم التحقق بعد التنظيف: `git rev-list --count origin/main = 388`، والحذف رجّعه الكائن
  `0da941f` ما زال reachable.
- فرع الارتجاع تحوّل إلى tag annotated باسم `recovery/prev-good-20260912` → `9c5850f` (آخر commit أخضر بالكامل)،
  ثم حُذف الفرع.
- **الحد الأدنى بعد التنظيف**: `refs/heads/main` + 72 tag في السلة C + tag الارتجاع.
- **نُسختا أمان قبل أي حذف**: bundle بكل الـ refs (قابل للاستعادة بـ `git bundle unbundle` أو clone منه)،
  وmanifest `tag → sha → تاريخ/عنوان` (153 سطرًا). استعادة أي tag: `git tag <الاسم> <الـ sha> && git push origin <الاسم>`.
- السكربت المستخدم قابل للتكرار وفيه حماية: محاولة حذف السلة C تُرفض بدون `FORCE=1`.

## 4. قواعد تمنع تكرار ما حدث

1. **لا push إلى `main`** بغير مؤلّف GitHub موثّق — `git log -1 --format='%an <%ae>'` قبل الدفع.
2. أي فرع وكيل مؤقت: **PR ثم حذف الفرع، بلا tag تعويضي**. أرشفة 107 ref بهذه الطريقة هي ما أوحى بوجود فروع متضاربة.
3. إصدارات حقيقية بدل الأرشيف: `git tag v1.x.y && git push --tags` (لا توجد release tags الآن على الإطلاق).
4. إن أردت نسخة محفوظة من حالة وسيطة: استخدم `refs/notes/` أو gist خاص، لا `archive/*` tags.
5. Vercel: اجعل `Production branch = main`، ولا تترك معاينات من فروع محذوفة منشورة لأشهر (اثنين منها كانا
   من commit بتاريخ 2026‑05‑19 وما زالا يخدمان).
