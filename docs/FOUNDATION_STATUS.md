# Foundation Status

## Done

- Vite React TypeScript foundation
- Tailwind CSS foundation
- shadcn/ui configuration file
- PWA configuration
- Tauri configuration placeholder
- Arabic RTL app shell
- Dashboard placeholder
- Placeholder routes for the approved starting plan modules
- Supabase environment example
- Supabase client file
- Core database tables for profiles, dresses, dress images, customers, and reservations
- Additional foundation tables for payments, returns, and expenses
- Architecture, roadmap, and database notes

## Not started

The first real module has not been implemented yet.

Next module:

```text
Dresses
```

## Known limitations

- Local build verification could not be completed in this environment because direct git clone access to GitHub failed.
- The Supabase client should be reviewed locally once environment variables are available.
- Reservation overlap and payment total database triggers still need a local SQL validation pass before production use.
- The Tauri configuration should be checked against the installed Tauri CLI version during local setup.

## Local setup

```bash
npm install
npm run build
npm run lint
```

## Environment

Create `.env.local` with:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Stop point

The project is intentionally stopped before implementing the Dresses module.
