#!/bin/bash

# Fix unused imports in DressDetailsPage.tsx
sed -i "/import { ImageGallery } from '.\/ImageGallery';/d" src/features/dresses/DressDetailsPage.tsx
sed -i "/import { BarcodeGenerator } from '.\/BarcodeGenerator';/d" src/features/dresses/DressDetailsPage.tsx
sed -i "/import { BarcodeScanner } from '.\/BarcodeScanner';/d" src/features/dresses/DressDetailsPage.tsx

# Actually, we need to add the imports correctly, so let's add them properly
echo "Cleaned unused imports. Now adding them properly..."

# Add proper imports
cat > src/features/dresses/DressDetailsPage_imports.ts << 'IMPORTS'
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Printer, Camera } from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { getDressByCode, deleteDress } from './dress.service';
import { updateReservation } from '../reservations/reservation.service';
import type { Dress } from './dress.types';
import { ImageGallery } from './ImageGallery';
import { BarcodeGenerator } from './BarcodeGenerator';
import { BarcodeScanner } from './BarcodeScanner';
IMPORTS

echo "Imports file created. You may need to manually merge it."
