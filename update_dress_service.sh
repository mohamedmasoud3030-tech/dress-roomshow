#!/bin/bash

FILE="src/features/dresses/dress.service.ts"

# 1. Update AddDressInput type to include images
sed -i "s/export type AddDressInput = {/export type AddDressInput = {\n  images: string[];/1" "$FILE"

# 2. Update addDress function to use images
sed -i "/const dress: Dress = {/,/};/ s/notes: input.notes,/notes: input.notes,\n    images: input.images || [],/ " "$FILE"

echo "dress.service.ts updated successfully"
