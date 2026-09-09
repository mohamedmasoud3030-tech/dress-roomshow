import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../src/components/shared/Button.tsx';
import { PageContainer } from '../src/components/shared/PageContainer.tsx';
import { PageHeader } from '../src/components/shared/PageHeader.tsx';
import { Stepper } from '../src/components/shared/Stepper.tsx';
import { getSuccessfulUploadUrls } from '../src/platform/images/supabaseImageUpload.ts';
import { getRemoteCatalogueImageUrl } from '../src/features/sync/supabaseSync.ts';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

test('the reservation stepper exposes the active step and phone-sized controls', () => {
  const steps = [
    { id: 'customer', label: 'العميلة' },
    { id: 'dates', label: 'التواريخ' },
    { id: 'items', label: 'القطع' },
    { id: 'summary', label: 'الملخص' },
  ];
  const markup = renderToStaticMarkup(React.createElement(Stepper, {
    steps,
    currentStep: 2,
    onStepChange: () => {},
    idPrefix: 'reservation',
  }));

  assert.match(markup, /aria-label="خطوات إنشاء الحجز"/);
  assert.match(markup, /aria-current="step"/);
  assert.match(markup, /aria-controls="reservation-panel-items"/);
  assert.match(markup, /الخطوة 3 من 4: القطع/);
  assert.match(markup, /h-11 w-11/, 'step controls must be at least 44px on phones');
});

test('shared mobile modals keep their own touch scrolling and do not freeze phone gestures', async () => {
  const modal = await readFile(join(sourceRoot, 'components/shared/Modal.tsx'), 'utf8');
  assert.doesNotMatch(modal, /document\.body\.style\.touchAction\s*=\s*'none'/, 'the page lock must not disable the sheet touch surface');
  assert.match(modal, /touch-pan-y/, 'the form body must explicitly allow vertical touch scrolling');

  const inventory = await readFile(join(sourceRoot, 'pages/landing/components/LandingInventory.tsx'), 'utf8');
  assert.doesNotMatch(inventory, /bg-white\/90 text-slate-700 opacity-0/, 'mobile save control must not depend on hover');
  assert.doesNotMatch(inventory, /bg-white\/90 text-slate-900 opacity-0/, 'mobile zoom control must not depend on hover');
});

