import test from 'node:test';
import { readSource } from './helpers/readSource.mjs';
import assert from 'node:assert/strict';

/**
 * UX-M4 — the phone landing must reach the first dress card quickly.
 *
 * There is no browser in this environment, so the claim is proven two ways:
 *  1. a source contract that pins the mobile-only classes (and their `sm:`
 *     counterparts, which is what keeps the desktop layout unchanged);
 *  2. an explicit height budget computed from those pinned classes at 390 px
 *     wide, asserted against the roadmap's "within 2 viewport heights".
 *
 * The budget is a model of the layout, not a device capture. The real capture
 * at 390×844 and 360×740 is still queue item 4.02 and is not claimed here.
 */

const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;
/** Horizontal page padding on the landing (`px-6`) on both sides. */
const PAGE_PADDING = 24 * 2;
const CONTENT_WIDTH = VIEWPORT_WIDTH - PAGE_PADDING;

/** Mobile height of every section that sits above the first dress card. */
const HERO_COPY =
  72 // pt-[72px] under the fixed header
  + 16 // mt-4 on the h1
  + 67 // two h1 lines at 32px / 1.05 leading
  + 16 // mt-4 on the description
  + 66 // three description lines at 13px / 1.7
  + 20 // mt-5 above the buttons
  + 36 // h-9 buttons
  + 24; // pb-6
const HERO_VISUAL = 20 + 20 + Math.min(300, Math.floor((CONTENT_WIDTH * 3) / 4)); // py-5 + aspect-[4/3] capped at max-h-[300px]
const VALUE_STRIP = 12 + 12 + 14 + 14 + 8; // py-3 plus two wrapped rows of 11px copy
const CATEGORIES = 32 + 32 + 20 + 16 + Math.floor((CONTENT_WIDTH * 0.44 * 5) / 4) + 2; // py-8 + header + mt-4 + one 44%-wide 4/5 tile
const NEW_ARRIVALS = 32 + 32 + 20 + 16 + Math.floor((CONTENT_WIDTH * 0.44 * 4) / 3) + 62; // py-8 + header + mt-4 + 3/4 photo + caption block
const INVENTORY_TOP = 32 + 16 + 12 + 72 + 30; // py-8 + heading row + two wrapped filter rows + chip row

const MOBILE_TOTAL = HERO_COPY + HERO_VISUAL + VALUE_STRIP + CATEGORIES + NEW_ARRIVALS + INVENTORY_TOP;
const BUDGET = VIEWPORT_HEIGHT * 2;

test('the first dress card sits inside two phone viewport heights', () => {
  assert.ok(
    MOBILE_TOTAL <= BUDGET,
    `the phone landing spends ${MOBILE_TOTAL}px before the first card; the budget is ${BUDGET}px (2 × ${VIEWPORT_HEIGHT})`,
  );
  // Headroom is asserted too: a section that grows back must fail here rather
  // than silently eating the margin until it breaks on a shorter phone.
  assert.ok(
    BUDGET - MOBILE_TOTAL >= 100,
    `only ${BUDGET - MOBILE_TOTAL}px of headroom remains; tighten a section before adding height`,
  );
});

test('the budget model would have rejected the pre-UX-M4 layout', () => {
  // Proof the model can fail: the old hero (portrait crop, taller copy) and the
  // old two-column category grid, with everything else identical.
  const previousHeroCopy = 88 + 20 + 67 + 16 + 66 + 28 + 36 + 40;
  const previousHeroVisual = 32 + 32 + Math.floor((CONTENT_WIDTH * 5) / 4);
  const previousCategories = 32 + 32 + 20 + 16 + 4 * (Math.floor((CONTENT_WIDTH / 2 * 5) / 4)) + 2;
  const previousTotal =
    previousHeroCopy + previousHeroVisual + VALUE_STRIP + previousCategories + NEW_ARRIVALS + INVENTORY_TOP;

  assert.ok(previousTotal > BUDGET, 'the model must reject the layout it replaced');
  assert.ok(MOBILE_TOTAL < previousTotal, 'the change must actually save height');
});

test('the phone hero is capped and the desktop hero is untouched', async () => {
  const hero = await readSource('src/pages/landing/components/LandingHero.tsx');

  assert.match(hero, /pt-\[72px\][^"]*sm:pt-\[96px\]/, 'the tighter top padding is phone-only');
  assert.match(hero, /pb-6[^"]*sm:pb-12/, 'the tighter bottom padding is phone-only');
  assert.match(hero, /aspect-\[4\/3\][^"]*sm:aspect-\[4\/5\]/, 'the portrait crop is restored from sm up');
  assert.match(hero, /max-h-\[300px\][^"]*sm:max-h-none/, 'the height cap is phone-only');
  assert.match(hero, /py-5[^"]*sm:py-8/, 'the visual padding is phone-only');
});

test('phone categories are one swipeable row, and stay a grid from sm up', async () => {
  const categories = await readSource('src/pages/landing/components/LandingCategories.tsx');

  assert.match(categories, /flex gap-px overflow-x-auto/, 'phones get a horizontal rail');
  assert.match(categories, /sm:grid sm:grid-cols-4 lg:grid-cols-8/, 'the original grid returns from sm up');
  assert.match(categories, /w-\[44%\] shrink-0[^"]*sm:w-auto/, 'tiles keep a phone width and give it back on desktop');
  assert.doesNotMatch(categories, /grid grid-cols-2/, 'the two-column phone wall is gone');
  assert.match(categories, /aria-label="فئات المعروض"/, 'the rail is named for assistive tech');
});

test('the phone FAQ starts collapsed and shows two answers', async () => {
  const faq = await readSource('src/pages/landing/components/LandingFaq.tsx');

  assert.match(faq, /MOBILE_VISIBLE_QUESTIONS = 2/, 'a phone shows two answers, not three');
  assert.match(faq, /hidden sm:block/, 'the third answer is phone-hidden and desktop-visible');
  assert.match(faq, /matchMedia\('\(max-width: 639px\)'\)/, 'the collapse follows the same breakpoint as Tailwind sm');
  assert.match(faq, /typeof window === 'undefined'/, 'the breakpoint probe survives a non-browser runtime');
  assert.match(faq, /startsWithCollapsed|startsCollapsed\(\) \? null : 0/, 'desktop still opens its first answer');
});

test('the about section tightens on phones only', async () => {
  const about = await readSource('src/pages/landing/components/LandingAboutServices.tsx');

  assert.match(about, /py-8 sm:py-12/, 'section padding is phone-only tighter');
  assert.match(about, /py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-8/, 'the inner block keeps its desktop rhythm');
});
