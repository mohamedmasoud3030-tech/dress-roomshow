#!/bin/bash

FILE="src/features/dashboard/DashboardPage.tsx"

# Fix summarizeDresses call (remove the argument)
sed -i "s/summarizeDresses(dresses)/summarizeDresses()/g" "$FILE"

echo "DashboardPage fixed - summarizeDresses call corrected"
