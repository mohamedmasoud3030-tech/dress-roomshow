/**
 * The front door.
 *
 * A customer who types the shop's address must be shown the boutique, not a
 * staff login form, while a signed-in member of the showroom still lands on
 * the dashboard at that same address. The behaviour check runs the real route
 * tree under jsdom; the contract check keeps the wiring from drifting.
 */
import { act, dom, renderElement, resetDomEnvironment } from './helpers/jsdom-react.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '../src/features/auth/AuthContext.tsx';
import { AppRoutes } from '../src/app/router/AppRoutes.tsx';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

test('front door — a visitor on the bare address is shown the boutique, not the login form', async () => {
  resetDomEnvironment();

  const view = await renderElement(
    createElement(
      AuthProvider,
      null,
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(AppRoutes)),
    ),
  );

  try {
    // Lazy routes and the auth probe both settle asynchronously.
    for (let i = 0; i < 40; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }

    const text = view.container.textContent ?? '';
    assert.match(text, /اختاري إطلالتك من المعرض/, 'the boutique hero is what a customer sees');
    assert.doesNotMatch(text, /تسجيل الدخول لإدارة المعرض/, 'the staff login form stays out of her way');

    const staffEntry = [...view.container.querySelectorAll('a')].some(
      (anchor) => anchor.getAttribute('href') === '/login',
    );
    assert.ok(staffEntry, 'the boutique still offers the showroom a way in');
  } finally {
    await view.unmount();
  }
});

test('front door — the route tree keeps the dashboard under the gate and the old addresses', async () => {
  const routes = await readFile(join(repositoryRoot, 'src/app/router/AppRoutes.tsx'), 'utf8');
  const gate = await readFile(join(repositoryRoot, 'src/app/router/RootGate.tsx'), 'utf8');

  assert.match(routes, /<Route path="\/" element={<RootGate \/>}>/, 'the bare address is handled by the gate');
  assert.match(routes, /<Route index element={<DashboardWithClosingAlertPage \/>} \/>/, 'the dashboard still lives at "/"');
  assert.match(routes, /path="\/landing"/, 'the boutique keeps its own address');
  assert.match(routes, /path="\/login"/, 'the staff login keeps its own address');

  assert.match(gate, /status !== 'signed-in'/, 'visitors are treated as customers');
  assert.match(gate, /to="\/landing"/, 'customers are sent to the boutique');
  assert.match(gate, /<RequireAuth>/, 'staff still pass through the auth gate');
  assert.match(gate, /<CloudDataGate>/, 'staff still wait for the cloud data gate');
});

test('front door — the boutique footer carries a discreet way in for the showroom', async () => {
  const footer = await readFile(
    join(repositoryRoot, 'src/pages/landing/components/LandingFooter.tsx'),
    'utf8',
  );

  assert.match(footer, /href="\/login"/, 'staff can reach the login from the boutique');
  assert.match(footer, /دخول إدارة المعرض/);
  assert.ok(dom, 'jsdom harness is available');
});
