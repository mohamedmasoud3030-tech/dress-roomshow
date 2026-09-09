import { useEffect, useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { AddAppointmentModal } from './AddAppointmentModal';
import { getTodaysAppointments, getUpcomingAppointments } from './appointment.service';
import type { Appointment } from './appointment.types';
import { Button } from '../../components/shared/Button';
import { PageHeader } from '../../components/shared/PageHeader';
import { Section } from '../../components/shared/Section';
import { EmptyState } from '../../components/shared/StateViews';

const APPOINTMENT_STATUS_BADGES: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-900 ring-amber-200',
  cancelled: 'bg-rose-50 text-rose-800 ring-rose-200',
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  confirmed: 'مؤكد',
  pending: 'معلق',
  cancelled: 'ملغي',
};

export function AppointmentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  const refreshAppointments = () => {
    setTodayAppointments(getTodaysAppointments());
    setUpcomingAppointments(getUpcomingAppointments());
  };

  useEffect(() => {
    refreshAppointments();
  }, []);

  const handleAppointmentCreated = () => {
    refreshAppointments();
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المواعيد"
        title="المواعيد"
        description="إدارة مواعيد التجربة والقياسات"
      />

      <Section
        title="مواعيد اليوم"
        description="مواعيد التجربة والقياسات المقررة اليوم."
        action={
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            حجز موعد
          </Button>
        }
      >
        {todayAppointments.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-10 w-10" />}
            title="لا توجد مواعيد اليوم"
            description="أضيفي أول موعد تجربة أو قياس من زر «حجز موعد»."
          />
        ) : (
          <ul className="space-y-3">
            {todayAppointments.map((apt) => (
              <li
                key={apt.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 transition hover:bg-stone-100"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{apt.customerName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {apt.startTime} - {apt.endTime}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${APPOINTMENT_STATUS_BADGES[apt.status] ?? 'bg-stone-100 text-slate-700 ring-slate-200'}`}>
                  {APPOINTMENT_STATUS_LABELS[apt.status] ?? apt.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="المواعيد القادمة"
        description="كل المواعيد بعد اليوم، مرتبة بالتاريخ والوقت."
      >
        {upcomingAppointments.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-10 w-10" />}
            title="لا توجد مواعيد قادمة"
            description="ستظهر هنا المواعيد المستقبلية فور حفظها."
          />
        ) : (
          <ul className="space-y-3">
            {upcomingAppointments.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{appointment.customerName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {appointment.appointmentDate} · {appointment.startTime} - {appointment.endTime}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${APPOINTMENT_STATUS_BADGES[appointment.status] ?? 'bg-stone-100 text-slate-700 ring-slate-200'}`}>
                  {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <AddAppointmentModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={handleAppointmentCreated}
        />
      )}
    </div>
  );
}
