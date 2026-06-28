#!/bin/bash

FILE="src/app/App.tsx"

# 1. Add import for AppointmentsPage
sed -i "/import { DashboardPage } from '..\/features\/dashboard\/DashboardPage';/a import { AppointmentsPage } from '../features/appointments/AppointmentsPage';" "$FILE"

# 2. Add route for appointments
sed -i "/<Route path=\"\/dresses\"/a \                <Route path=\"/appointments\" element={<AppointmentsPage />} />" "$FILE"

# 3. Add link in the sidebar (if exists)
# This depends on the layout structure, we'll add it later

echo "Appointments route added successfully"
