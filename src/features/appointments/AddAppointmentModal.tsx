import { useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { addAppointment } from './appointment.service';
import type { Appointment, AppointmentStatus } from './appointment.types';

type AddAppointmentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
};

export function AddAppointmentModal({ open, onClose, onCreated }: AddAppointmentModalProps) {
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      const appointment = addAppointment({
        customerId: '',
        customerName,
        phone,
        appointmentDate,
        startTime,
        endTime,
        status: 'pending' as AppointmentStatus,
        notes,
      });

      onCreated(appointment);
      onClose();
    } catch (error: any) {
      setSubmitError(error instanceof Error ? error : new Error('حدث خطأ غير متوقع'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="حجز موعد جديد" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError !== null && (
          <UserFacingErrorAlert error={submitError} fallback="تعذر حفظ الموعد." />
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700">اسم العميلة</label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700">رقم الهاتف</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">التاريخ</label>
            <input
              type="date"
              required
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">الوقت</label>
            <div className="mt-1 flex gap-2">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 p-2"
              />
              <span className="self-end pb-2">إلى</span>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            rows={3}
          />
        </div>

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-950 py-2 text-sm font-bold text-white"
          >
            حفظ الموعد
          </button>
        </div>
      </form>
    </Modal>
  );
}
