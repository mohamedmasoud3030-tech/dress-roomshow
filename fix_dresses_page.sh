#!/bin/bash

FILE="src/features/dresses/DressesPage.tsx"

# Fix the filterDresses and summarizeDresses calls
sed -i "s/filterDresses(filters,/filterDresses(/" "$FILE"
sed -i "s/summarizeDresses(dresses)/summarizeDresses()/" "$FILE"

echo "DressesPage fixed - function calls corrected"
