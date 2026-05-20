import { invoke } from '@tauri-apps/api/core';

type Base = { id: string; createdAt: string; updatedAt: string };
export type LocalCustomerRecord = Base & { name: string; phone: string; address: string; measurements: string; notes?: string; status: 'normal'|'trusted'|'warning'|'blocked'; totalReservations: number; activeReservations: number; totalPaid: number; remainingBalance: number; lastReservationDate?: string };
export type LocalDressRecord = Base & { code: string; name: string; description: string; category: string; color: string; size: string; purchasePrice: number; rentalPrice: number; salePrice: number; depositAmount: number; status: string; isForRent: boolean; isForSale: boolean; mainImageUrl?: string; timesRented: number; notes?: string };
export type LocalReservationRecord = Base & { reservationNumber:string; customerName:string; customerPhone:string; dressCode:string; dressName:string; pickupDate:string; returnDate:string; status:string; rentalPrice:number; depositAmount:number; totalAmount:number; paidAmount:number; remainingAmount:number; notes?:string };
export type LocalPaymentRecord = Base & { paymentNumber:string; reservationNumber:string; customerName:string; dressCode:string; dressName:string; paymentDate:string; paymentType:string; method:string; direction:string; amount:number; reservationTotal:number; notes?:string };
export type LocalExpenseRecord = Base & { expenseNumber:string; expenseDate:string; title:string; category:string; amount:number; paymentMethod:string; relatedDressCode?:string; relatedDressName?:string; notes?:string };
export type LocalDeliveryReturnRecord = Base & { reservationNumber:string; customerName:string; customerPhone?:string; dressCode:string; dressName:string; deliveryDateTime?:string; deliveryCondition?:string; returnDateTime?:string; returnCondition?:string; status:string; depositAmount:number; lateFee:number; damageFee:number; depositRefundAmount:number; notes?:string };

const isTauriRuntime = () => {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  const runtime = globalThis as typeof globalThis & {
    window?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return typeof runtime.window !== 'undefined' && '__TAURI_INTERNALS__' in runtime;
};
const db = async <T>(cmd:string, payload?:Record<string, unknown>) => invoke<T>(cmd, payload);
export async function initializeLocalDatabase(){ if(!isTauriRuntime()) return false; await db('init_local_database'); return true; }

export const loadLocalCustomers = async()=> isTauriRuntime()?db<LocalCustomerRecord[]>('list_customers'):null;
export const saveLocalCustomer = async(customer:LocalCustomerRecord)=>{ if(!isTauriRuntime()) return false; await db('insert_customer',{customer}); return true; };
export const loadLocalDresses = async()=> isTauriRuntime()?db<LocalDressRecord[]>('list_dresses'):null;
export const saveLocalDress = async(dress:LocalDressRecord)=>{ if(!isTauriRuntime()) return false; await db('insert_dress',{dress}); return true; };
export const loadLocalReservations = async()=> isTauriRuntime()?db<LocalReservationRecord[]>('list_reservations'):null;
export const saveLocalReservation = async(reservation:LocalReservationRecord)=>{ if(!isTauriRuntime()) return false; await db('insert_reservation',{reservation}); return true; };
export const loadLocalPayments = async()=> isTauriRuntime()?db<LocalPaymentRecord[]>('list_payments'):null;
export const saveLocalPayment = async(payment:LocalPaymentRecord)=>{ if(!isTauriRuntime()) return false; await db('insert_payment',{payment}); return true; };
export const loadLocalExpenses = async()=> isTauriRuntime()?db<LocalExpenseRecord[]>('list_expenses'):null;
export const saveLocalExpense = async(expense:LocalExpenseRecord)=>{ if(!isTauriRuntime()) return false; await db('insert_expense',{expense}); return true; };
export const loadLocalDeliveryReturns = async()=> isTauriRuntime()?db<LocalDeliveryReturnRecord[]>('list_delivery_returns'):null;
export const saveLocalDeliveryReturn = async(record:LocalDeliveryReturnRecord)=>{ if(!isTauriRuntime()) return false; await db('insert_delivery_return',{record}); return true; };
