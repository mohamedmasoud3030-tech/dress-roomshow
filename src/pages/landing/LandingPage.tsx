import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DRESS_CATEGORIES } from '../../shared/domain/dressConstants';
import type { Dress } from '../../features/dresses/dress.types';
import { getDresses } from '../../features/dresses/dress.service';

const landingCategories = ['all', ...DRESS_CATEGORIES] as const;
type LandingCategoryFilter = (typeof landingCategories)[number];

export function LandingPage() {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<LandingCategoryFilter>('all');

  useEffect(() => {
    const allDresses = getDresses();
    const available = allDresses.filter((dress) => dress.status === 'available');
    setDresses(available);
    setLoading(false);
  }, []);

  const filteredDresses = useMemo(() => {
    if (selectedCategory === 'all') return dresses;
    return dresses.filter((dress) => dress.category === selectedCategory);
  }, [dresses, selectedCategory]);

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">LENA للفساتين</h1>
              <p className="mt-1 text-sm text-slate-600">استعارة وبيع فساتين المناسبات</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {landingCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    selectedCategory === category
                      ? 'bg-slate-950 text-white'
                      : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                  }`}
                >
                  {category === 'all' ? 'كل الفئات' : category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">الفساتين المتاحة</h2>
            <p className="mt-1 text-sm text-slate-600">تصفحي الفساتين المتاحة حالياً وحددي موعداً للتجربة.</p>
          </div>
          <Link
            to="/appointments"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            الذهاب إلى المواعيد
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-slate-600">جارٍ التحميل...</p>
        ) : filteredDresses.length === 0 ? (
          <p className="text-center text-slate-400">لا توجد فساتين متاحة ضمن الفئة الحالية</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredDresses.map((dress) => {
              const primaryImage = dress.images[0];
              return (
                <article
                  key={dress.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-lg"
                >
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={dress.name}
                      className="h-64 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center bg-stone-100">
                      <p className="text-slate-400">لا توجد صورة</p>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{dress.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{dress.category}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        متاح
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      {dress.isForRent && <p className="font-bold text-green-700">إيجار: {dress.rentalPrice} ر.ع</p>}
                      {dress.isForSale && <p className="font-bold text-blue-700">بيع: {dress.salePrice} ر.ع</p>}
                      <p className="text-slate-500">المقاس: {dress.size}</p>
                      <p className="text-slate-500">اللون: {dress.color}</p>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <Link
                        to="/appointments"
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        حجز موعد للتجربة
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
