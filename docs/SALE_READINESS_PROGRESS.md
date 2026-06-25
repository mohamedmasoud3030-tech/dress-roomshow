# Sale Readiness Progress

Implementation is in progress on the review branch.

## Phase 5: Manual Runtime QA

Automated checks have passed for the current review scope, but they do not fully simulate browser policies, Tauri host behavior, device viewport behavior, or storage failures. Phase 5 is a manual runtime QA pass that must be completed before the app is considered sale-ready.

### Prerequisites

- Run `npm install` if dependencies are missing.
- Run `npm test`, `npm run lint`, and `npm run build` before manual QA so runtime findings are not mixed with known automated failures.
- Use a clean browser profile or clear the app's local storage before the first browser-mode pass.
- Record the operating system, browser name and version, Tauri WebView platform, viewport size, and any screenshots or screen recordings for failed checks.

### Browser Mode

1. Start the Vite app with `npm run dev`.
2. Open the local URL in a desktop browser.
3. Navigate through dashboard, dresses, reservations, payments, delivery and return, reports, preferences, and audit log.
4. Create a representative customer, dress, reservation, payment, expense, sale invoice, and daily closing.
5. Refresh the browser and verify the local-first data remains available.
6. Close and reopen the tab, then verify the same persisted data still loads.

Expected result: browser mode runs without console errors, navigation regressions, data loss, or broken RTL layout.

### Tauri Desktop Mode

1. Start the desktop app with `npm run tauri -- dev`.
2. Repeat the browser-mode create, refresh, and reopen flow inside the Tauri window.
3. Quit the app completely and relaunch it.
4. Verify the SQLite-backed desktop snapshot restores the data that was present before quitting.
5. Confirm browser-only fallback warnings do not appear during a healthy desktop run.

Expected result: desktop mode persists and restores the app snapshot through the Tauri commands without user-visible storage errors.

### Blocked Popup Printing

1. In browser mode, configure the browser to block popups for the local Vite origin.
2. Create or open a sale invoice from the sales ledger.
3. Click the invoice print action.
4. Verify the app shows the Arabic print-specific error message instead of silently failing.
5. Allow popups for the origin and retry printing.

Expected result: blocked popup printing produces a clear user-facing recovery message, and allowed popup printing opens the invoice print flow.

### Missing Supabase Env

1. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set in the shell or local env files.
2. Start the app with `npm run dev`.
3. Verify startup behavior for any route or module that imports the Supabase client.
4. Restore valid Supabase env values if the environment is needed for later checks.

Expected result: missing Supabase configuration fails predictably with a clear configuration error and does not masquerade as a data-loss or routing issue.

### LocalStorage Quota Failure

1. In browser mode, open DevTools on the app origin.
2. Simulate a quota failure by temporarily overriding `localStorage.setItem` to throw a quota-style error.
3. Perform a write operation such as creating a dress, customer, payment, or reservation.
4. Verify the persistence error boundary or banner appears and preserves enough context for the user to understand that saving failed.
5. Remove the override, reload the app, and verify normal saving resumes.

Expected result: quota failures are surfaced as persistence failures and do not produce silent partial saves.

### Mobile Layout

1. Open browser mode in responsive device emulation.
2. Test at 390 x 844 and 360 x 740 viewports.
3. Navigate every primary route from the app shell.
4. Open core modals for dresses, customers, reservations, payments, expenses, and sale invoices.
5. Verify buttons, form fields, tables, cards, and navigation remain reachable without horizontal page overflow.

Expected result: the RTL mobile layout remains usable at common phone widths, with no clipped primary actions or unreadable content.

### Exit Criteria

- All six manual areas above are marked pass, or every failure has an issue with reproduction steps, expected behavior, actual behavior, environment details, and screenshots where useful.
- Any runtime bug that risks data loss, failed checkout/sale flow, failed printing, or unusable mobile navigation is fixed before sale readiness is approved.
- The final QA note links to the commit under test and lists the exact browser, OS, and Tauri platform used.
