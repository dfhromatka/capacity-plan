/* ── KEYBOARD SHORTCUTS ──────────────────────────────────────── */
// Permitted Alpine exception: global shortcuts have no Alpine element.

import { showToast } from './toast.js';

export function initKeyboardShortcuts() {
  document.addEventListener('keydown', _handleGlobalKeyboard);
}

function _handleGlobalKeyboard(e) {
  const isInInput = e.target.tagName === 'INPUT'    ||
                    e.target.tagName === 'TEXTAREA'  ||
                    e.target.tagName === 'SELECT'    ||
                    e.target.isContentEditable;

  if (e.ctrlKey && e.key === 'f' && !isInInput) {
    e.preventDefault();
    _focusFilters();
    return;
  }

  if (e.ctrlKey && e.key === ',' && !isInInput) {
    e.preventDefault();
    window.location.href = 'settings.html';
    return;
  }

  if (e.shiftKey && e.key === '?' && !isInInput) {
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
