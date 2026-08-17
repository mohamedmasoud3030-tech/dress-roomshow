# تدقيق تجربة المنتج الكاملة — LENA

> تاريخ المراجعة: 2026-08-17
>
> نوع المراجعة: read-only من منظور الزائرة، الموظفة، المديرة، مستخدمة الهاتف والمستخدمة لأول مرة.
>
> بدأت المراجعة بتشغيل production build واستخدام الواجهة الفعلية على 1440×1000 و390×844. استُخدم Chromium headless حقيقي مع Supabase responses معزولة غير إنتاجية. هذا المستند يسجل baseline قبل remediation؛ حالة الإصلاح الحالية موثقة في `PROJECT_DEFECTS.md`.

## 1. كيف يبدو المنتج الآن للمستخدم لأول مرة؟

### للزائرة العامة

الانطباع خلال ثوانٍ واضح: هذا معرض فساتين ومستلزمات مناسبات في عُمان، يعرض قطعًا للإيجار والبيع، والهدف النهائي هو اختيار قطعة ثم طلب موعد أو الاستفسار عبر WhatsApp.

الصفحة العامة تبدو كواجهة متجر حقيقية وليست dashboard تقنية. العنوان الرئيسي واضح: **«اختاري إطلالتك من المعرض قبل الزيارة»**. يوجد مسار منطقي من الفئات، إلى المعروض، إلى الخدمات، إلى خطوات الزيارة والأسئلة والتواصل.

القيمة الأساسية مفهومة، والـ CTA الرئيسي واضح. بصريًا الصفحة هادئة ومقصودة، ولا تبدو كصفحة placeholder.

لكن الثقة تتضرر عند الوصول إلى معلومات التواصل: الصفحة قد تعرض رقم عمان مع أرقام دول أخرى وبريدًا أساسيًا ثم بريدًا شخصيًا مختلفًا. في الاختبار مع public profile جزئي ظهر:

```text
+968 9000 0000
+966 50 868 8213
+20 121 210 1073
hello@example.test
MohamedMs.oud@outlook.com
```

هذه البيانات تأتي من defaults المدمجة عند غياب fields في public profile. الزائرة لا تعرف أي رقم هو الرسمي ولماذا يوجد أكثر من بلد.

### للموظفة أو المديرة

شاشة الدخول تقول فقط **«تسجيل الدخول لإدارة المعرض»**، ولذلك يتضح أن المنتج نظام داخلي. بعد الدخول وقفل الجهاز يظهر dashboard يشرح أنه لا توجد بيانات بعد ويعطي خطوتين واضحتين: إضافة أول عنصر وإضافة أول عميلة.

المستخدم يفهم أن المنتج ليس مجرد مخزون، بل نظام تشغيل كامل: حجوزات، تسليم، دفع، جرد، تقارير وخدمة. لكن هذا الاتساع يظهر دفعة واحدة في sidebar أو قائمة «المزيد»، فيشعر المستخدم الجديد أن عليه تعلم نحو عشرين قسمًا قبل أن يبدأ.

## 2. المنتج المقصود مقابل المنتج المجرّب

| الجانب | المنتج المقصود | ما يختبره المستخدم فعليًا |
| --- | --- | --- |
| الصفحة العامة | واجهة واضحة للمعرض وطلب موعد | واضحة ومقنعة، لكنها طويلة جدًا على الهاتف وقد تعرض contact defaults مربكة. |
| أول استخدام داخلي | إضافة قطعة وعميلة ثم أول حجز | dashboard يشرح التسلسل جيدًا، لكن فتح «حجز جديد» قبل إضافة عميلة ينتهي داخل wizard مع زر Next معطل ولا يوجد زر إضافة عميلة داخله. |
| العمل اليومي السريع | وصول مباشر للحجز والتسليم والدفع | mobile bottom navigation ممتاز لهذا الغرض. |
| إدارة كاملة | نظام واحد مترابط | الأقسام مترابطة منطقيًا، لكن كثرتها تجعل النظام يبدو أحيانًا كـ 20 أداة متجاورة. |
| الأمان | حساب + PIN + صلاحيات | يعطي ثقة، لكن refresh/deep link يعيد شاشة PIN كل مرة، وstaff التي تفتح settings مباشرة تعاد إلى dashboard بلا تفسير. |
| الإعدادات | مكان إدارة التشغيل | صفحة واحدة شديدة الطول تجمع backup، reset، المال، الحسابات، PIN، templates، الطباعة وpublic profile. |
| حالات الفشل | توضيح ما حدث وكيفية الاسترداد | بعض الأخطاء جيدة، لكن loading العام يعرض نصًا خاصًا بالباركود وتفاصيل العنصر حتى أثناء تحميل بيانات المعرض. |

