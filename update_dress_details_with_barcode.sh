#!/bin/bash

FILE="src/features/dresses/DressDetailsPage.tsx"

# 1. Add imports for Barcode components
sed -i "/import { ImageGallery } from '.\/ImageGallery';/a import { BarcodeGenerator } from './BarcodeGenerator';\nimport { BarcodeScanner } from './BarcodeScanner';" "$FILE"

# 2. Add state for barcode scanner
sed -i "/const \[isLoading, setIsLoading\] = useState(true);/a \  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);" "$FILE"

# 3. Add Barcode section in the JSX (before the closing of the main div)
sed -i "/<ImageGallery images={dress.images} alt={dress.name} \/>/a \        \n        {/* Barcode Section */}\n        {dress && (\n          <div className=\"rounded-xl border border-slate-200 bg-white p-4\">\n            <h3 className=\"mb-3 text-lg font-bold text-slate-900\">الباركود</h3>\n            <BarcodeGenerator value={dress.barcode} />\n            <button\n              onClick={() => setShowBarcodeScanner(true)}\n              className=\"mt-3 w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100\"\n            >\n              مسح باركود (للتسليم/الاستلام)\n            </button>\n          </div>\n        )}" "$FILE"

# 4. Add BarcodeScanner modal
sed -i "/<\/div>\s*<\/div>\s*$/i \      {showBarcodeScanner && (\n        <BarcodeScanner\n          onScan={(barcode) => {\n            alert('تم مسح الباركود: ' + barcode);\n            setShowBarcodeScanner(false);\n          }}\n          onClose={() => setShowBarcodeScanner(false)}\n        />\n      )}" "$FILE"

echo "DressDetailsPage updated with barcode features"
