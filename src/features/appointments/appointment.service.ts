import { Appointment, AppointmentStatus } from './appointment.types';
import { migrateLegacyAppointmentStorage, readCollection, writeCollection } from '../../services/localDatabase';

const APPOINTMENTS_COLLECTION = 'appointments';

function getAppointments(): Appointment[] {
  migrateLegacyAppointmentStorage();
  return readCollection<Appointment>(APPOINTMENTS_COLLECTION, []);
}

function saveAppointments(appointments: Appointment[]): void {
  migrateLegacyAppointmentStorage();
  writeCollection<Appointment>(APPOINTMENTS_COLLECTION, appointments);
}

export function addAppointment(input: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Appointment {
  const appointments = getAppointments();
  
  const newAppointment: Appointment = {
    ...input,
    id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  appointments.push(newAppointment);
  saveAppointments(appointments);
  return newAppointment;
}

export function getAppointmentsByDate(date: string): Appointment[] {
  const appointments = getAppointments();
  return appointments.filter(apt => apt.appointmentDate === date);
}

export function getTodaysAppointments(): Appointment[] {
  const today = new Date().toISOString().split('T')[0];
  return getAppointmentsByDate(today);
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus): Appointment | null {
  const appointments = getAppointments();
  const index = appointments.findIndex(apt => apt.id === id);
  
  if (index === -1) return null;

  appointments[index] = {
    ...appointments[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  saveAppointments(appointments);
  return appointments[index];
}

export function deleteAppointment(id: string): boolean {
  const appointments = getAppointments();
  const filtered = appointments.filter(apt => apt.id !== id);
  
  if (filtered.length === appointments.length) return false;

  saveAppointments(filtered);
  return true;
}