## 3. الأدوار وخريطة الرحلات

### الأدوار المشاهدة

| الدور | الوصول الذي ظهر في التجربة |
| --- | --- |
| زائرة عامة | Landing catalogue، الفئات، الخدمات، FAQ، التواصل، WhatsApp. |
| Staff | كل الرحلات التشغيلية تقريبًا؛ لا يظهر settings. فتح `/preferences` مباشرة يعيدها إلى dashboard. |
| Admin | جميع الرحلات + settings/backup/accounts/profile/print/PIN. |

### الرحلات الأساسية

#### رحلة الزائرة

```text
Landing -> فهم نوع المعرض -> تصفح الفئات -> رؤية القطعة -> طلب موعد / استفسار WhatsApp
```

- البداية واضحة.
- القطعة تعرض السعر والمقاس واللون والاستخدام.
- النص لا يعد بحجز مؤكد، وهذه نقطة ثقة جيدة.
- الصفحة طويلة جدًا على الهاتف؛ نفس CTA ومعلومات التواصل تتكرر عدة مرات.

#### رحلة أول إعداد للمعرض

```text
Login -> إعداد PIN -> dashboard empty -> إضافة عنصر -> إضافة عميلة -> إنشاء حجز
```

- dashboard empty هو أفضل onboarding موجود في المنتج.
- التسلسل مذكور نصيًا بوضوح.
- لا يوجد checklist بحالة «تمت الخطوة 1/2/3»، ولا رابط مساعدة أو بيانات تجريبية مرئية.
- زر «حجز جديد» ظاهر حتى عندما لا توجد عميلات أو قطع، فيدخل المستخدم إلى dead end بدل توجيهه للمتطلبات.

#### رحلة إضافة المخزون

- نقطة البدء واضحة جدًا.
- modal منظم بصريًا، لكن يطلب في شاشة واحدة: صور، اسم، نوع، فئة، لون، مقاس، وصف، استخدام، أربعة أسعار، حالة وملاحظات.
- زر الحفظ أسفل scroll طويل حتى على desktop؛ على الهاتف سيكون أكثر تعبًا مع لوحة المفاتيح.
- لا يوجد تقسيم «أساسي الآن / تفاصيل لاحقًا».

#### رحلة إنشاء الحجز

- wizard من أربع خطوات ممتاز مقارنة بنموذج طويل.
- mobile stepper واضح، وأزرار السابق/التالي/إلغاء في أماكن مفهومة.
- عند empty data يظهر selector «اختاري العميلة» وNext معطل، لكن لا يظهر سبب واضح داخل النموذج ولا CTA لإضافة عميلة.
- على نفس الشاشة تظهر خلف modal calendar، filters، export وempty state، ما يزيد الحمل البصري رغم blur الخلفية.

#### رحلة returning user على الهاتف

- bottom navigation يعرض: الرئيسية، حجوزات، تسليم، مدفوعات، المزيد. هذا اختيار جيد جدًا لأكثر أعمال الكاونتر تكرارًا.
- قائمة «المزيد» تعرض بقية النظام في sheet واحدة، لكنها طويلة وتتجاوز الشاشة بوضوح وتحتاج scroll كبيرًا.
- أهم المهام سريعة؛ المهام الأقل شيوعًا كثيفة.

#### رحلة الإعدادات للمديرة

