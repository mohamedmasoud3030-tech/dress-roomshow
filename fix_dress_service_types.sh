#!/bin/bash

FILE="src/features/dresses/dress.service.ts"

# Fix the category type issue by ensuring it matches DressCategory
sed -i "s/category: 'سهرة',/category: 'سهرة' as const,/g" "$FILE"
sed -i "s/category: 'زفاف',/category: 'زفاف' as const,/g" "$FILE"

echo "Category type issue fixed"
