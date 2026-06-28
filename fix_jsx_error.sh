#!/bin/bash

FILE="src/features/dresses/AddDressModal.tsx"

# Remove the misplaced ImageUpload from inside the conditional
sed -i "/{submitError !== null && (/,/)}/{ /<ImageUpload images={images} onChange={setImages} maxImages={5} \/>/d }" "$FILE"

# Add ImageUpload in the correct place (after the form tag)
sed -i "/<form onSubmit={handleSubmit(onSubmit)} className=\"space-y-5\" noValidate>/a \        <ImageUpload images={images} onChange={setImages} maxImages={5} />" "$FILE"

echo "JSX error fixed in AddDressModal"