- كل capability موجودة ويمكن العثور عليها بالتمرير.
- الصفحة تبدو أقرب إلى لوحة صيانة تقنية طويلة من شاشة إعدادات موجهة لمالكة معرض.
- «تصفير جميع البيانات» يظهر قرب أعلى الصفحة بجانب backup/restore، قبل الحساب أو معلومات المنتج.
- templates تعرض tokens تقنية مثل `{{customerName}}` و`{{reservationNumber}}` بكثافة.
- public profile وprint settings بعيدان جدًا أسفل الصفحة.

## 4. بطاقة تقييم التجربة

| المجال | الدرجة /10 | ما يمنع درجة أعلى |
| --- | ---: | --- |
| وضوح القيمة | 8 | الصفحة العامة واضحة جدًا؛ النظام الداخلي يحتاج فهم عدد كبير من الأقسام. |
| الانطباع الأول | 8 | مظهر متماسك واحترافي؛ معلومات الاتصال الافتراضية تقلل الثقة. |
| التنقل | 6 | grouping جيد، لكن 20 destination كثيرة، وMore menu مزدحم. |
| سهولة التعلم | 6 | empty dashboard ممتاز؛ لا onboarding مستمر أو contextual help داخل dead ends. |
| إتمام المهمة الأساسية | 6 | wizard جيد، لكن prerequisites غير معالجة من داخل الرحلة وcloud confirmation غير مرئي بوضوح. |
| الجودة البصرية | 8 | hierarchy، المساحات، البطاقات والألوان متقنة. بعض الصفحات شديدة الطول والكثافة. |
| الاتساق | 7 | primitives مشتركة واضحة؛ اختلاف «العملاء/العميلات» وبعض loading/copy غير المتعلق بالسياق. |
| استخدام الهاتف | 7 | bottom nav وwizard قويان، لكن public page وMore/settings طويلة جدًا. |
| العربية وRTL | 8 | RTL جيد والأرقام/currency واضحة عمومًا؛ بعض English tokens والمصطلحات التقنية تظهر للمديرة. |
| الوصول Accessibility | 6 | focus/labels جيدة في أجزاء كثيرة؛ axe وجد contrast وlandmark/heading violations. |
| الثقة | 6 | audit/PIN/backup تعطي ثقة؛ contact defaults، غياب password recovery، وloading الخاطئ يضعفونها. |
| اكتمال المنتج | 6 | العمليات كثيرة ومفيدة، لكن onboarding، account recovery، support، role-denial feedback وبعض recovery states ناقصة. |

**التقييم العام: 7/10 كمنتج تشغيلي واعد، و6/10 كمنتج جاهز لمستخدم جديد دون تدريب.**

## 5. ما يعمل جيدًا ويجب الحفاظ عليه

1. **الصفحة العامة تشرح القيمة بسرعة.** العنوان، الفئات والـ CTA مترابطة.
2. **Empty dashboard ممتاز.** يشرح أن البيانات لم تبدأ بعد ويقدم أول خطوتين حقيقيتين.
3. **Mobile bottom navigation ممتاز.** يضع الحجز والتسليم والدفع أمام موظفة الكاونتر.
4. **Reservation wizard واضح ومتدرج.** أربع خطوات أفضل من form مالي طويل.
5. **الهوية البصرية متماسكة.** ivory/gold/navy تناسب boutique وتبدو مقصودة.
6. **RTL فعلي وليس مجرد محاذاة نص.** sidebar، sheets، cards واتجاه القراءة تعمل بصورة طبيعية.
7. **الفصل بين public/customer وinternal/operations واضح.** لا تظهر البيانات المالية للزائرة.
8. **Empty states غالبًا مفيدة وليست فراغًا.** Customers وInventory يشرحان next step.
9. **أفعال الخطر تحمل تأكيدًا، والـ PIN والـ backup واضحان.** هذا يناسب منتجًا ماليًا وتشغيليًا.
10. **لا يوجد horizontal overflow** في الصفحات التي تم قياسها: `scrollWidth === viewport` على 1440 و390.

## 6. مشاكل Critical وHigh

لا توجد مشكلة بصرية Critical مؤكدة. توجد أربع مشاكل تجربة High.

### PX-01 — معلومات اتصال fallback مربكة وقد تكون خاطئة

