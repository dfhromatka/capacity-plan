/* ── TOAST NOTIFICATIONS ────────────────────────────────────────── */

let _toastTimeout = null;

export function showToast(message, duration = 2000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  container.textContent = message;
  container.classList.add('is-visible');

  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => {
    container.classList.remove('is-visible');
  }, duration);
}
