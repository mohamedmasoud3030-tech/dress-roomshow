import { getAppPreferences } from '../preferences/preferences.service';
import { getReservationBufferDays } from './reservation.service';
import type { Reservation } from './reservation.types';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character);
}

export function getRentalContractHtml(reservation: Reservation): string {
  const showroomName = getAppPreferences().showroomName;
  const bufferDays = getReservationBufferDays();
  const remaining = reservation.remainingAmount;

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${escapeHtml(reservation.reservationNumber)}</title><style>@page{size:A4;margin:14mm}body{font-family:Tahoma,Arial,sans-serif;color:#0f172a;margin:0}.contract{border:2px solid #0f172a;border-radius:20px;padding:24px}.header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #cbd5e1;padding-bottom:16px}.brand{font-size:26px;font-weight:900;color:#92400e}.ref{direction:ltr;font-weight:900}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}.item{border:1px solid #e2e8f0;border-radius:14px;padding:10px}.label{font-size:11px;color:#64748b}.value{margin-top:4px;font-weight:800}.terms{margin-top:20px;line-height:1.9;font-size:13px}.signatures{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:36px}.signature{height:92px;border:1px dashed #94a3b8;border-radius:14px;padding:12px;font-weight:800}@media print{button{display:none}}</style></head><body><section class="contract"><div class="header"><div><div class="brand">${escapeHtml(showroomName)}</div><p>عقد إيجار فستان</p></div><div><p class="label">رقم العقد</p><p class="ref">${escapeHtml(reservation.reservationNumber)}</p></div></div><div class="grid"><div class="item"><p class="label">العميلة</p><p class="value">${escapeHtml(reservation.customerName)}</p></div><div class="item"><p class="label">الهاتف</p><p class="value">${escapeHtml(reservation.customerPhone)}</p></div><div class="item"><p class="label">الفستان</p><p class="value">${escapeHtml(reservation.dressCode)} · ${escapeHtml(reservation.dressName)}</p></div><div class="item"><p class="label">فترة الإيجار</p><p class="value">${escapeHtml(reservation.pickupDate)} إلى ${escapeHtml(reservation.returnDate)}</p></div><div class="item"><p class="label">تاريخ التسليم</p><p class="value">${escapeHtml(reservation.pickupDate)}</p></div><div class="item"><p class="label">تاريخ الإرجاع المتوقع</p><p class="value">${escapeHtml(reservation.returnDate)}</p></div><div class="item"><p class="label">أيام التجهيز</p><p class="value">${bufferDays} يوم قبل/بعد الحجز</p></div><div class="item"><p class="label">قيمة الإيجار</p><p class="value">${reservation.rentalPrice.toFixed(3)} OMR</p></div><div class="item"><p class="label">العربون/التأمين</p><p class="value">${reservation.depositAmount.toFixed(3)} OMR</p></div><div class="item"><p class="label">المدفوع والمتبقي</p><p class="value">مدفوع ${reservation.paidAmount.toFixed(3)} · متبقي ${remaining.toFixed(3)} OMR</p></div></div><div class="terms"><h2>الشروط</h2><p>تلتزم العميلة بإرجاع الفستان في التاريخ المتفق عليه وبنفس حالة التسليم. يحق للمعرض احتساب غرامة تأخير عن كل يوم بعد تاريخ الإرجاع المتوقع، وخصم تكلفة أي تلف أو تنظيف أو تعديل استثنائي من مبلغ التأمين أو إضافتها على الرصيد.</p><p>الملاحظات: ${escapeHtml(reservation.notes ?? 'لا توجد ملاحظات.')}</p></div><div class="signatures"><div class="signature">توقيع العميلة</div><div class="signature">توقيع المعرض</div></div></section><script>window.print();</script></body></html>`;
}

export function printRentalContract(reservation: Reservation): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) throw new Error('تعذر فتح نافذة طباعة العقد.');
  printWindow.document.write(getRentalContractHtml(reservation));
  printWindow.document.close();
}
