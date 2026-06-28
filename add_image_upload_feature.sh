#!/bin/bash

FILE="src/features/dresses/AddDressModal.tsx"

# 1. Add import for ImageUpload after the existing imports
sed -i "/import { ImageUpload } from '.\/ImageUpload';/!s/import type { Dress } from '.\/dress.types';/import type { Dress } from '.\/dress.types';\nimport { ImageUpload } from '.\/ImageUpload';/" "$FILE"

# 2. Add images state after submitError state
sed -i "/const \[submitError, setSubmitError\] = useState<unknown>(null);/a \  const [images, setImages] = useState<string[]>([]);" "$FILE"

# 3. Add ImageUpload component in the form (after the error alert)
sed -i "/{submitError !== null && (/a \        <ImageUpload images={images} onChange={setImages} maxImages={5} />" "$FILE"

# 4. Add images and barcode to the addDress call
sed -i "/const dress = addDress({/a \        images: images,\n        barcode: \`DRESS-\${Date.now()}-\${Math.random().toString(36).substr(2, 5).toUpperCase()}\`," "$FILE"

echo "Image upload and barcode features added to AddDressModal"
