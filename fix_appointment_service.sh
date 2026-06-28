#!/bin/bash

FILE="src/features/appointments/appointment.service.ts"

# Add getTodaysAppointments function
cat >> "$FILE" << 'FUNC'

export function getTodaysAppointments(): Appointment[] {
  const today = new Date().toISOString().split('T')[0];
  return getAppointments().filter(apt => apt.appointmentDate === today);
}
FUNC

echo "appointment.service.ts updated with getTodaysAppointments"
