/* ── ENTRY POINT ─────────────────────────────────────────────── */

import Alpine from 'alpinejs';
import { registerStores } from './store.js';
import { registerComponents } from './components.js';
import { loadFromStorage } from './data.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { Storage } from './storage.js';

registerStores(Alpine);
registerComponents(Alpine);

async function resolveCurrentUser() {
  try {
    const resp = await fetch('/.auth/me');
    const { clientPrincipal } = await resp.json();
    if (clientPrincipal) Storage.setCurrentUser(clientPrincipal.userDetails);
  } catch { /* unauthenticated or local dev — identity unavailable */ }
}

document.addEventListener('DOMContentLoaded', () => {
  if (new URLSearchParams(location.search).get('reset') === 'true') {
    Storage.clear();
    history.replaceState(null, '', location.pathname);
  }

  Alpine.start();
  queueMicrotask(async () => {
    await resolveCurrentUser();
    await loadFromStorage();
    initKeyboardShortcuts();
  });
});
