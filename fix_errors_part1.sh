#!/bin/bash

# Fix dress.mock.ts by adding images and barcode
sed -i "/timesRented: number;/a \  images: string[];\n  barcode: string;" src/features/dresses/dress.mock.ts

# Update mock data to include images and barcode
sed -i "s/notes: 'فساتين/,/\n    images: [],\n    barcode: 'DRESS-001',/" src/features/dresses/dress.mock.ts

echo "Part 1 errors fixed. Running typecheck again..."
