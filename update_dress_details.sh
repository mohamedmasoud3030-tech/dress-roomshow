#!/bin/bash

FILE="src/features/dresses/DressDetailsPage.tsx"

# 1. Add import for ImageGallery
sed -i "/import { useParams } from 'react-router-dom';/a import { ImageGallery } from './ImageGallery';" "$FILE"

# 2. Add ImageGallery component in the JSX (after the first div or header)
sed -i "/<div className=\"space-y-6\">/a \      {/* Image Gallery */}\n      {dress && dress.images && dress.images.length > 0 && (\n        <ImageGallery images={dress.images} alt={dress.name} />\n      )}" "$FILE"

echo "DressDetailsPage.tsx updated with ImageGallery"
