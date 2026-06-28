import { useEffect, useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { AddAppointmentModal } from './AddAppointmentModal';
import { getTodaysAppointments } from './appointment.service';
import type { Appointment } from './appointment.types';

export function AppointmentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    setTodayAppointments(getTodaysAppointments());
  }, []);

  const handleAppointmentCreated = (appointment: Appointment) => {
    setTodayAppointments((current) => [...current, appointment]);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">المواعيد</h1>
          <p className="mt-1 text-sm text-slate-600">
            إدارة مواعيد التجربة والقياسات
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          حجز موعد
        </button>
      </div>

      {/* Today's Appointments Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
          <Clock size={20} />
          مواعيد اليوم
        </h2>
        
        {todayAppointments.length === 0 ? (
          <p className="text-center text-slate-400">لا توجد مواعيد اليوم</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map(apt => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <p className="font-bold text-slate-900">{apt.customerName}</p>
                  <p className="text-sm text-slate-600">
                    {apt.startTime} - {apt.endTime}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {apt.status === 'confirmed' ? 'مؤكد' :
                   apt.status === 'pending' ? 'معلق' : apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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
