/* ── STORAGE ABSTRACTION LAYER ────────────────────────────────────── */

import Alpine from 'alpinejs';
import { DATA_VERSION, positionalToKeyed } from './data.js';
import { showToast } from './toast.js';
import { getAuditLog } from './audit.js';

export const Storage = {
  adapter: 'localStorage',

  sharepoint: {
    siteUrl: '',
    listName: 'CapacityPlanData',
    itemId: 1
  },

  currentUser: null,

  /* ── CORE API ───────────────────────────────────────────── */

  save(data) {
    if (this.adapter === 'localStorage') return this._saveToLocalStorage(data);
    if (this.adapter === 'sharepoint')   return this._saveToSharePoint(data);
  },

  async load() {
    if (this.adapter === 'localStorage') return this._loadFromLocalStorage();
    if (this.adapter === 'sharepoint')   return this._loadFromSharePoint();
    if (this.adapter === 'azure')        return this._loadFromAzure();
    return null;
  },

  clear() {
    if (this.adapter === 'localStorage') {
      localStorage.removeItem('capacityPlanData');
    }
  },

  /* ── PER-ROW SAVE API ───────────────────────────────────── */
  //
  // Record type taxonomy:
  //   'entry'     → keyed by entry.id
  //   'employee'  → keyed by emp.id
  //   'month'     → keyed by month.key
  //   'settings'  → singleton
  //   'locations' → singleton
  //   'appState'  → singleton
  //   'auditLog'  → append-only (reserved, #1150)
  //
  // localStorage: saveRecord/deleteRecord fall back to full-blob save.
  // Remote adapters will upsert/delete individual rows.

  saveRecord(type, record) {
    if (this.adapter === 'localStorage') {
      triggerAutoSave();
    } else if (this.adapter === 'sharepoint') {
      return this._saveRecordToSharePoint(type, record);
    } else if (this.adapter === 'azure') {
      const id = record?.id ?? record?.key ?? 'singleton';
      _pendingWrites++;
      _setSaveStatus('saving');
      this._saveRecordToAzure(type, record)
        .then(() => { if (--_pendingWrites === 0) _setSaveStatus('saved'); })
        .catch(() => {
          _pendingWrites = Math.max(0, _pendingWrites - 1);
          _enqueue('save', type, id, record);
          _setSaveStatus('failed');
        });
    }
  },

  deleteRecord(type, id) {
    if (this.adapter === 'localStorage') {
      triggerAutoSave();
    } else if (this.adapter === 'sharepoint') {
      return this._deleteRecordFromSharePoint(type, id);
    } else if (this.adapter === 'azure') {
      _pendingWrites++;
      _setSaveStatus('saving');
      this._deleteRecordFromAzure(type, id)
        .then(() => { if (--_pendingWrites === 0) _setSaveStatus('saved'); })
        .catch(() => {
          _pendingWrites = Math.max(0, _pendingWrites - 1);
          _enqueue('delete', type, id, null);
          _setSaveStatus('failed');
        });
    }
  },

  loadAll() {
    return this.load();
  },

  setCurrentUser(name) {
    this.currentUser = name;
  },

  getAdapter() {
    return this.adapter;
  },

  setAdapter(adapterName) {
    if (['localStorage', 'sharepoint', 'azure'].includes(adapterName)) {
      this.adapter = adapterName;
      return true;
    }
    return false;
  },

  /* ── LOCALSTORAGE ADAPTER ───────────────────────────────── */

  _saveToLocalStorage(data) {
    try {
      localStorage.setItem('capacityPlanData', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        showToast('⚠️ Storage full — changes could not be saved. Export a backup to free space.', 5000);
      } else {
        showToast('⚠️ Could not save changes — storage may be unavailable.', 4000);
      }
      return false;
    }
  },

  _loadFromLocalStorage() {
    try {
      const serialized = localStorage.getItem('capacityPlanData');
      if (!serialized) return null;
      const data = JSON.parse(serialized);
      this._migrateData(data);
      return data;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      if (error.name === 'SecurityError') {
        showToast('⚠️ Storage is blocked — the app will run read-only until storage is re-enabled.', 5000);
      } else {
        showToast('⚠️ Could not load saved data.', 3000);
      }
      return null;
    }
  },

  _migrateData(data) {
    if (data.employees) {
      data.employees.forEach(emp => {
        if ('fte' in emp && !('availability' in emp)) {
          emp.availability = emp.fte;
          delete emp.fte;
        }
        if ('futurefte' in emp && !('futureAvailability' in emp)) {
          emp.futureAvailability = emp.futurefte;
          delete emp.futurefte;
        }
        if ('fteEffectiveDate' in emp && !('availabilityEffectiveDate' in emp)) {
          emp.availabilityEffectiveDate = emp.fteEffectiveDate;
          delete emp.fteEffectiveDate;
        }
      });
    }
    if (data.entries) {
      data.entries.forEach(entry => {
        if (!('ragStatus'  in entry)) entry.ragStatus  = null;
        if (!('epsd'       in entry)) entry.epsd       = null;
        if (!('projectUrl' in entry)) entry.projectUrl = null;
        if (!('budgetHours' in entry)) entry.budgetHours = null;
      });
    }
  },

  /* ── SHAREPOINT ADAPTER (stub) ──────────────────────────── */

  _saveToSharePoint: async function() {
    console.warn('SharePoint adapter not yet implemented');
    return false;
  },
  _loadFromSharePoint: async function() {
    console.warn('SharePoint adapter not yet implemented');
    return null;
  },
  _saveRecordToSharePoint: async function(type) {
    console.warn(`SharePoint saveRecord not yet implemented (type: ${type})`);
    return false;
  },
  _deleteRecordFromSharePoint: async function(type, id) {
    console.warn(`SharePoint deleteRecord not yet implemented (type: ${type}, id: ${id})`);
    return false;
  },

  /* ── AZURE ADAPTER ──────────────────────────────────────── */

  async _loadFromAzure() {
    const resp = await fetch('/api/records');
    if (!resp.ok) throw new Error(`Load failed: HTTP ${resp.status}`);
    const rows = await resp.json();
    return this._reconstructFromRows(rows);
  },

  _reconstructFromRows(rows) {
    // Rebuilds the blob shape that _buildSavePayload() produces so
    // loadFromStorage() can apply it to the store without changes.
    const out = {
      dataVersion:     DATA_VERSION,
      planSettings:    null,
      activeLocations: null,
      employees:       [],
      entries:         [],
      monthConfig:     {},
      state:           {},
      auditLog:        [],
    };
    for (const row of rows) {
      const parsed = JSON.parse(row.data);
      if      (row.type === 'employee')  out.employees.push(parsed);
      else if (row.type === 'entry')     out.entries.push(parsed);
      else if (row.type === 'month')     out.monthConfig[row.id] = parsed;
      else if (row.type === 'settings')  out.planSettings    = parsed;
      else if (row.type === 'locations') out.activeLocations = parsed;
      else if (row.type === 'appState')  out.state           = parsed;
      else if (row.type === 'auditLog')  out.auditLog        = Array.isArray(parsed) ? parsed : [];
    }
    return out;
  },

  async _saveRecordToAzure(type, record) {
    const id = record?.id ?? record?.key ?? 'singleton';
    const resp = await fetch(`/api/records/${type}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: record, updatedBy: this.currentUser ?? 'unknown' }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  },

  async _deleteRecordFromAzure(type, id) {
    const resp = await fetch(`/api/records/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!resp.ok && resp.status !== 404) throw new Error(`HTTP ${resp.status}`);
  },

  /* ── FILE UTILITIES ─────────────────────────────────────── */

  exportToFile(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `capacity-plan-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        callback(JSON.parse(e.target.result));
      } catch {
        callback(null);
      }
    };
    reader.onerror = () => callback(null);
    reader.onabort = () => callback(null);
    reader.readAsText(file);
  }
};

/* ── AUTO-SAVE HELPER ───────────────────────────────────────── */

let _autoSaveTimeout = null;
let _pendingWrites   = 0;
const _writeQueue    = []; // [{ action: 'save'|'delete', type, id, record }]

function _setSaveStatus(status) {
  const ui = Alpine.store?.('ui');
  // offline is only cleared by the window 'online' event, not by write results
  if (ui && ui.saveStatus !== 'offline') ui.saveStatus = status;
}

function _updatePendingCount() {
  const ui = Alpine.store?.('ui');
  if (ui) ui.pendingWriteCount = _writeQueue.length;
}

const _WQ_KEY = '_capacityPlanWriteQueue';

function _persistQueue() {
  try {
    if (_writeQueue.length > 0) localStorage.setItem(_WQ_KEY, JSON.stringify(_writeQueue));
    else                        localStorage.removeItem(_WQ_KEY);
  } catch { /* quota or unavailable — queue lives in memory only */ }
}

function _enqueue(action, type, id, record) {
  // Replace any existing pending op for the same type+id — latest always wins
  const idx = _writeQueue.findIndex(op => op.type === type && op.id === id);
  if (idx !== -1) _writeQueue.splice(idx, 1);
  _writeQueue.push({ action, type, id, record });
  _updatePendingCount();
  _persistQueue();
}

export function restoreWriteQueue() {
  try {
    const raw = localStorage.getItem(_WQ_KEY);
    if (!raw) return;
    const ops = JSON.parse(raw);
    if (Array.isArray(ops) && ops.length > 0) {
      _writeQueue.push(...ops);
      _updatePendingCount();
      _setSaveStatus('failed');
    }
  } catch { /* corrupted entry — ignore and start fresh */ }
}

export async function flushWriteQueue() {
  if (_writeQueue.length === 0) return;
  const batch = _writeQueue.splice(0);
  _updatePendingCount();
  _setSaveStatus('saving');
  const failed = [];
  for (const op of batch) {
    try {
      if (op.action === 'save') await Storage._saveRecordToAzure(op.type, op.record);
      else                      await Storage._deleteRecordFromAzure(op.type, op.id);
    } catch {
      failed.push(op);
    }
  }
  if (failed.length > 0) {
    _writeQueue.unshift(...failed); // preserve order, retry first
    _updatePendingCount();
    _persistQueue();
    _setSaveStatus('failed');
  } else {
    _persistQueue();
    _setSaveStatus(_pendingWrites === 0 ? 'saved' : 'saving');
  }
}

export function triggerAutoSave() {
  clearTimeout(_autoSaveTimeout);
  _setSaveStatus('saving');
  _autoSaveTimeout = setTimeout(() => {
    try {
      const ok = Storage.save(_buildSavePayload());
      _setSaveStatus(ok ? 'saved' : 'failed');
    } catch {
      _setSaveStatus('failed');
    }
  }, 500);
}

export function saveToStorage() {
  try {
    Storage.save(_buildSavePayload());
    _setSaveStatus('saved');
  } catch (err) {
    console.error('Save failed:', err);
    _setSaveStatus('failed');
  }
}

function _buildSavePayload() {
  const s = Alpine.store('plan');
  if (!s) return { dataVersion: DATA_VERSION };
  return {
    dataVersion:     DATA_VERSION,
    planSettings:    s.planSettings,
    activeLocations: s.activeLocations,
    employees:       s.employees,
    monthConfig:     s.monthConfig,
    entries: s.entries.map(e => {
      // Merge full history with current window so out-of-window allocations are preserved
      const allDays = { ...(e._allDays || {}) };
      s.months.forEach((m, i) => { allDays[m.key] = e.days[i] || 0; });
      const { _allDays, ...rest } = e;
      return { ...rest, days: allDays };
    }),
    state: {
      nextId:          s.nextId,
      nextEmpId:       s.nextEmpId,
      activeFilters:   s.activeFilters,
      filterRowsShown: s.filterRowsShown,
      groupBy:         s.groupBy,
      expandedGroups:  s.expandedGroups,
      sortColumn:      s.sortColumn,
      sortDirection:   s.sortDirection,
      viewStartIndex:  s.viewStartIndex,
      showAvailCards:  s.showAvailCards,
    },
    auditLog: getAuditLog(),
  };
}
