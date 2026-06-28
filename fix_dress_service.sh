#!/bin/bash

FILE="src/features/dresses/dress.service.ts"

# Remove the unused barcode variable (line 95)
sed -i '95d' "$FILE"

echo "Unused barcode variable removed from dress.service.ts"
