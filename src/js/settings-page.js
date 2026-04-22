/* ── SETTINGS PAGE ALPINE COMPONENT ─────────────────────────── */

import Alpine from 'alpinejs';
import { state } from './data.js';
import { mutate } from './history.js';
import { getAuditLog, clearAuditLog } from './audit.js';
import { triggerAutoSave, Storage, saveToStorage } from './storage.js';
import {
  exportEmployeesCsv, exportEntriesCsv,
  parseCapacityPlanCsv,
  downloadFile, buildErrorLog,
} from './csv.js';
import { showConfirmModal } from './modals.js';
import { getCountryByCode, getCountryFlag, ISO_COUNTRIES } from './countries.js';
import { loadFromStorage } from './data.js';

function _store() { return Alpine.store('plan'); }

export function settingsPage() {
  return {
    currentTab: 'plan-settings',
    expandedAvailability: {},
    locationDropdownOpen: false,
    locationSearch: '',
    localAuditLog: [],
    calendarExpandedYears: { [new Date().getFullYear()]: true },

    /* ── GETTERS ──────────────────────────────────────────────── */
    get employees()        { return _store().employees; },
    get months()           { return _store().months; },
    get activeLocations()  { return _store().activeLocations; },
    get planSettings()     { return _store().planSettings; },

    get activeLocationObjects() {
      return _store().activeLocations
        .map(code => getCountryByCode(code))
        .filter(Boolean);
    },

    get filteredCountries() {
      const q = this.locationSearch.toLowerCase();
      return ISO_COUNTRIES.filter(c =>
        !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      );
    },

    /* ── TAB SWITCHING ────────────────────────────────────────── */
    switchTab(name) {
      this.currentTab = name;
      if (name === 'history') this.localAuditLog = [...getAuditLog()].reverse();
    },

    /* ── TAB 0: PLAN SETTINGS ─────────────────────────────────── */
    updatePlanSetting(field, value) {
      mutate('updatePlanSetting', () => {
        const s = _store();
        s.planSettings = { ...s.planSettings, [field]: value };
        if (field === 'greenThreshold' || field === 'yellowThreshold') {
          if (s.planSettings.greenThreshold < s.planSettings.yellowThreshold) {
            s.planSettings = { ...s.planSettings, greenThreshold: s.planSettings.yellowThreshold };
          }
        }
      }, { field, value });
    },

    toggleLocation(code) {
      const s = _store();
      const idx = s.activeLocations.indexOf(code);
      if (idx === -1) {
        mutate('addLocation', () => {
          const ps = _store();
          ps.activeLocations = [...ps.activeLocations, code];
        }, { code });
      } else {
        if (s.activeLocations.length === 1) {
          alert('You must have at least one active location.');
          return;
        }
        mutate('removeLocation', () => {
          const ps = _store();
          ps.activeLocations = ps.activeLocations.filter(c => c !== code);
        }, { code });
      }
    },

    removeLocation(code) {
      const s = _store();
      if (s.activeLocations.length === 1) {
        alert('You must have at least one active location.');
        return;
      }
      const affected = s.employees.filter(e => e.location === code);
      if (affected.length > 0) {
        const country = getCountryByCode(code);
        const name = country ? country.name : code;
        alert(`Cannot remove ${name} — ${affected.length} employee(s) assigned. Please reassign them first.`);
        return;
      }
      mutate('removeLocation', () => {
        const ps = _store();
        ps.activeLocations = ps.activeLocations.filter(c => c !== code);
      }, { code });
    },

    isLocationActive(code) {
      return _store().activeLocations.includes(code);
    },

    countryFlag(code) { return getCountryFlag(code); },
    countryName(code) { const c = getCountryByCode(code); return c ? c.name : code; },

    /* ── TAB 1: EMPLOYEES ─────────────────────────────────────── */
    updateEmployeeField(empId, field, value) {
      mutate('updateEmployee', () => {
        const s = _store();
        s.employees = s.employees.map(e => e.id !== empId ? e : { ...e, [field]: value });
      }, { empId, field, value });
    },

    updateEmployeeAvailability(empId, value) {
      const num = parseFloat(value);
      if (isNaN(num) || num < 1 || num > 100) return;
      mutate('updateEmployee', () => {
        const s = _store();
        s.employees = s.employees.map(e => e.id !== empId ? e : { ...e, availability: num / 100 });
      }, { empId, field: 'availability', value: num / 100 });
    },

    toggleAvailabilityPanel(empId) {
      this.expandedAvailability = {
        ...this.expandedAvailability,
        [empId]: !this.expandedAvailability[empId]
      };
    },

    saveAvailabilityPlanning(empId, futureAvailPct, effectiveMonth, effectiveYear) {
      const hasFuture = futureAvailPct !== '' && futureAvailPct !== null && futureAvailPct !== undefined;
      const hasMonth  = !!effectiveMonth;
      const hasYear   = !!effectiveYear;

      if (hasFuture && !(hasMonth && hasYear)) {
        alert('Both month and year are required when future availability is specified.');
        return;
      }
      if (!hasFuture && (hasMonth || hasYear)) {
        alert('Future availability is required when effective date is specified.');
        return;
      }
      if ((hasMonth && !hasYear) || (!hasMonth && hasYear)) {
        alert('Please select both month and year.');
        return;
      }

      const futureAvail = hasFuture ? parseFloat(futureAvailPct) / 100 : null;
      const effectiveDate = (hasMonth && hasYear) ? `${effectiveYear}-${effectiveMonth}` : null;

      mutate('updateEmployee', () => {
        const s = _store();
        s.employees = s.employees.map(e => e.id !== empId ? e : {
          ...e, futureAvailability: futureAvail, availabilityEffectiveDate: effectiveDate
        });
      }, { empId });

      this.expandedAvailability = { ...this.expandedAvailability, [empId]: false };
    },

    clearAvailabilityPlanning(empId) {
      mutate('updateEmployee', () => {
        const s = _store();
        s.employees = s.employees.map(e => e.id !== empId ? e : {
          ...e, futureAvailability: null, availabilityEffectiveDate: null
        });
      }, { empId });
      this.expandedAvailability = { ...this.expandedAvailability, [empId]: false };
    },

    addEmployee() {
      mutate('addEmployee', () => {
        const s = _store();
        const id = 'emp' + s.nextEmpId++;
        const defaultLocation = s.activeLocations[0] || 'CZ';
        const cats = s.planSettings?.fixedCategories ?? [];
        const ohAllocations = Object.fromEntries(
          cats.map(cat => [cat.id, { days: cat.defaultDays, desc: '' }])
        );
        s.employees = [...s.employees, {
          id, name: '', ism: '', location: defaultLocation,
          ohAllocations,
          availability: 1.0, futureAvailability: null, availabilityEffectiveDate: null,
        }];
      }, {});
    },

    deleteEmployee(empId) {
      const s = _store();
      const emp = s.employees.find(e => e.id === empId);
      if (!emp) return;
      const relatedEntries = s.entries.filter(e => e.empId === empId);
      const msg = relatedEntries.length > 0
        ? `Delete ${emp.name || 'employee'} and their ${relatedEntries.length} allocation row(s)?`
        : `Delete ${emp.name || 'employee'}?`;
      showConfirmModal({
        title: 'Delete Employee', message: msg,
        confirmText: 'Delete', cancelText: 'Cancel', isDangerous: true,
        onConfirm: () => {
          mutate('deleteEmployee', () => {
            const ps = _store();
            ps.employees = ps.employees.filter(e => e.id !== empId);
            ps.entries   = ps.entries.filter(e => e.empId !== empId);
          }, { empId },
            [{ type: 'employee', action: 'delete', id: empId },
             ...relatedEntries.map(e => ({ type: 'entry', action: 'delete', id: e.id }))]);
        }
      });
    },

    empFlag(emp) {
      const country = getCountryByCode(emp.location);
      return country ? getCountryFlag(country.code) : '🏳️';
    },

    availButtonLabel(emp) {
      const cur = Math.round((emp.availability || 1) * 100);
      if (emp.futureAvailability != null && emp.availabilityEffectiveDate) {
        const fut = Math.round(emp.futureAvailability * 100);
        return `📋 (${cur}% → ${fut}%)`;
      }
      return '📋';
    },

    /* ── TAB 2: FIXED ALLOCATIONS ─────────────────────────────── */
    updateOhAllocation(empId, catId, field, rawValue) {
      const value = field === 'days' ? (parseFloat(rawValue) || 0) : rawValue;
      mutate('updateOhAllocation', () => {
        const s = _store();
        s.employees = s.employees.map(e => {
          if (e.id !== empId) return e;
          const existing = e.ohAllocations?.[catId] || { days: 0, desc: '' };
          return { ...e, ohAllocations: { ...e.ohAllocations, [catId]: { ...existing, [field]: value } } };
        });
      }, { empId, catId, field, value });
    },

    addFixedCategory() {
      mutate('addFixedCategory', () => {
        const s = _store();
        const id = 'cat-' + Date.now();
        const newCat = { id, name: 'New Category', defaultDays: 0 };
        s.planSettings = { ...s.planSettings, fixedCategories: [...(s.planSettings.fixedCategories || []), newCat] };
        s.employees = s.employees.map(e => ({
          ...e,
          ohAllocations: { ...(e.ohAllocations || {}), [id]: { days: newCat.defaultDays, desc: '' } }
        }));
      }, {});
    },

    renameFixedCategory(catId, name) {
      mutate('renameFixedCategory', () => {
        const s = _store();
        s.planSettings = {
          ...s.planSettings,
          fixedCategories: s.planSettings.fixedCategories.map(c => c.id !== catId ? c : { ...c, name })
        };
      }, { catId, name });
    },

    setFixedCategoryDefault(catId, rawDays) {
      const defaultDays = parseFloat(rawDays) || 0;
      mutate('setFixedCategoryDefault', () => {
        const s = _store();
        s.planSettings = {
          ...s.planSettings,
          fixedCategories: s.planSettings.fixedCategories.map(c => c.id !== catId ? c : { ...c, defaultDays })
        };
        s.employees = s.employees.map(e => ({
          ...e,
          ohAllocations: { ...(e.ohAllocations || {}), [catId]: { ...(e.ohAllocations?.[catId] || {}), days: defaultDays } }
        }));
      }, { catId, defaultDays });
    },

    deleteFixedCategory(catId) {
      const s = _store();
      const cat = s.planSettings.fixedCategories?.find(c => c.id === catId);
      if (!cat) return;
      const hasData = s.employees.some(e => (e.ohAllocations?.[catId]?.days || 0) > 0);
      const doDelete = () => {
        mutate('deleteFixedCategory', () => {
          const ps = _store();
          ps.planSettings = {
            ...ps.planSettings,
            fixedCategories: ps.planSettings.fixedCategories.filter(c => c.id !== catId)
          };
          ps.employees = ps.employees.map(e => {
            if (!e.ohAllocations) return e;
            const { [catId]: _removed, ...rest } = e.ohAllocations;
            return { ...e, ohAllocations: rest };
          });
        }, { catId, name: cat.name });
      };
      if (hasData) {
        showConfirmModal({
          title: 'Delete Category',
          message: `"${cat.name}" has non-zero days for some employees. Delete it and clear all their data for this category?`,
          confirmText: 'Delete', cancelText: 'Cancel', isDangerous: true,
          onConfirm: doDelete
        });
      } else {
        doDelete();
      }
    },

    /* ── TAB 3: CALENDAR ─────────────────────────────────────── */
    updateMonthWorkingDays(idx, value) {
      mutate('updateMonth', () => {
        const s = _store();
        const key = s.months[idx].key;
        const wd = parseFloat(value) || 0;
        s.months[idx].workingDays = wd;
        s.monthConfig = { ...s.monthConfig, [key]: { ...(s.monthConfig[key] || {}), workingDays: wd } };
      }, { monthIndex: idx, field: 'workingDays', value }, { type: 'month', record: _store().months[idx] });
    },

    updateMonthHoliday(idx, code, value) {
      mutate('updateMonth', () => {
        const s = _store();
        const key = s.months[idx].key;
        const hols = parseFloat(value) || 0;
        if (!s.months[idx].holidays) s.months[idx].holidays = {};
        s.months[idx].holidays[code] = hols;
        const existing = s.monthConfig[key] || {};
        s.monthConfig = { ...s.monthConfig, [key]: {
          ...existing,
          holidays: { ...(existing.holidays || {}), [code]: hols }
        }};
      }, { monthIndex: idx, code, value }, { type: 'month', record: _store().months[idx] });
    },

    getHolidays(month, code) {
      return (month.holidays && month.holidays[code] !== undefined) ? month.holidays[code] : 0;
    },

    get calendarYears() {
      return [...new Set(this.months.map(m => parseInt(m.key.slice(0, 4))))];
    },

    monthsForYear(year) {
      return this.months
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m.key.startsWith(String(year)));
    },

    /* ── DATA IMPORT / EXPORT ─────────────────────────────────── */
    exportData() {
      saveToStorage();
      const data = Storage.load();
      if (data) Storage.exportToFile(data);
    },

    importData(event) {
      const file = event.target.files[0];
      if (!file) return;
      Storage.importFromFile(file, (data) => {
        if (!data) {
          alert('Could not read the file. Please check it is a valid JSON backup.');
          return;
        }
        showConfirmModal({
          title: 'Import Data',
          message: 'This will replace all current plan data with the imported file. This cannot be undone.\n\nProceed with import?',
          confirmText: 'Import', cancelText: 'Cancel', isDangerous: true,
          onConfirm: () => {
            Storage._saveToLocalStorage(data);
            loadFromStorage();
          }
        });
        event.target.value = '';
      });
    },

    clearAllData() {
      showConfirmModal({
        title: 'Clear All Data',
        message: 'This will permanently delete all employees, allocations, and plan settings.\n\nThis cannot be undone. Consider exporting a backup first.',
        confirmText: 'Clear All', cancelText: 'Cancel', isDangerous: true,
        onConfirm: () => {
          Storage.clear();
          location.reload();
        }
      });
    },

    /* ── TAB 2b: CSV IMPORT / EXPORT ─────────────────────────── */

    exportEmployeesCsvHandler() {
      const s = Alpine.store('plan');
      const csv = exportEmployeesCsv(s.employees, s.planSettings?.fixedCategories ?? []);
      const date = new Date().toISOString().split('T')[0];
      downloadFile(`employees-${date}.csv`, csv, 'text/csv');
    },

    exportEntriesCsvHandler() {
      const s = Alpine.store('plan');
      const csv = exportEntriesCsv(s.entries, s.employees, s.months);
      const date = new Date().toISOString().split('T')[0];
      downloadFile(`entries-${date}.csv`, csv, 'text/csv');
    },

    importCapacityPlanCsvHandler(event) {
      const file = event.target.files[0];
      if (!file) return;
      event.target.value = '';
      const reader = new FileReader();
      reader.onload = (ev) => {
        const s = Alpine.store('plan');
        const { employees, entries, errors, skipped } = parseCapacityPlanCsv(ev.target.result, s.months);
        if (errors.length || employees.length === 0) {
          const allErrors = errors.length ? errors
            : ['No importable rows found. All rows were skipped or unrecognised.'];
          downloadFile(`import-errors-${file.name}.txt`, buildErrorLog(file.name, allErrors, skipped));
          return;
        }
        showConfirmModal({
          title: 'Import Capacity Plan',
          message: `Replace all current data with ${employees.length} employees and ${entries.length} entries from CSV?\n\nThis cannot be undone.`,
          confirmText: 'Import', cancelText: 'Cancel', isDangerous: true,
          onConfirm: () => {
            mutate('importCapacityPlanCsv', () => {
              s.employees = employees;
              s.entries   = entries;
              s.nextEmpId = employees.length + 1;
              s.nextId    = entries.length + 1;
            }, { empCount: employees.length, entryCount: entries.length });
            saveToStorage();
            location.reload();
          }
        });
      };
      reader.readAsText(file);
    },

    formatAuditTime(ts) {
      return new Date(ts).toLocaleString();
    },

    exportAuditLog() {
      const data = JSON.stringify(getAuditLog(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `capacity-plan-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    clearAuditLog() {
      showConfirmModal({
        title: 'Clear history',
        message: 'This permanently deletes all recorded history. Cannot be undone.',
        confirmText: 'Clear', cancelText: 'Cancel', isDangerous: true,
        onConfirm: () => { clearAuditLog(); this.localAuditLog = []; triggerAutoSave(); }
      });
    }
  };
}
