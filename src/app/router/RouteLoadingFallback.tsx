export function RouteLoadingFallback() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" role="status" aria-live="polite">
      <p className="text-lg font-bold text-slate-900">جاري تحميل تفاصيل العنصر…</p>
      <p className="mt-2 text-sm text-slate-500">انتظر لحظة حتى يتم تجهيز بيانات الباركود والطباعة.</p>
    </section>
  );
}
