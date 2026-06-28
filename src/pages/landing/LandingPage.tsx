import { useState, useEffect } from 'react';
import { Dress } from '../../features/dresses/dress.types';
import { getDresses } from '../../features/dresses/dress.service';

export function LandingPage() {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allDresses = getDresses();
    const available = allDresses.filter(d => d.status === 'available');
    setDresses(available);
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black text-slate-900">LENA للفساتين</h1>
          <p className="mt-1 text-sm text-slate-600">استعارة وبيع فساتين المناسبات</p>
        </div>
      </header>

      {/* Rest of the landing page code remains the same... */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h3 className="mb-8 text-2xl font-bold text-slate-900">الفساتين المتاحة</h3>

        {loading ? (
          <p className="text-center text-slate-600">جارٍ التحميل...</p>
        ) : dresses.length === 0 ? (
          <p className="text-center text-slate-400">لا توجد فساتين متاحة حالياً</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dresses.map(dress => (
              <div
                key={dress.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-lg"
              >
                {dress.images && dress.images.length > 0 ? (
                  <img
                    src={dress.images[0]}
                    alt={dress.name}
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-stone-100">
                    <p className="text-slate-400">لا توجد صورة</p>
                  </div>
                )}
                
                <div className="p-4">
                  <h4 className="font-bold text-slate-900">{dress.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">{dress.category}</p>
                  
                  <div className="mt-3 flex items-center justify-between">
                    {dress.isForRent && (
                      <span className="text-sm font-bold text-green-700">
                        إيجار: {dress.rentalPrice} ر.ع
                      </span>
                    )}
                    {dress.isForSale && (
                      <span className="text-sm font-bold text-blue-700">
                        بيع: {dress.salePrice} ر.ع
                      </span>
                    )}
                  </div>

                  <button className="mt-3 w-full rounded-lg bg-slate-950 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
                    حجز الموعد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
