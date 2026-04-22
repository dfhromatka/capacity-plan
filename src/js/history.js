/* ── MUTATION DISPATCHER ────────────────────────────────────── */

import { triggerAutoSave, Storage } from './storage.js';
import { makeAuditEntry } from './audit.js';
import { invalidateEmpStatsCache } from './data.js';

export function mutate(op, fn, meta = {}, save = null) {
  invalidateEmpStatsCache();
  fn();

  const saveSpec = typeof save === 'function' ? save() : save;
  if (saveSpec !== null && saveSpec !== undefined) {
    const specs = Array.isArray(saveSpec) ? saveSpec : [saveSpec];
    specs.forEach(spec => {
      if (spec.action === 'delete') {
        Storage.deleteRecord(spec.type, spec.id);
      } else {
        Storage.saveRecord(spec.type, spec.record);
      }
    });
  } else {
    triggerAutoSave();
  }

  // Audit trail — appends to plain module-level array in audit.js, no Alpine store involved
  makeAuditEntry(op, meta);
}
