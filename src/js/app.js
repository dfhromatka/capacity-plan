/* ── APP COORDINATOR ─────────────────────────────────────────── */

import { state, formatDateShort, getMonthKeyFromDate, monthIdxMap } from './data.js';
import { mutate } from './history.js';
import { showConfirmModal } from './modals.js';

/* ── SMART ALLOCATION LOGIC ──────────────────────────── */

export function checkEPSDAllocationPrompt(entry, oldEPSD, newEPSD) {
  const newMonthKey = getMonthKeyFromDate(newEPSD);
  const oldMonthKey = oldEPSD ? getMonthKeyFromDate(oldEPSD) : null;
  if (!newMonthKey) return;

  const newMonthIndex = monthIdxMap.get(newMonthKey) ?? -1;
  const oldMonthIndex = oldMonthKey ? (monthIdxMap.get(oldMonthKey) ?? -1) : -1;
  if (newMonthIndex === -1) return;

  if (oldMonthIndex === -1 || newMonthIndex < oldMonthIndex) {
    const hasAllocationsAfter = entry.days.slice(newMonthIndex + 1).some(d => d > 0);
    if (hasAllocationsAfter) {
      showConfirmModal({
        title: 'Clear Allocations After EPSD?',
        message: `EPSD is now ${formatDateShort(newEPSD)}.\n\nClear all allocations after this date?`,
        confirmText: 'Clear After EPSD', cancelText: 'Keep Allocations',
        onConfirm: () => {
          mutate('clearAllocationsAfterEpsd', () => {
            const s = Alpine.store('plan');
            s.entries = s.entries.map(e => e.id !== entry.id ? e : {
              ...e, days: e.days.map((d, i) => i > newMonthIndex ? 0 : d)
            });
          }, { entryId: entry.id, epsd: newEPSD }, { type: 'entry', record: entry });
        }
      });
    }
  } else if (oldMonthIndex !== -1 && newMonthIndex > oldMonthIndex) {
    let lastAllocationValue = 0;
    for (let i = oldMonthIndex; i >= 0; i--) {
      if (entry.days[i] > 0) { lastAllocationValue = entry.days[i]; break; }
    }
    if (lastAllocationValue > 0) {
      showConfirmModal({
        title: 'Extend Allocations Through EPSD?',
        message: `EPSD moved from ${formatDateShort(oldEPSD)} to ${formatDateShort(newEPSD)}.\n\nExtend allocations (${lastAllocationValue}d/month) through the new EPSD?`,
        confirmText: 'Extend Allocations', cancelText: 'Keep As Is',
        onConfirm: () => {
          mutate('extendAllocationsToEpsd', () => {
            const s = Alpine.store('plan');
            s.entries = s.entries.map(e => e.id !== entry.id ? e : {
              ...e, days: e.days.map((d, i) => (i > oldMonthIndex && i <= newMonthIndex) ? lastAllocationValue : d)
            });
          }, { entryId: entry.id, from: oldEPSD, to: newEPSD, daysPerMonth: lastAllocationValue },
            { type: 'entry', record: entry });
        }
      });
    }
  }
}
