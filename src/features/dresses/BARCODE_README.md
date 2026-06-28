# Barcode System Documentation

## Overview
The barcode system allows:
1. Generating unique barcodes for each dress
2. Scanning barcodes to quickly update dress status
3. Printing barcode labels for inventory management

## Components
- `BarcodeGenerator.tsx`: Generates and prints barcodes
- `BarcodeScanner.tsx`: Scans barcodes using device camera

## Integration
The barcode value is stored in the `dress.barcode` field.
