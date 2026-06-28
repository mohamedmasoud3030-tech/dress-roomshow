#!/bin/bash

FILE="src/components/layout/AppLayout.tsx"

# Add import for Calendar icon (if not exists)
sed -i "/import { Home, Dress, Users/a import { Calendar } from 'lucide-react';" "$FILE"

# Add Appointments link in the navigation
sed -i "/<NavLink to=\"\/dresses\"/a \              <NavLink to=\"/appointments\" className={...}>\n                <Calendar size={20} />\n                <span>المواعيد</span>\n              </NavLink>" "$FILE"

echo "Sidebar updated with Appointments link"
