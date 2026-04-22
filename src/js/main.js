/* ── ENTRY POINT ─────────────────────────────────────────────── */

import Alpine from 'alpinejs';
import { registerStores } from './store.js';
import { registerComponents } from './components.js';
import { loadFromStorage } from './data.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { Storage } from './storage.js';

registerStores(Alpine);
registerComponents(Alpine);

document.addEventListener('DOMContentLoaded', () => {
  if (new URLSearchParams(location.search).get('reset') === 'true') {
    Storage.clear();
    history.replaceState(null, '', location.pathname);
  }

  Alpine.start();
  queueMicrotask(() => {
    loadFromStorage();
    initKeyboardShortcuts();
  });
});
