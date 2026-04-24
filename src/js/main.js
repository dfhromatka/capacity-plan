/* ── ENTRY POINT ─────────────────────────────────────────────── */

import Alpine from 'alpinejs';
import { registerStores } from './store.js';
import { registerComponents } from './components.js';
import { loadFromStorage } from './data.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { Storage, flushWriteQueue, restoreWriteQueue } from './storage.js';

registerStores(Alpine);
registerComponents(Alpine);

async function resolveCurrentUser() {
  try {
    const resp = await fetch('/.auth/me');
    if (!resp.ok) return;
    const { clientPrincipal } = await resp.json();
    if (clientPrincipal) {
      Storage.setCurrentUser(clientPrincipal.userDetails);
      Alpine.store('ui').currentUser = clientPrincipal.userDetails;
    }
  } catch { /* unauthenticated or local dev — identity unavailable */ }
}

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('offline', () => { Alpine.store('ui').saveStatus = 'offline'; });
  window.addEventListener('online',  () => {
    Alpine.store('ui').saveStatus = 'saved';
    flushWriteQueue();
  });

  if (new URLSearchParams(location.search).get('reset') === 'true') {
    Storage.clear();
    history.replaceState(null, '', location.pathname);
  }

  window.Alpine = Alpine;
  Alpine.start();

  queueMicrotask(async () => {
    try {
      await resolveCurrentUser();
      await loadFromStorage();
      restoreWriteQueue();
      if (navigator.onLine && Storage.getAdapter() === 'azure') flushWriteQueue();
    } catch (err) {
      console.error('App init failed:', err);
    } finally {
      initKeyboardShortcuts();
    }
  });
});