- **النوع:** Product trust/content defect.
- **الدور والرحلة:** زائرة عامة -> التواصل أو طلب موعد.
- **المسار/الحالة/viewport:** `/landing`، profile عام جزئي، desktop 1440 وmobile 390.
- **ما تراه:** رقم عمان مع أرقام سعودية ومصرية، وبريد public مع بريد افتراضي مختلف.
- **لماذا يضر:** المستخدم لا يعرف الرقم الرسمي، وقد يرسل بياناته أو طلبه إلى contact قديم/شخصي.
- **الشدة:** High.
- **الدليل:** الواجهة الفعلية عرضت خمسة contact links مختلفة لأن merge العام أبقى `alternatePhones` و`alternateEmail` من defaults.
- **التصحيح:** public profile يجب أن يستبدل contact arrays بدل توريث contacts شخصية. defaults الآمنة تكون فارغة، ويظهر فقط ما اعتمدته المديرة.
- **التحسن المتوقع:** جهة اتصال واحدة موثوقة وتقليل تردد الزائرة.
- **الجهد:** Quick win للمحتوى والـ merge؛ structural إذا احتاج migration للبيانات الحالية.
- **معيار القبول:** clean browser يرى فقط contacts الموجودة في public profile؛ لا رقم أو بريد hardcoded غير معتمد.

### PX-02 — حجز جديد يتحول إلى dead end عند عدم وجود عميلات

- **النوع:** Usability/journey defect.
- **الدور:** مستخدمة جديدة أو معرض فارغ.
- **المسار:** `/reservations?new=1`، step 1، 390 و1440.
- **ما تراه:** dropdown فارغ، Next disabled، ولا زر «إضافة عميلة» داخل modal.
- **لماذا يضر:** يجب إلغاء المهمة والانتقال يدويًا إلى Customers ثم العودة؛ المستخدم لا يعرف إن كان الخلل صلاحية أم بيانات ناقصة.
- **الشدة:** High.
- **الدليل:** screenshot الفعلية أظهرت step 1 والزر disabled؛ dashboard في الوقت نفسه يعرض زر «حجز جديد» حتى مع صفر عميلات وصفر مخزون.
- **التصحيح:** إذا prerequisites ناقصة، افتح شاشة preflight توضح «أضيفي عميلة وقطعة أولًا» مع أزرار inline، أو اسمح بإضافة عميلة من داخل wizard ثم العودة تلقائيًا.
- **التحسن:** الوصول لأول حجز دون ضياع context.
- **الجهد:** Structural صغير/متوسط.
- **معيار القبول:** مستخدمة على database فارغة تستطيع بدء الحجز، إضافة المتطلبات، والعودة لنفس wizard دون إعادة إدخال التواريخ.

### PX-03 — Loading العام يتحدث عن تفاصيل عنصر وباركود أثناء تحميل المعرض

- **النوع:** UX copy/trust defect.
- **الدور:** أي مستخدمة بعد login أو على شبكة بطيئة/فشل cloud.
- **المسار:** `/` أثناء CloudDataGate، mobile 390.
- **ما تراه:** **«جاري تحميل تفاصيل العنصر... انتظر لحظة حتى يتم تجهيز بيانات الباركود والطباعة.»** رغم أنها لم تفتح عنصرًا.
- **لماذا يضر:** يوحي بأن التطبيق انتقل لمسار خاطئ أو علق في صفحة مخزون، ويخفي حقيقة أن بيانات المعرض تُحمّل.
- **الشدة:** High.
- **الدليل:** screenshot فعلية من cloud 503/slow state لمدة أكثر من 6 ثوانٍ.
- **التصحيح:** fallback عام: «جارٍ تحميل بيانات المعرض والتحقق من آخر نسخة...»؛ تفاصيل العنصر لها fallback route-specific مستقل.
- **التحسن:** فهم سبب الانتظار والثقة بعدم فقد البيانات.
- **الجهد:** Quick win.
- **معيار القبول:** كل route تعرض loading متعلقًا بالسياق؛ cloud failure ينتقل خلال timeout واضح إلى error + retry.

### PX-04 — لا يوجد استرداد حساب أو مسار دعم من شاشة الدخول

