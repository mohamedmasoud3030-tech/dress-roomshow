export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type Appointment = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  dressId?: string;
  dressName?: string;
  consultantId?: string;
  consultantName?: string;
  roomId?: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentFilters = {
  search: string;
  status: 'all' | AppointmentStatus;
  date: string; // YYYY-MM-DD for filtering by date
};

export type AppointmentSummary = {
  total: number;
  pending: number;
  confirmed: number;
  today: number;
};
