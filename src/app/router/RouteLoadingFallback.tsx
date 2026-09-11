export function RouteLoadingFallback() {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
      role="status"
      aria-live="polite"
      style={{ background: 'var(--surface, #141a24)', borderColor: 'var(--line, rgba(186, 204, 230, 0.14))', color: 'var(--ink, #eef3fb)' }}
    >
      <p className="text-lg font-bold text-slate-900">جارٍ تحميل بيانات المعرض…</p>
      <p className="mt-2 text-sm text-slate-500">نراجع آخر نسخة محفوظة ونجهز الشاشة المطلوبة. لن يُفقد أي تغيير أثناء الانتظار.</p>
    </section>
  );
}