- **النوع:** Product completeness/trust defect.
- **الدور:** staff جديدة، كلمة مرور منسية، حساب معطل.
- **المسار:** `/login`، desktop/mobile.
- **ما تراه:** email، password، دخول فقط.
- **لماذا يضر:** المستخدم غير التقني لا يعرف من ينشئ الحساب أو كيف يستعيد كلمة المرور أو يتواصل مع المديرة.
- **الشدة:** High قبل الاستخدام الحقيقي متعدد الموظفات.
- **الدليل:** الواجهة الفعلية لا تعرض forgot password، help، support أو account onboarding.
- **التصحيح:** «نسيت كلمة المرور»، «الحسابات تنشئها المديرة»، وcontact support داخلي. Disabled account state يذكر اسم/طريقة التواصل.
- **التحسن:** تقليل توقف الموظفات واعتمادهن على الدعم التقني.
- **الجهد:** Structural متوسط لأن reset يحتاج Auth flow موثوق.
- **معيار القبول:** مستخدمة غير قادرة على الدخول تستطيع بدء reset موثوق أو تعرف بالضبط من تتواصل معه دون مغادرة المنتج عمياء.

## 7. مشاكل النظام البصري والتصميم

### PX-05 — Settings صفحة واحدة مفرطة الطول والكثافة

- **النوع:** Product-structure + usability defect.
- **الدور:** Admin.
- **المسار:** `/preferences`، 1440×1000.
- **ما تراه:** backup/reset، image migration، operating rules، account، staff accounts، PIN، app version، message templates، print/PDF، public profile في صفحة واحدة طويلة جدًا.
- **الشدة:** Medium.
- **الدليل:** full-page screenshot متعددة الشاشات؛ 12 heading رئيسية في الصفحة.
- **التصحيح:** تقسيم إلى tabs/subroutes: التشغيل، الحسابات والأمان، النسخ والبيانات، الرسائل، الطباعة، الصفحة العامة.
- **التحسن:** تقليل الخطأ والوصول السريع للإعداد المطلوب.
- **الجهد:** Structural change.
- **معيار القبول:** كل مجموعة لها route أو tab؛ deep links؛ حفظ مستقل؛ destructive actions معزولة في «البيانات والخطر».

### PX-06 — «تصفير جميع البيانات» قريب بصريًا من backup/restore

- **النوع:** Interaction hierarchy defect.
- **الدور:** Admin.
- **المسار:** أعلى `/preferences`.
- **ما تراه:** download، restore، reset في action group واحدة.
- **الشدة:** Medium.
- **الدليل:** screenshot الفعلية تظهر reset كزر ثالث في نفس card.
- **التصحيح:** Danger Zone منفصلة أسفل settings، مع شرح irreversibility وbackup timestamp حديث.
- **التحسن:** تقليل الضغط الخاطئ ورفع الثقة.
- **الجهد:** Quick win.
- **معيار القبول:** reset لا يظهر بجانب routine backup؛ لا ينفذ دون typing confirmation وذكر آخر backup.

### PX-07 — نموذج إضافة المخزون يطلب كل التفاصيل دفعة واحدة

- **النوع:** Usability/density defect.
- **الدور:** مستخدمة جديدة أو موظفة إدخال مخزون.
- **المسار:** `/inventory` -> إضافة عنصر، desktop/mobile.
- **ما تراه:** نموذج طويل مع أكثر من 15 قرارًا قبل أول حفظ.
- **الشدة:** Medium.
- **الدليل:** screenshot الفعلية على desktop لا تصل إلى زر الحفظ دون scroll.
- **التصحيح:** قسم «البيانات الأساسية» ثم expandable «الأسعار والتفاصيل»؛ أو wizard قصير: الهوية، الاستخدام والسعر، الصور.
- **التحسن:** إدخال أسرع وأخطاء أقل.
- **الجهد:** Structural متوسط.
- **معيار القبول:** إضافة قطعة أساسية ممكنة في شاشة واحدة دون scroll على desktop، مع تفاصيل اختيارية لاحقًا.

### ما ليس defect

اختيار ivory/gold/navy، rounded cards، والـ serif-like visual weight ليس مشكلة؛ هو أسلوب مناسب للمعرض ومتسق. لا أوصي بتغيير الهوية لمجرد taste شخصي.

