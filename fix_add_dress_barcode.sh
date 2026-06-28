#!/bin/bash

FILE="src/features/dresses/AddDressModal.tsx"

# Find the line with "addDress({" and add barcode after images
LINE_NUM=$(grep -n "addDress({" "$FILE" | cut -d: -f1)
if [ ! -z "$LINE_NUM" ]; then
  # Add barcode generation
  sed -i "${LINE_NUM}i\        const barcode = \`DRESS-\${Date.now()}-\${Math.random().toString(36).substr(2, 5).toUpperCase()}\`;)" "$FILE"
  
  # Add barcode to the object being passed
  sed -i "/images: images,/a \        barcode: barcode," "$FILE"
fi

echo "Barcode added to AddDressModal"
