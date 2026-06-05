import { getExpenses } from '../expenses/expense.service';
import { getDressPerformance } from '../reports/report.service';
import { getReservations } from '../reservations/reservation.service';
import { getServiceTasks } from '../service-tasks/serviceTask.service';
import { getSales } from './sale.service';
import { getSaleReturns } from './salesLedger.service';

export function getDressLifecycle(code: string) {
  const performance = getDressPerformance().find((row) => row.code === code);
  const reservations = getReservations().filter((item) => item.dressCode === code);
  const sales = getSales().filter((item) => item.dressCode === code);
  const returns = getSaleReturns().filter((item) => item.dressCode === code);
  const expenses = getExpenses().filter((item) => item.relatedDressCode === code);
  const serviceTasks = getServiceTasks().filter((item) => item.dressCode === code);
  const timeline = [
    ...reservations.map((item) => ({ date: item.pickupDate, label: `حجز ${item.reservationNumber}`, tone: 'reservation' as const })),
    ...sales.map((item) => ({ date: item.saleDate, label: `بيع ${item.saleNumber}`, tone: 'sale' as const })),
    ...returns.map((item) => ({ date: item.returnDate, label: `مرتجع ${item.returnNumber}`, tone: 'return' as const })),
    ...expenses.map((item) => ({ date: item.expenseDate, label: `مصروف ${item.expenseNumber}`, tone: 'expense' as const })),
    ...serviceTasks.map((item) => ({ date: item.sentDate, label: `خدمة ${item.taskNumber}`, tone: 'service' as const })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  return { performance, reservations, sales, returns, expenses, serviceTasks, timeline };
}

export function getDressRecommendations(input: ReturnType<typeof getDressLifecycle>) {
  const recommendations: string[] = [];
  if (input.performance?.inactivityDays !== null && input.performance?.inactivityDays !== undefined && input.performance.inactivityDays >= 90) recommendations.push('لا توجد حركة منذ 90 يوماً أو أكثر: راجعي التصوير أو السعر أو العرض.');
  if ((input.performance?.maintenanceCostRatio ?? 0) >= 35) recommendations.push('تكلفة الخدمة مرتفعة مقارنة بالإيراد: يحتاج قرار صيانة/بيع مستعمل.');
  if (input.performance?.recoveredPurchaseCost) recommendations.push('تم استرداد تكلفة الشراء: مناسب لمراجعة البيع كقطعة مستعملة.');
  if ((input.performance?.roiPercent ?? 0) < 0) recommendations.push('العائد الحالي سلبي: راجعي المصروفات أو استراتيجية التسعير.');
  return recommendations;
}