## 8. مشاكل التنقل وهندسة المعلومات

### PX-08 — عدد الوجهات كبير للمستخدم الجديد

- **النوع:** Information architecture defect.
- **الدور:** staff جديدة.
- **الحالة:** sidebar desktop وMore mobile.
- **ما تراه:** قرابة 20 وجهة: مخزون، ملحقات، توفر، خدمة، جرد، أداء، عملاء، حجوزات، مواعيد، انتظار، تذكيرات، تسليم، مبيعات، مدفوعات، مصروفات، إقفال، تقارير، audit، settings.
- **الشدة:** Medium.
- **الدليل:** mobile More sheet تجاوز viewport وظهر clipped؛ sidebar ممتد بطول الصفحة.
- **التصحيح:** progressive disclosure حسب workflow: اليوم، الحجوزات، المخزون، المالية، الإدارة. اجمع «أداء المخزون» داخل Reports، و«المتاح في فترة» داخل Reservations أو Inventory كإجراء واضح.
- **التحسن:** وقت تعلم أقل ومسار ذهني أوضح.
- **الجهد:** Structural IA.
- **معيار القبول:** مستخدمة جديدة تسمي مكان الحجز والتسليم والدفع دون مساعدة؛ More يعرض 5–7 مجموعات لا 20 link متساوية.

### PX-09 — الفرق بين «المخزون» و«الملحقات» غير مفسر

- **النوع:** Naming/product model defect.
- **الدور:** staff تضيف حقيبة/طرحة/تاج.
- **المسار:** navigation + Add Inventory type selector.
- **ما تراه:** يوجد route «الملحقات»، وفي Add Inventory يمكن اختيار accessory/bag/shoe/veil أيضًا.
- **الشدة:** Medium.
- **التصحيح:** إما توحيد entry point، أو شرح: «قطع رئيسية قابلة للإيجار/البيع» مقابل «ملحقات تُرفق بالحجز». امنع نفس النوع من التسجيل في مكانين.
- **التحسن:** عدم انقسام inventory history.
- **الجهد:** Structural/product decision.
- **معيار القبول:** كل نوع عنصر له مكان واحد واضح، ويمكن للموظفة اختياره من مثال واقعي دون تخمين.

### PX-10 — Staff تُعاد من settings بلا تفسير

- **النوع:** Permission feedback defect.
- **الدور:** Staff.
- **المسار:** direct `/preferences`، mobile 390.
- **ما تراه:** dashboard فقط؛ لا رسالة «هذه الصفحة للمديرة».
- **الشدة:** Low/Medium.
- **الدليل:** تجربة role staff الفعلية: route تغير من `/preferences` إلى `/` بلا alert.
- **التصحيح:** شاشة permission denied قصيرة أو toast مع سبب وطريقة طلب التغيير.
- **التحسن:** تقليل الاعتقاد بأن الرابط مكسور.
- **الجهد:** Quick win.
- **معيار القبول:** direct unauthorized route يشرح السبب ولا يكشف المحتوى.

## 9. مشاكل المحتوى وUX Copy

### PX-11 — استخدام «العملاء» و«العميلات» غير موحد

- **النوع:** Content consistency.
- **المسار:** navigation يقول «العملاء»، page title يقول «إدارة العميلات».
- **الشدة:** Low.
- **التصحيح:** اختيار مصطلح واحد في navigation، headings، empty states وexports.
- **معيار القبول:** glossary واحد لكل entity في كل routes.

### PX-12 — النصوص التقنية في templates ثقيلة على مالكة غير تقنية

- **النوع:** Content/learning defect.
- **المسار:** `/preferences` message templates.
- **ما تراه:** tokens مثل `{{customerName}}`, `{{reservationNumber}}`, `{{remainingAmount}}` وقائمة طويلة.
- **الشدة:** Medium.
- **التصحيح:** insert-token buttons بأسماء عربية، preview بارز، وadvanced syntax مخفي.
- **التحسن:** تعديل الرسالة دون كسر placeholder.
- **الجهد:** Quick/medium.
- **معيار القبول:** مالكة غير تقنية تضيف اسم العميلة والتاريخ بالنقر فقط، وتعرف من preview أن الرسالة صحيحة.

