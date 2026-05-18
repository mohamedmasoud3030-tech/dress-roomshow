# Database Foundation

## Current foundation

The database foundation starts with these tables:

- profiles
- dresses
- dress_images
- customers
- reservations

These support the first setup milestone and prepare the app for the first real module: Dresses.

## Tables planned before production use

The following tables are part of the starting plan and must be added before the app is considered functionally complete:

- payments
- delivery_returns
- expenses

## Rules planned before production use

- Prevent overlapping reservations for the same dress and date range.
- Recalculate reservation paid and remaining amounts from payment records.
- Keep important financial records append-only where possible.

## Storage

Supabase Storage should include a bucket for dress images.

Recommended bucket name:

```text
dress-images
```

## Security

Row Level Security policies should be added after the profile and role model is connected to Supabase Auth.
