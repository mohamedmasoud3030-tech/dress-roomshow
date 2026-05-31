import type { PaymentRecord } from './payment.types';

type AddPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (payment: PaymentRecord) => void;
};

export function AddPaymentModal(_props: AddPaymentModalProps) {
  return null;
}
