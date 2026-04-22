/* ── APP COORDINATOR ─────────────────────────────────────────── */

import { state, formatDateShort, getMonthKeyFromDate, monthIdxMap } from './data.js';
import { mutate } from './history.js';
import { showConfirmModal } from './modals.js';
import Alpine from 'alpinejs';

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

/* ── BUDGET VALIDATION ───────────────────────────────────── */

export function checkBudgetAllocationPrompt(entry) {
  if (entry.type !== 'Project') return;
  if (entry.budgetHours == null) return;

  const tolerancePct = Alpine.store('plan').planSettings.budgetTolerancePct ?? 10;
  if (tolerancePct < 0) return;  // -1 = feature disabled

  const budgetDays = entry.budgetHours / 8;
  let title, message;

  if (entry.epsd) {
    const epsdMonthKey = getMonthKeyFromDate(entry.epsd);
    const epsdIdx = epsdMonthKey ? (monthIdxMap.get(epsdMonthKey) ?? -1) : -1;
    if (epsdIdx === -1) return;

    const committedDays = entry.days.slice(0, epsdIdx + 1).reduce((s, d) => s + d, 0);
    const delta = committedDays - budgetDays;
    if (Math.abs(delta / budgetDays) < tolerancePct / 100) return;

    if (delta > 0) {
      title = 'Over Budget';
      message = `${entry.project} is over budget by ${Math.round(delta)}d `
        + `(${committedDays}d committed vs ${budgetDays.toFixed(1)}d budget before EPSD).\n\n`
        + `Review allocations or update the project budget.`;
    } else {
      title = 'Under Budget';
      message = `${entry.project} has ${Math.round(-delta)}d of budget unallocated before EPSD `
        + `(${committedDays}d committed vs ${budgetDays.toFixed(1)}d budget).\n\n`
        + `Consider adding allocations or adjusting the budget.`;
    }
  } else {
    const lastIdx = entry.days.reduceRight((found, d, i) => found !== -1 ? found : (d > 0 ? i : -1), -1);
    if (lastIdx === -1) return;

    const committedDays = entry.days.reduce((s, d) => s + d, 0);
    const delta = committedDays - budgetDays;
    if (Math.abs(delta / budgetDays) < tolerancePct / 100) return;

    const lastMonth = state.months[lastIdx];
    if (delta > 0) {
      title = 'Over Budget';
      message = `${entry.project} is over budget by ${Math.round(delta)}d `
        + `(${committedDays}d committed vs ${budgetDays.toFixed(1)}d budget, `
        + `last allocation in ${lastMonth?.short ?? '?'}).\n\n`
        + `Consider setting an EPSD or reviewing allocations.`;
    } else {
      title = 'Under Budget';
      message = `${entry.project} has ${Math.round(-delta)}d of budget unallocated `
        + `(${committedDays}d committed vs ${budgetDays.toFixed(1)}d budget, `
        + `last allocation in ${lastMonth?.short ?? '?'}).`;
    }
  }

  showConfirmModal({ title, message, confirmText: 'OK', isDangerous: false });
}

