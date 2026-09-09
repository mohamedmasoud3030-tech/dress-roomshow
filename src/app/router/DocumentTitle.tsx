import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: Array<[RegExp, string]> = [
  [/^\/landing/, 'معرض فساتين المناسبات'], [/^\/login/, 'تسجيل الدخول'],
  [/^\/inventory/, 'المخزون'], [/^\/designs/, 'التصاميم'], [/^\/availability/, 'المتاح في فترة'],
  [/^\/accessories/, 'الملحقات'], [/^\/customers/, 'العميلات'], [/^\/reservations/, 'الحجوزات'],
  [/^\/appointments/, 'المواعيد'], [/^\/delivery-return/, 'التسليم والاسترجاع'], [/^\/sales/, 'المبيعات والمرتجعات'],
  [/^\/service/, 'طابور الخدمة'], [/^\/stocktake/, 'الجرد الدوري'], [/^\/payments/, 'المدفوعات'],
  [/^\/expenses/, 'المصروفات'], [/^\/daily-closing/, 'إقفال اليومية'], [/^\/audit-log/, 'سجل التدقيق'],
  [/^\/reminders/, 'التذكيرات'], [/^\/waitlist/, 'قائمة الانتظار'], [/^\/reports/, 'التقارير'],
  [/^\/inventory-performance/, 'أداء المخزون'], [/^\/preferences/, 'الإعدادات'], [/^\/$/, 'لوحة التحكم'],
];

export function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const label = TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'إدارة المعرض';
    document.title = `${label} | CARMEN GALLERY`;
  }, [pathname]);
  return null;
}
