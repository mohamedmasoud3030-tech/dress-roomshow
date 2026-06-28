#!/bin/bash

# 1. Add barcode field to dress.types.ts
sed -i "/  images: string\[\];/a \  barcode: string; // Unique barcode for the dress" src/features/dresses/dress.types.ts

# 2. Update AddDressInput in dress.service.ts to include barcode
sed -i "/  images: string\[\];/a \  barcode?: string;" src/features/dresses/dress.service.ts

# 3. Generate barcode automatically in addDress function
# Find the line where dress object is created and add barcode generation
LINE_NUM=$(grep -n "const dress: Dress = {" src/features/dresses/dress.service.ts | cut -d: -f1)
if [ ! -z "$LINE_NUM" ]; then
  # Add barcode generation before the dress object
  sed -i "${LINE_NUM}i\  const barcode = input.barcode || \`DRESS-\${Date.now()}-\${Math.random().toString(36).substr(2, 5).toUpperCase()}\`;" src/features/dresses/dress.service.ts
  
  # Add barcode to the dress object
  sed -i "/const dress: Dress = {/,/};/ s/images: input.images || \[\],/images: input.images || [],\n    barcode: barcode,/" src/features/dresses/dress.service.ts
fi

echo "Barcode support added successfully"
