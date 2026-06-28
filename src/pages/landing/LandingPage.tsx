import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, Filter, HeartHandshake, Ruler, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { getDresses } from '../../features/dresses/dress.service';
import type { Dress } from '../../features/dresses/dress.types';
import { DRESS_CATEGORIES } from '../../shared/domain/dressConstants';
import { formatMoneyOMR } from '../../shared/utils/format';

const landingCategories = ['all', ...DRESS_CATEGORIES] as const;
type LandingCategoryFilter = (typeof landingCategories)[number];
type LandingUsageFilter = 'all' | 'rent' | 'sale';

function getLandingDressPriceLabel(dress: Dress): string {
  if (dress.isForRent && dress.isForSale) {
    return `إيجار ${formatMoneyOMR(dress.rentalPrice)} • بيع ${formatMoneyOMR(dress.salePrice)}`;
  }

  if (dress.isForRent) {
    return `إيجار ${formatMoneyOMR(dress.rentalPrice)}`;
  }

  if (dress.isForSale) {
    return `بيع ${formatMoneyOMR(dress.salePrice)}`;
  }

  return 'السعر يحدد عند المعاينة';
}

export function LandingPage() {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LandingCategoryFilter>('all');
  const [usageFilter, setUsageFilter] = useState<LandingUsageFilter>('all');

  useEffect(() => {
    const availableDresses = getDresses().filter((dress) => dress.status === 'available');
    setDresses(availableDresses);
    setLoading(false);
  }, []);

  const filteredDresses = useMemo(() => {
    return dresses.filter((dress) => {
      const matchesCategory = selectedCategory === 'all' || dress.category === selectedCategory;
      const matchesUsage = usageFilter === 'all'
        || (usageFilter === 'rent' && dress.isForRent)
        || (usageFilter === 'sale' && dress.isForSale);
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch = normalizedSearch.length === 0
        || [dress.name, dress.category, dress.color, dress.size]
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesUsage && matchesSearch;
    });
  }, [dresses, search, selectedCategory, usageFilter]);

  const featuredDresses = filteredDresses.slice(0, 6);
  const rentableCount = dresses.filter((dress) => dress.isForRent).length;
  const saleCount = dresses.filter((dress) => dress.isForSale).length;

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900" dir="rtl">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700">LENA Dress Roomshow</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">فساتين مناسبات جاهزة للتجربة والحجز</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                تصفحي الفساتين المتاحة حالياً، قارني بين خيارات الإيجار والبيع، ثم احجزي موعدك بسهولة لتجربة الفستان المناسب.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/appointments"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                احجزي موعد تجربة
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-100"
              >
                دخول لوحة الإدارة
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-6 rounded-3xl bg-gradient-to-l from-slate-950 via-slate-900 to-violet-900 px-6 py-8 text-white shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90 ring-1 ring-white/15">
              تشكيلة متجددة لمناسباتك
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              اختاري فستانك بثقة قبل الزيارة
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              هذه الصفحة مصممة لتسهيل المعاينة الأولية للعميلة: صور أوضح، فلاتر أسرع، أسعار مفهومة، وخطوة مباشرة لحجز الموعد.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/appointments"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-stone-100"
              >
                <CalendarDays className="h-4 w-4" />
                ابدئي بحجز موعد
              </Link>
              <a
                href="#available-dresses"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                شاهدي الفساتين المتاحة
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/70">إجمالي المتاح الآن</p>
              <p className="mt-2 text-3xl font-black">{dresses.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/70">متاح للإيجار</p>
              <p className="mt-2 text-3xl font-black">{rentableCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/70">متاح للبيع</p>
              <p className="mt-2 text-3xl font-black">{saleCount}</p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">معاينة أسرع</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">شاهدي المتاح فقط بدون تشتيت، مع صور وسعر واستخدام واضح.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">تفاصيل مفيدة</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">المقاس، اللون، الفئة، وسعر الإيجار أو البيع معروضة بوضوح قبل الموعد.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">خطوة واضحة للحجز</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">بعد اختيار الموديل المناسب، انتقلي مباشرة إلى حجز الموعد لتجربة الفستان.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="available-dresses" className="mt-10 space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700">المعرض الحالي</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">الفساتين المتاحة الآن</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                استخدمي الفلاتر التالية لتضييق الخيارات حسب الفئة أو نوع الخدمة أو البحث بالاسم واللون والمقاس.
              </p>
            </div>
            <Link
              to="/appointments"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-100"
            >
              <HeartHandshake className="h-4 w-4" />
              الانتقال إلى المواعيد
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
              <label className="relative block">
                <span className="sr-only">ابحثي في الفساتين</span>
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحثي بالاسم أو الفئة أو اللون أو المقاس"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 pr-11 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30"
                />
              </label>

              <label>
                <span className="sr-only">فلتر الفئة</span>
                <div className="relative">
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value as LandingCategoryFilter)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-10 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30"
                  >
                    {landingCategories.map((category) => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'كل الفئات' : category}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label>
                <span className="sr-only">فلتر الخدمة</span>
                <select
                  value={usageFilter}
                  onChange={(event) => setUsageFilter(event.target.value as LandingUsageFilter)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30"
                >
                  <option value="all">إيجار وبيع</option>
                  <option value="rent">للإيجار فقط</option>
                  <option value="sale">للبيع فقط</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              {loading ? 'جارٍ تحميل الفساتين المتاحة…' : `عدد النتائج الحالية: ${filteredDresses.length}`}
            </p>
            {!loading && filteredDresses.length > 0 && (
              <p className="text-xs text-slate-500">
                عرض مبدئي للفساتين المتاحة حالياً، وقد تتغير الحالة عند تأكيد الحجز أو البيع.
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-72 animate-pulse bg-stone-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 animate-pulse rounded bg-stone-100" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredDresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-900">لا توجد فساتين مطابقة حالياً</p>
              <p className="mt-2 text-sm text-slate-500">
                جرّبي تغيير البحث أو الفلاتر، أو انتقلي لحجز موعد للاستفسار عن الخيارات المتاحة قريباً.
              </p>
              <Link
                to="/appointments"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                حجز موعد للاستفسار
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {featuredDresses.map((dress) => {
                const primaryImage = dress.images[0];
                return (
                  <article
                    key={dress.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={dress.name}
                        className="h-72 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center bg-gradient-to-br from-violet-100 via-white to-amber-50">
                        <p className="text-sm font-medium text-slate-500">لا توجد صورة متاحة حالياً</p>
                      </div>
                    )}

                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">{dress.category}</p>
                          <h3 className="mt-1 text-lg font-black text-slate-950">{dress.name}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {dress.description || 'فستان مناسب للمناسبات مع إمكانية تجربة المقاس والاطلاع على التفاصيل أثناء الموعد.'}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                          متاح
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-slate-400">المقاس</p>
                          <p className="mt-1 font-bold text-slate-900" dir="ltr">{dress.size}</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-slate-400">اللون</p>
                          <p className="mt-1 font-bold text-slate-900">{dress.color}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-400">السعر</p>
                        <p className="mt-2 text-sm font-bold text-slate-900">{getLandingDressPriceLabel(dress)}</p>
                        {dress.isForRent && dress.depositAmount > 0 && (
                          <p className="mt-2 text-xs text-slate-500">التأمين: {formatMoneyOMR(dress.depositAmount)}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {dress.isForRent && (
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">للإيجار</span>
                        )}
                        {dress.isForSale && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">للبيع</span>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link
                          to="/appointments"
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                          حجز موعد للتجربة
                        </Link>
                        <a
                          href="#available-dresses"
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
                        >
                          متابعة التصفح
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