### PX-13 — عنوان document واحد للواجهة العامة والإدارة

- **النوع:** Low trust/content polish.
- **الدليل:** `/landing`, `/login`, dashboard كلها تعرض browser title «LENA | معرض فساتين المناسبات».
- **التصحيح:** titles route-specific: «تسجيل الدخول | LENA»، «لوحة التحكم | LENA».
- **معيار القبول:** tab/history يعرّف كل شاشة.

## 10. الهاتف وRTL والوصول

### ما يعمل

- لا horizontal overflow في الصفحات المقاسة.
- bottom nav مريح وواضح.
- RTL mirroring طبيعي.
- touch targets الأساسية كبيرة.
- reservation sheet يناسب 390px ويثبت actions قرب الأسفل.
- focus rings وlabels موجودة في معظم النماذج.

### PX-14 — الصفحة العامة طويلة جدًا على الهاتف

- **النوع:** Mobile usability/content structure.
- **الدور:** زائرة.
- **المسار:** `/landing`, 390×844.
- **ما تراه:** hero، 8 فئات، inventory، خدمات، خطوات، FAQ، contact cards، footer؛ screenshot full-page طويلة جدًا، والـ CTA يتكرر عدة مرات.
- **الشدة:** Medium.
- **التصحيح:** على الهاتف اختصر الفئات والخدمات، collapse FAQ، sticky «طلب موعد»، وأظهر أهم contact فقط.
- **التحسن:** وصول أسرع للقطعة وWhatsApp.
- **الجهد:** Structural responsive content.
- **معيار القبول:** الزائرة تصل لأول card وCTA خلال 2–3 viewport، لا تحتاج نهاية الصفحة لفهم التواصل.

### PX-15 — نتائج axe تؤكد مشاكل وصول فعلية

- **النوع:** Accessibility defect.
- **الدور:** keyboard/screen-reader/low vision.
- **الحالات المشاهدة:**
  - Public mobile: `color-contrast` serious على عنصر واحد.
  - Login mobile: لا `main` landmark، و3 regions خارج landmarks.
  - Reservation modal: heading/landmark issues ظهرت في scan.
- **الشدة:** Medium.
- **التصحيح:** تشغيل axe في CI على public/login/dashboard/reservation؛ إصلاح contrast والـ semantic landmarks؛ ضمان H1 واحد واضح حتى مع modal.
- **التحسن:** قابلية استخدام وفهرسة/هيكل أفضل.
- **الجهد:** Quick wins متعددة.
- **معيار القبول:** صفر critical/serious axe violations في الصفحات الأساسية، keyboard journey كامل.

### PX-16 — PIN يظهر بعد كل full reload/deep link

- **النوع:** Security/usability tradeoff، وليس defect مطلقًا.
- **الدور:** returning staff.
- **ما حدث:** `page.goto` لأي route بعد إعداد PIN أعاد شاشة «التطبيق مقفل» وطلب الرقم مجددًا.
- **الشدة:** Low/Medium حسب بيئة العمل.
- **التصحيح المقترح:** لا تضعف الأمان افتراضيًا. وفر setting admin «إعادة القفل عند: كل فتح / بعد X دقائق / عند إخفاء التطبيق» مع default محافظ.
- **معيار القبول:** behavior واضح في settings؛ لا bypass بعد sign-out أو انتهاء timeout.

## 11. حالات المنتج الناقصة أو غير المكتملة

1. Password reset/invitation/help من login.
2. Onboarding checklist بعد empty dashboard.
3. Inline creation للعميلة/القطعة من reservation wizard.
4. Permission-denied state للـ staff.
5. Cloud loading timeout/copy/retry واضح.
6. Account-management error فيه alert لكن لا retry action ظاهر.
7. Settings subnavigation وDanger Zone.
8. Support/contact/about داخل internal app.
9. Privacy notice وسياسة بيانات العملاء والصور.
10. Public cancellation/deposit explanation قبل WhatsApp inquiry.
11. Undo محدود للأرشفة أو restore discoverable.
12. Reduced-motion audit غير مثبت؛ animations قليلة لكن لا تجربة فعلية preference.