test('shared page foundations keep actions, spacing, and form semantics consistent', async () => {
  const pageContainer = await readFile(join(sourceRoot, 'components/shared/PageContainer.tsx'), 'utf8');
  const pageHeader = await readFile(join(sourceRoot, 'components/shared/PageHeader.tsx'), 'utf8');
  const buttons = await readFile(join(sourceRoot, 'components/shared/Button.tsx'), 'utf8');
  const shell = await readFile(join(sourceRoot, 'app/shell/AppShell.tsx'), 'utf8');
  const forms = await readFile(join(sourceRoot, 'components/shared/FormField.tsx'), 'utf8');
  const deliveryPage = await readFile(join(sourceRoot, 'features/delivery-return/DeliveryReturnPage.tsx'), 'utf8');
  const deliveryModal = await readFile(join(sourceRoot, 'features/delivery-return/DeliveryReturnModal.tsx'), 'utf8');
  const customersPage = await readFile(join(sourceRoot, 'features/customers/CustomersPage.tsx'), 'utf8');
  const accessoriesPage = await readFile(join(sourceRoot, 'features/accessories/AccessoriesPage.tsx'), 'utf8');
  const preferencesPage = await readFile(join(sourceRoot, 'features/preferences/PreferencesPage.tsx'), 'utf8');
  const auditPage = await readFile(join(sourceRoot, 'features/audit/AuditLogPage.tsx'), 'utf8');
  const salesLedgerPage = await readFile(join(sourceRoot, 'features/dresses/SalesLedgerPage.tsx'), 'utf8');
  const dailyClosingPage = await readFile(join(sourceRoot, 'features/reports/DailyClosingPage.tsx'), 'utf8');
  const dataTable = await readFile(join(sourceRoot, 'components/shared/DataTable.tsx'), 'utf8');
  const customerDetailsPage = await readFile(join(sourceRoot, 'features/customers/CustomerDetailsPage.tsx'), 'utf8');
  const appRoutes = await readFile(join(sourceRoot, 'app/router/AppRoutes.tsx'), 'utf8');
  const conditionCapture = await readFile(join(sourceRoot, 'features/delivery-return/ConditionPhotoCapture.tsx'), 'utf8');
  const serviceQueue = await readFile(join(sourceRoot, 'features/service/ServiceQueuePage.tsx'), 'utf8');
  const serviceModal = await readFile(join(sourceRoot, 'features/service/CompleteServiceTaskModal.tsx'), 'utf8');

  assert.match(pageContainer, /safe-area-inset-bottom/);
  assert.match(pageHeader, /actions\?: ReactNode/);
  assert.match(pageHeader, /status\?: ReactNode/);
  assert.match(buttons, /aria-busy/);
  assert.match(buttons, /AMBER_FOCUS_RING_CLASS_NAME/);
  assert.match(shell, /<PageContainer>/);
  assert.match(forms, /<Button/);
  assert.match(forms, /type="submit"/);
  assert.match(deliveryPage, /actions=\{/);
  assert.match(deliveryPage, /مسح الفلاتر/);
  assert.match(deliveryModal, /loading=\{isSubmitting\}/);
  assert.match(deliveryModal, /SearchableSelect/);
  assert.match(customersPage, /actions=\{/);
  assert.match(accessoriesPage, /actions=\{/);
  assert.match(accessoriesPage, /<Button/);
  assert.match(preferencesPage, /aria-label="أقسام الإعدادات"/);
  assert.match(preferencesPage, /id="data-backup"/);
  assert.match(preferencesPage, /id="danger-zone"/);
  assert.match(auditPage, /<DataTable/);
  assert.match(auditPage, /مسح الفلاتر/);
  assert.match(salesLedgerPage, /actions=\{/);
  assert.match(dailyClosingPage, /idempotencyKey: submissionKey/);
  assert.match(dailyClosingPage, /loading=\{isClosing\}/);
  assert.match(dataTable, /md:hidden/);
  assert.match(dataTable, /hidden overflow-x-auto/);
  assert.match(dataTable, /priority\?: 'primary' \| 'secondary' \| 'optional'/);
  assert.match(customerDetailsPage, /CustomerConductPanel/);
  assert.match(customerDetailsPage, /MeasurementsPanel/);
  assert.match(customerDetailsPage, /سجل الحجوزات/);
  assert.match(appRoutes, /path="customers\/:id"/);
  assert.match(conditionCapture, /capture="environment"/);
  assert.match(conditionCapture, /اختيار صورة من الجهاز/);
  assert.match(conditionCapture, /بديل يدوي/);
  assert.match(serviceQueue, /<FilterBar>/);
  assert.match(serviceQueue, /مسح الفلاتر/);
  assert.match(serviceQueue, /<Button/);
  assert.match(serviceModal, /loading=\{isSubmitting\}/);

  const markup = renderToStaticMarkup(
    React.createElement(
      PageContainer,
      null,
      React.createElement(PageHeader, {
        eyebrow: 'المخزون',
        title: 'المخزون',
        status: React.createElement('span', null, 'جاهز'),
        actions: React.createElement(Button, { type: 'button', loading: true }, 'حفظ'),
      }),
    ),
  );
  assert.match(markup, /max-w-7xl/);
  assert.match(markup, /safe-area-inset-bottom/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /جاهز/);
});

test('the reservation modal is a real validated four-panel wizard', async () => {
  const modal = await readFile(join(sourceRoot, 'features/reservations/CreateReservationModal.tsx'), 'utf8');
  const page = await readFile(join(sourceRoot, 'features/reservations/ReservationsPage.tsx'), 'utf8');
  const summary = await readFile(join(sourceRoot, 'components/shared/ValidationSummary.tsx'), 'utf8');

  for (const step of [0, 1, 2, 3]) {
    assert.match(modal, new RegExp(`currentStep === ${step}`), `step ${step} needs its own panel`);
  }
  assert.match(modal, /trigger\('customerId', \{ shouldFocus: true \}\)/, 'customer selection must be validated before advancing');
  assert.match(modal, /\['pickupDate', 'pickupTime', 'returnDate', 'returnTime'\]/, 'the complete period must be validated before advancing');
  assert.match(modal, /returnDate <= pickupDate/, 'the wizard must reject a non-forward rental period');
  assert.match(modal, /superRefine/, 'cross-field date validation must also run on final submit');
  assert.match(modal, /if \(!hasSelectedLine\)/, 'the review step must not open without an item');
  assert.match(modal, /validateLineEntries/, 'line prices, duplicates, and missing items must be blocked before review');
  assert.match(modal, /focusFirstInvalid/, 'invalid submission must return focus to the first invalid control');
  assert.match(modal, /<ValidationSummary/, 'long-form errors need a visible summary as well as inline messages');
  assert.match(modal, /loading=\{isSubmitting\}/, 'the final action must expose the busy state');
  assert.match(page, /<FilterBar>/, 'reservation filters must use the shared filter region');
  assert.match(page, /updateFilters/, 'filter state must survive query-string navigation');
  assert.match(summary, /role="alert"/, 'the validation summary must be announced');
  assert.match(summary, /onSelect/, 'summary items must return the operator to the relevant step');
  assert.match(modal, />\s*السابق\s*</, 'the operator must be able to go back without losing entered data');
  assert.match(modal, />\s*التالي\s*</, 'the wizard needs an explicit forward action');
  assert.match(modal, /resetStep\(\)/, 'reopening the modal must start at the first step');
});

test('partial image uploads preserve result identity and use only successful public URLs', () => {
  const outcomes = [
    { sourceIndex: 0, result: null },
    {
      sourceIndex: 1,
      result: {
        path: 'dress-1/image.webp',
        publicUrl: 'https://cdn.example.com/dress-1/image.webp',
        bytes: 512,
      },
    },
  ];

  assert.deepEqual(getSuccessfulUploadUrls(outcomes), ['https://cdn.example.com/dress-1/image.webp']);
  assert.deepEqual(outcomes.map((outcome) => outcome.sourceIndex), [0, 1]);
});

test('Supabase rows never receive local base64 or executable image URLs', () => {
  assert.equal(getRemoteCatalogueImageUrl(['data:image/webp;base64,AAAA']), null);
  assert.equal(getRemoteCatalogueImageUrl(['javascript:alert(1)']), null);
  assert.equal(
    getRemoteCatalogueImageUrl([
      'data:image/webp;base64,AAAA',
      'https://cdn.example.com/catalogue/image.webp',
    ]),
    'https://cdn.example.com/catalogue/image.webp',
  );
});

test('catalogue image sync keeps the compressed local record as the failure fallback', async () => {
  const service = await readFile(join(sourceRoot, 'features/dresses/dress.service.ts'), 'utf8');
  const uploader = await readFile(join(sourceRoot, 'platform/images/supabaseImageUpload.ts'), 'utf8');

  assert.match(service, /publicImageUrls = getSuccessfulUploadUrls\(outcomes\)/);
  assert.match(service, /void syncDressImagesBestEffort\(newDress\)/, 'record and image sync must use one ordered task');
  assert.doesNotMatch(service, /void pushDressBestEffort\(newDress\)/, 'parallel create and image pushes can overwrite the public URL');
  assert.match(service, /The local compressed images stay intact and can be retried later/);
  assert.doesNotMatch(service, /results\.map\(\(r:/, 'a partial result must not overwrite the local image array');
  assert.match(uploader, /if \(!sessionData\.session\) return null/, 'anonymous uploads are forbidden by the storage policy');
  assert.match(uploader, /outcomes\.push\(\{ sourceIndex, result \}\)/, 'one outcome must be retained for every source image');
  assert.doesNotMatch(uploader, /no-explicit-any/, 'the adapter must not disable type safety');
});
