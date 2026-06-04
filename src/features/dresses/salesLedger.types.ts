export type SaleInvoiceItem = {
  id: string;
  dressCode: string;
  dressName: string;
  unitPrice: number;
};

export type SaleInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  items: SaleInvoiceItem[];
  subtotal: number;
  notes?: string;
  createdAt: string;
};

export type SaleReturn = {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  dressCode: string;
  dressName: string;
  amount: number;
  returnDate: string;
  reason: string;
  createdAt: string;
};

export type SalesLedgerSummary = {
  invoicesCount: number;
  grossSales: number;
  returnsTotal: number;
  netSales: number;
};
