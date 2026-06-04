import { formatMoneyOMR } from '../../shared/utils/format';
import type { Reservation } from './reservation.types';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function printRentalContract(reservation: Reservation): void {
  const remaining = Math.max(reservation.totalAmount - reservation.paidAmount, 0);
  const html = `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>عقد ${escapeHtml(reservation.reservationNumber)}</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; margin: 28px; color: #1f1b18; line-height: 1.8; }
        h1 { color: #8b5e3c; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .box { border: 1px solid #e8ded2; border-radius: 14px; padding: 12px; }
        .terms { margin-top: 18px; border-top: 2px solid #8b5e3c; padding-top: 12px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 56px; }
        .line { border-top: 1px solid #1f1b18; padding-top: 8px; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Dress Roomshow - عقد إيجار فستان</h1>
      <div class="grid">
        <div class="box">رقم الحجز: ${escapeHtml(reservation.reservationNumber)}</div>
        <div class="box">اسم العميلة: ${escapeHtml(reservation.customerName)}</div>
        <div class="box">الهاتف: ${escapeHtml(reservation.customerPhone)}</div>
        <div class="box">كود الفستان: ${escapeHtml(reservation.dressCode)}</div>
        <div class="box">اسم الفستان: ${escapeHtml(reservation.dressName)}</div>
        <div class="box">تاريخ الاستلام: ${escapeHtml(reservation.pickupDate)}</div>
        <div class="box">تاريخ الإرجاع: ${escapeHtml(reservation.returnDate)}</div>
        <div class="box">سعر الإيجار: ${escapeHtml(formatMoneyOMR(reservation.rentalPrice))}</div>
        <div class="box">مبلغ التأمين: ${escapeHtml(formatMoneyOMR(reservation.depositAmount))}</div>
        <div class="box">المبلغ المدفوع: ${escapeHtml(formatMoneyOMR(reservation.paidAmount))}</div>
        <div class="box">المتبقي: ${escapeHtml(formatMoneyOMR(remaining))}</div>
      </div>
      <p><strong>الملاحظات:</strong> ${escapeHtml(reservation.notes ?? '')}</p>
      <div class="terms">
        <h2>شروط الاستخدام</h2>
        <p>تلتزم العميلة بالمحافظة على الفستان وعدم إجراء أي تعديل أو تنظيف خارجي دون موافقة المعرض.</p>
        <h2>شروط الإرجاع</h2>
        <p>يجب إرجاع الفستان في التاريخ المحدد وبحالته المسجلة، وتخصم أي غرامات تأخير أو تلف من مبلغ التأمين.</p>
      </div>
      <div class="signatures"><div class="line">توقيع العميلة</div><div class="line">توقيع المعرض</div></div>
      <script>window.print();</script>
    </body>
  </html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
