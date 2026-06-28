# Barcode System Documentation

## Overview
The barcode system currently supports:
1. Generating barcode labels for dresses
2. Scanning barcodes with the device camera using `@zxing/browser`
3. Falling back to manual barcode entry when camera access fails or is unavailable
4. Jumping directly to the matched dress inside the inventory page

## Components
- `BarcodeGenerator.tsx`: Generates barcodes and opens a print-friendly label window without relying on temporary Blob URLs
- `BarcodeScanner.tsx`: Scans supported barcode formats using the device camera
- `DressesPage.tsx`: Loads the scanner on demand and applies the scan result to inventory search/highlighting

## Supported formats
The scanner is currently configured to target:
- `CODE_128`
- `EAN_13`
- `EAN_8`

## Integration details
- The barcode value is stored in `dress.barcode`
- After a successful scan, the inventory flow searches by:
  1. exact `dress.barcode`
  2. fallback exact `dress.code`
- When a match is found:
  - the scanner closes
  - the dress is highlighted in the inventory results
  - the search field is auto-filled with the matched dress code

## Performance note
`BarcodeScanner.tsx` is lazy-loaded from `DressesPage.tsx`.
This keeps the initial application bundle smaller and loads the scanning library only when the user presses **مسح باركود**.

## UX fallback
If camera startup fails or camera permission is denied, the user can still continue using manual barcode input.
The manual flow now uses an inline input inside the scanner modal instead of a browser `prompt()`, which improves usability and keeps the flow consistent with the rest of the app UI.

## Runtime validation note
Static checks and production builds are passing, but barcode scanning still should be validated on a real device camera for final operational confidence.
