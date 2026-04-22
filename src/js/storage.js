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

  load() {
    if (this.adapter === 'localStorage') return this._loadFromLocalStorage();
    if (this.adapter === 'sharepoint')   return this._loadFromSharePoint();
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
    }
  },

  deleteRecord(type, id) {
    if (this.adapter === 'localStorage') {
      triggerAutoSave();
    } else if (this.adapter === 'sharepoint') {
      return this._deleteRecordFromSharePoint(type, id);
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
      } catch (error) {
        console.error('Failed to import data:', error);
        callback(null);
      }
    };
    reader.readAsText(file);
  }
};

/* ── AUTO-SAVE HELPER ───────────────────────────────────────── */

let _autoSaveTimeout = null;

export function triggerAutoSave() {
  clearTimeout(_autoSaveTimeout);
  _autoSaveTimeout = setTimeout(() => {
    Storage.save(_buildSavePayload());
  }, 500);
}

export function saveToStorage() {
  try {
    Storage.save(_buildSavePayload());
  } catch (error) {
    console.error('Save failed:', error);
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
      nextId:         s.nextId,
      nextEmpId:      s.nextEmpId,
      filterISM:      s.filterISM,
      filterIPM:      s.filterIPM,
      filterType:     s.filterType,
      filterLocation: s.filterLocation,
      groupBy:        s.groupBy,
      expandedGroups: s.expandedGroups,
      sortColumn:     s.sortColumn,
      sortDirection:  s.sortDirection,
      viewStartIndex:     s.viewStartIndex,
      showAvailCards:     s.showAvailCards,
      collapseAllEntries: s.collapseAllEntries,
      expandedInSummary:  s.expandedInSummary,
      showArchived:       s.showArchived,
      filterUtilization:  s.filterUtilization,
    },
    auditLog: getAuditLog(),
  };
}
