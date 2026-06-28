#!/bin/bash

# Add image upload import and state to AddDressModal.tsx

FILE="src/features/dresses/AddDressModal.tsx"

# 1. Add import for ImageUpload
sed -i "/import type { Dress } from '.\/dress.types';/a import { ImageUpload } from './ImageUpload';" "$FILE"

# 2. Add images state after submitError state
sed -i "/const \[submitError, setSubmitError\] = useState<unknown>(null);/a   const [images, setImages] = useState<string[]>([]);" "$FILE"

# 3. Add images to form data (before onCreated)
sed -i "/const dress = addDress({/a \      images: images," "$FILE"

# 4. Add ImageUpload component in the form (before the actions div)
sed -i "/<div className=\"flex flex-col-reverse gap-3 border-t/a \        {/* Image Upload Section */}\n        <ImageUpload images={images} onChange={setImages} maxImages={5} />\n" "$FILE"

echo "AddDressModal.tsx updated with image upload feature"
