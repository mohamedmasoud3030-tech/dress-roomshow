#!/bin/bash

FILE="src/app/App.tsx"

# 1. Add import for LandingPage
sed -i "/import { AppointmentsPage }/a import { LandingPage } from '../pages/landing/LandingPage';" "$FILE"

# 2. Change the root route to show LandingPage
sed -i "s/<Route index element={<DashboardPage \/>} \/>/<Route index element={<LandingPage />} \/>/" "$FILE"

# 3. Add a route for the dashboard (so it's not lost)
sed -i "/<Route path=\"\/appointments\"/a \                <Route path=\"/dashboard\" element={<DashboardPage />} />" "$FILE"

echo "Routes updated: Landing page is now the homepage"
