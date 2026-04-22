/* ── SETTINGS ENTRY POINT ───────────────────────────────────── */

import Alpine from 'alpinejs';
import { settingsPage } from './settings-page.js';
import { loadFromStorage } from './data.js';
import { registerStores } from './store.js';

registerStores(Alpine);

Alpine.data('settingsPage', settingsPage);

document.addEventListener('DOMContentLoaded', () => {
  Alpine.start();
  queueMicrotask(() => {
    loadFromStorage();
  });
});
