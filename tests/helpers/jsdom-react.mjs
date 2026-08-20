/**
 * Shared jsdom + React render harness for DOM walkthrough suites.
 *
 * Order matters: react-dom decides at module evaluation time whether a DOM
 * exists (`canUseDOM`) and permanently picks its legacy event path otherwise
 * (which crashes on jsdom because elements lack `attachEvent`). Importing this
 * helper FIRST in a suite guarantees a real jsdom window/document exists
 * before react-dom's module body runs — the dynamic import below is the point.
 */
import { JSDOM } from 'jsdom';
import { act } from 'react';

const BASE_HTML = '<!doctype html><html lang="ar" dir="rtl"><body></body></html>';

const dom = new JSDOM(BASE_HTML, { url: 'https://lena.local/', pretendToBeVisual: true });

const GLOBAL_KEYS = [
  'window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event',
  'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent',
  'DocumentFragment', 'getComputedStyle', 'localStorage', 'self',
  'requestAnimationFrame', 'cancelAnimationFrame',
];

for (const key of GLOBAL_KEYS) {
  const value = key === 'self' ? dom.window : (dom.window[key] ?? dom.window);
  // defineProperty: several of these (e.g. navigator) are getter-only in Node 22.
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Only NOW is react-dom allowed to evaluate.
const { createRoot } = await import('react-dom/client');

const openRoots = new Set();

/**
 * Renders `element` into a fresh container, React-act flushed; returns
 * { container, unmount } where unmount also flushes through act.
 */
async function renderElement(element) {
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  openRoots.add(root);
  await act(async () => { root.render(element); });
  return {
    container,
    async unmount() {
      openRoots.delete(root);
      await act(async () => { root.unmount(); });
      container.remove();
    },
  };
}

/** Per-test reset: storage cleared, stray containers removed. */
function resetDomEnvironment() {
  dom.window.localStorage.clear();
  for (const stray of [...dom.window.document.body.children]) stray.remove();
}

export { act, createRoot, dom, renderElement, resetDomEnvironment };
