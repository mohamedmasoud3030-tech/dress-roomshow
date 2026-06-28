#!/bin/bash

FILE="src/features/dresses/dress.service.ts"

# Add images and barcode to AddDressInput type
sed -i "s/export type AddDressInput = {/export type AddDressInput = {\n  images: string[];\n  barcode: string;/1" "$FILE"

echo "AddDressInput type updated with images and barcode"