## 12. ميزات يجب تبسيطها أو دمجها أو كشفها أو تأجيلها

### دمج أو إعادة موضع

- `inventory-performance` داخل Reports بدل destination رئيسية.
- `availability` كإجراء داخل Reservations/Inventory، مع بقاء deep link.
- توضيح أو توحيد Inventory مقابل Accessories.
- Settings إلى subroutes/tabs.

### كشف أفضل

- Upcoming appointments.
- Account recovery/support.
- Waitlist-to-reservation handoff داخل الرحلة.
- Public profile preview مباشر من settings.
- Sync state: «محفوظ على الخادم» بدل نجاح محلي مبهم.

### تأجيل أو إخفاء عن المستخدم الجديد

- audit log، advanced print template controls، image migration، raw placeholder syntax.
- لا تحذفها؛ ضعها تحت «متقدم» أو role admin.

## 13. Quick wins آمنة

| الأولوية | التحسين | الأثر |
| --- | --- | --- |
| 1 | تغيير cloud loading copy وإضافة timeout/retry | ثقة وفهم فوريان |
| 2 | منع fallback contacts غير المعتمدة | ثقة عامة وسلامة التواصل |
| 3 | permission denied message للـ staff | وضوح الصلاحيات |
| 4 | route-specific document titles | احتراف وسهولة تعدد tabs |
| 5 | توحيد العملاء/العميلات | اتساق لغوي |
| 6 | نقل Reset إلى Danger Zone منفصلة | تقليل خطأ مدمر |
| 7 | زر «إضافة عميلة» داخل empty reservation step | إزالة dead end |
| 8 | token insertion buttons عربية | تقليل كسر templates |
| 9 | contrast + landmarks من axe | وصول وثقة |

## 14. تحسينات هيكلية

1. Onboarding state machine: inventory -> customer -> reservation -> payment -> delivery.
2. IA مبنية على يوم العمل لا على modules التقنية.
3. Settings subroutes وadvanced disclosure.
4. Inline prerequisite creation في booking.
5. Server-acknowledged success UX لكل العمليات المالية.
6. Public contact/profile governance: draft, preview, publish.
7. Account lifecycle كامل: invite, activate, reset, disable، مع support path.
8. Responsive landing content strategy بدل نفس طول desktop على الهاتف.

## 15. خارطة المعالجة المقترحة

### Milestone A — الثقة وعدم الانسداد قبل العرض الحقيقي

1. إصلاح public contact fallback.
2. cloud loading/error copy الصحيح.
3. login recovery/support.
4. booking prerequisites داخل wizard.
5. permission feedback.
6. axe serious issues.

**معيار الخروج:** مستخدم جديد وزائرة وstaff يفهمون أين هم وماذا يفعلون، ولا توجد جهة اتصال غير معتمدة أو dead end.

### Milestone B — سرعة التعلم والعمل اليومي

1. onboarding checklist.
2. تبسيط sidebar/More grouping.
3. settings tabs + Danger Zone.
4. future appointments/status actions.
5. waitlist handoff feedback.

### Milestone C — العمق والاحتراف

1. Public mobile shortening/sticky CTA.
2. advanced settings disclosure.
3. route titles/support/about/privacy.
4. reduced-motion + full keyboard/screen-reader pass.
5. sync acknowledgment UX.

## 16. الحكم النهائي

LENA يبدو **منتجًا حقيقيًا ومتماسكًا بصريًا** أكثر بكثير من prototype. الصفحة العامة والـ dashboard والـ mobile navigation والـ booking wizard نقاط قوية جدًا. لكنه لا يزال يفترض أن المديرة ستشرح للموظفات أين يبدأن، وأن مشاكل الحساب أو البيانات ستُحل خارج المنتج.

قبل عرضه لمستخدمين حقيقيين يجب إصلاح: contacts العامة، booking dead end، cloud loading/error copy، واسترداد الحساب. بعد ذلك يمكن إطلاق محدود مع تدريب قصير. إعادة تنظيم navigation/settings واختصار landing mobile مهمة، لكنها لا يجب أن تؤخر pilot مغلق إذا أُغلقت مشاكل الثقة والوصول أولًا.
