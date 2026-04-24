/* ── AUDIT TRAIL ──────────────────────────────────────────────── */

import { Storage } from './storage.js';

export const MAX_AUDIT_ENTRIES = 50;

let _log = [];

export function initAuditLog(entries) {
  _log = Array.isArray(entries) ? [...entries] : [];
}

export function getAuditLog() {
  return _log;
}

export function clearAuditLog() {
  _log = [];
}

/* ── OP → HUMAN LABEL MAP ────────────────────────────────────── */

const OP_LABELS = {
  saveEntry:                 ['Edited row',            m => m.project],
  addEntry:                  ['Added row',             m => m.project || '(new)'],
  archiveEntry:              ['Archived row',          m => m.project],
  unarchiveEntry:            ['Restored row',          m => m.project],
  insertEntryAfter:          ['Inserted row',          m => '(after entry ' + m.afterEntryId + ')'],
  addEmployee:               ['Added employee',        m => m.name],
  updateEmployee:            ['Updated employee',      m => m.name],
  deleteEmployee:            ['Deleted employee',      m => m.name],
  cycleRag:                  ['Changed RAG status',    m => m.project || String(m.entryId)],
  updateFixedAllocationDesc: ['Updated description',   m => m.catId],
  updatePlanSetting:         ['Updated plan setting',  m => m.field],
  updateMonth:               ['Updated month',         m => m.key],
  addLocation:               ['Added location',        m => m.code],
  removeLocation:            ['Removed location',      m => m.code],
  clearAllocationsAfterEpsd: ['Cleared allocations',   m => m.project],
  extendAllocationsToEpsd:   ['Extended allocations',  m => m.project],
  autoFillAllocations:       ['Auto-filled allocations', m => '(' + m.daysPerMonth + 'd/mo × ' + m.months + ' months)'],
};

/* ── CAPTURE ─────────────────────────────────────────────────── */

export function makeAuditEntry(op, meta) {
  const [label, getDetail] = OP_LABELS[op] ?? ['Changed', () => op];
  const entry = {
    id:        Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    op,
    label,
    detail:    String(getDetail(meta) ?? ''),
    user:      Storage.currentUser || 'local',
    timestamp: Date.now(),
  };
  _log = [..._log.slice(-(MAX_AUDIT_ENTRIES - 1)), entry];
}
