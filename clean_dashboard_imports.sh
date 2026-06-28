#!/bin/bash

FILE="src/features/dashboard/DashboardPage.tsx"

# Remove unused imports line by line
sed -i "/import { Link } from 'react-router-dom';/d" "$FILE"
sed -i "/import { PageHeader } from '..\/..\/components\/shared\/PageHeader';/d" "$FILE"
sed -i "/import { SummaryCard } from '..\/..\/components\/shared\/SummaryCard';/d" "$FILE"
sed -i "/import { getTodayISO } from '..\/..\/shared\/utils\/date';/d" "$FILE"
sed -i "/import { formatMoneyOMR } from '..\/..\/shared\/utils\/format';/d" "$FILE"

# Also remove unused icon imports
sed -i "/import {/,/} from 'lucide-react';/c\import { CalendarCheck, PackageCheck, ReceiptText, Shirt, UsersRound, WalletCards } from 'lucide-react';" "$FILE"

echo "Unused imports cleaned from DashboardPage.tsx"
