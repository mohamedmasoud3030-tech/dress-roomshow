import { useState } from 'react';
import { Plus, Printer, RotateCcw } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { EmptyState } from '../../components/shared/StateViews';
import { PageHeader } from '../../components/shared/PageHeader';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { CreateSaleInvoiceModal } from './CreateSaleInvoiceModal';
import { printSaleInvoice } from './printSaleInvoice';
import { getSaleInvoices, getSaleReturns, type SaleInvoice } from './salesLedger.service';
import { recordSaleReturnCommand } from '../workflows';

export function SalesLedgerPage() {
  const [invoices, setInvoices] = useState(() => getSaleInvoices());
  const [returns, setReturns] = useState(() => getSaleReturns());
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function returnLine(invoice: SaleInvoice, dressCode: string) {
    try {
      const created = recordSaleReturnCommand({ invoiceNumber: invoice.invoiceNumber, dressCode, returnDate: getTodayISO() });
      setReturns(getSaleReturns());
      setFeedback(`تم تسجيل المرتجع ${created.returnNumber}.`);
    } catch (error: unknown) {
      setFeedback(error instanceof Error ? error.message : 'تعذر تسجيل المرتجع.');
    }
  }

  function printInvoice(invoice: SaleInvoice) {
    try {
      printSaleInvoice(invoice);
      setFeedback(`تم فتح نافذة طباعة الفاتورة ${invoice.invoiceNumber}.`);
    } catch (error: unknown) {
      setFeedback(error instanceof Error ? error.message : 'تعذر طباعة الفاتورة.');
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="المبيعات"
        title="سجل المبيعات والفواتير"
        actions={(
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            فاتورة جديدة
          </Button>
        )}
      />

      {feedback && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{feedback}</div>}

      {invoices.length === 0 ? (
        <EmptyState title="لا توجد فواتير مبيعات بعد" description="كل عملية بيع تُسجَّل كفاتورة يمكن طباعتها وإرجاع بنودها لاحقاً." />
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400" dir="ltr">{invoice.invoiceNumber}</p>
                  <h2 className="mt-1 text-lg font-bold">{invoice.customerName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{invoice.saleDate} · {formatMoneyOMR(invoice.totalAmount)}</p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => printInvoice(invoice)}>
                  <Printer aria-hidden="true" className="h-4 w-4" />
                  طباعة
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {invoice.lines.map((line) => {
                  const returned = returns.some((item) => item.invoiceNumber === invoice.invoiceNumber && item.dressCode === line.dressCode);
                  return (
                    <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 text-sm">
                      <div>
                        <b dir="ltr">{line.dressCode}</b>
                        <span className="mr-2">{line.dressName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <b>{formatMoneyOMR(line.amount)}</b>
                        {returned ? (
                          <span className="text-xs font-bold text-rose-700">تم المرتجع</span>
                        ) : (
                          <Button type="button" variant="quiet" size="sm" onClick={() => returnLine(invoice, line.dressCode)} className="min-h-10 px-2 text-xs text-rose-700 hover:bg-rose-50">
                            <RotateCcw aria-hidden="true" className="h-4 w-4" />
                            مرتجع
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateSaleInvoiceModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(invoice) => {
          setInvoices((current) => [invoice, ...current]);
          setFeedback(`تم حفظ الفاتورة ${invoice.invoiceNumber}.`);
        }}
      />
    </section>
  );
}
