/* ── MODALS ───────────────────────────────────────────────────── */

import Alpine from 'alpinejs';

export function showEmpModal(empId) {
  Alpine.store('modal').open('empEdit', { empId: empId || null });
}

export function showConfirmModal(options) {
  Alpine.store('modal').open('confirm', {
    title:       options.title       || 'Confirm',
    message:     options.message     || 'Are you sure?',
    confirmText: options.confirmText || 'Confirm',
    cancelText:  options.cancelText  || 'Cancel',
    isDangerous: options.isDangerous || false,
    onConfirm:   options.onConfirm   || null,
    onCancel:    options.onCancel    || null
  });
}

export function closeModal() {
  Alpine.store('modal').close();
}
