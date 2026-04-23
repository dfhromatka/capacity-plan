/* ── KEYBOARD SHORTCUTS ──────────────────────────────────────── */
// Permitted Alpine exception: global shortcuts have no Alpine element.

import { showToast } from './toast.js';
import Alpine from 'alpinejs';

export function initKeyboardShortcuts() {
  document.addEventListener('keydown', _handleGlobalKeyboard);
}

function _handleGlobalKeyboard(e) {
  const isInInput = e.target.tagName === 'INPUT'    ||
                    e.target.tagName === 'TEXTAREA'  ||
                    e.target.tagName === 'SELECT'    ||
                    e.target.isContentEditable;

  // Escape always cancels inline edit, even when an input inside the row has focus.
  // The row @keydown handler doesn't reliably catch Escape from date inputs (browser
  // consumes it to close the date picker before it bubbles).
  if (e.key === 'Escape') {
    const editingRowId = Alpine.store('ui').editingRowId;
    if (editingRowId) {
      e.preventDefault();
      if (typeof editingRowId === 'string' && editingRowId.startsWith('temp-')) {
        Alpine.store('plan').entries = Alpine.store('plan').entries.filter(en => en.id !== editingRowId);
      }
      Alpine.store('ui').editingRowId = null;
      return;
    }
  }

  if (isInInput) return;

  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    _focusFilters();
    return;
  }

  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    window.location.href = 'settings.html';
    return;
  }

  if (e.shiftKey && e.key === '?') {
    e.preventDefault();
    Alpine.store('ui').showKeyboardHelp = true;
    return;
  }
}

function _focusFilters() {
  const filterBtn = document.querySelector('.filter-dropdown .filter-btn');
  if (filterBtn) {
    filterBtn.focus();
    showToast('Filter focused — press Space or Enter to open', 2000);
  }
}
