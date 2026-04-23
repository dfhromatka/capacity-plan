/* ── SETTINGS ENTRY POINT ───────────────────────────────────── */

import Alpine from 'alpinejs';
import { settingsPage } from './settings-page.js';
import { loadFromStorage } from './data.js';
import { registerStores } from './store.js';

registerStores(Alpine);

Alpine.data('settingsPage', () => {
  const page = settingsPage();
  const tab = new URLSearchParams(location.search).get('tab');
  if (tab) page.currentTab = tab;
  return page;
});

document.addEventListener('DOMContentLoaded', () => {
  Alpine.start();
  queueMicrotask(() => {
    loadFromStorage();
  });
});
