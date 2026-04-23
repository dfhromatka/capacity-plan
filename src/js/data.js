/* ── DATA & STATE MANAGEMENT ──────────────────────────────────────── */

import Alpine from 'alpinejs';
import { getCountryByCode, getCountryFlag } from './countries.js';
import { Storage } from './storage.js';
import { initAuditLog } from './audit.js';

/* ── MONTH GENERATION ───────────────────────────────────────── */

export const DATA_VERSION = 5;

// V4 epoch keys — used only when migrating old localStorage data
const V4_KEYS = [
  '2025-12','2026-01','2026-02','2026-03','2026-04','2026-05',
  '2026-06','2026-07','2026-08','2026-09','2026-10','2026-11',
  '2026-12','2027-01',
];

function countWeekdays(year, month) {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// Total months in the scrollable pool: 12 back + current + 23 forward = 36
export const POOL_SIZE = 36;
export const POOL_BACK = 12;   // months before today included in the pool
export const MONTHS_VISIBLE = 13; // always show exactly 13 months

export function generateMonths(monthConfig = {}) {
  const today = new Date();
  const months = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - POOL_BACK + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const cfg = monthConfig[key] || {};
    months.push({
      key,
      label: d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      short: d.toLocaleString('en-GB', { month: 'short' }).slice(0, 3) + '-' + String(y).slice(2),
      workingDays: cfg.workingDays ?? countWeekdays(y, m),
      holidays:    cfg.holidays   ?? {},
    });
  }
  return months;
}

// months is the live reference — updated by loadFromStorage
export const state = { months: generateMonths() };

// Fast key→index lookup; rebuilt whenever state.months changes (see rebuildMonthIdxMap)
export let monthIdxMap = new Map(state.months.map((m, i) => [m.key, i]));
export function rebuildMonthIdxMap() {
  monthIdxMap = new Map(state.months.map((m, i) => [m.key, i]));
}

/* ── DATE FORMATTING HELPERS ────────────────────────────────── */

export function formatDateShort(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}

export function getMonthKeyFromDate(dateString) {
  if (!dateString) return null;
  return dateString.substring(0, 7);
}

/* ── LOCATION HELPERS ───────────────────────────────────────── */

/* ── #1310: one-time migration from flat OH fields → ohAllocations ── */
const _DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Admin Time',           defaultDays: 3 },
  { id: 'cat-2', name: 'Training',             defaultDays: 1 },
  { id: 'cat-3', name: 'Internal Initiatives', defaultDays: 0 },
  { id: 'cat-4', name: 'CIP Support',          defaultDays: 0 },
  { id: 'cat-5', name: 'E&C Activity',         defaultDays: 0 },
];
const _LEGACY_FIELD_MAP = {
  'cat-1': ['adminDays',          'adminDesc'],
  'cat-2': ['trainingDays',       'trainingDesc'],
  'cat-3': ['internalInitiatives','internalInitiativesDesc'],
  'cat-4': ['cipSupport',         'cipSupportDesc'],
  'cat-5': ['encActivity',        'encActivityDesc'],
};

export function _migrateOhAllocations(s) {
  if (s.planSettings?.fixedCategories) return; // already migrated
  s.planSettings = { ...s.planSettings, fixedCategories: _DEFAULT_CATEGORIES };
  s.employees = s.employees.map(emp => {
    if (emp.ohAllocations) return emp; // already in new format
    const ohAllocations = {};
    for (const [id, [daysKey, descKey]] of Object.entries(_LEGACY_FIELD_MAP)) {
      ohAllocations[id] = { days: emp[daysKey] ?? 0, desc: emp[descKey] ?? '' };
    }
    const { adminDays, adminDesc, trainingDays, trainingDesc,
            internalInitiatives, internalInitiativesDesc,
            cipSupport, cipSupportDesc, encActivity, encActivityDesc, ...rest } = emp;
    return { ...rest, ohAllocations };
  });
}

export function migrateLocationToCode(location) {
  if (location === 'Prague') return 'CZ';
  if (location === 'France') return 'FR';
  if (location && location.length === 2) return location.toUpperCase();
  return 'CZ';
}

/* ── STORAGE ↔ RUNTIME CONVERSION ──────────────────────────── */

// Convert positional days array → key-indexed object for storage
export function positionalToKeyed(days, months) {
  const obj = {};
  months.forEach((m, i) => { if (days[i]) obj[m.key] = days[i]; });
  return obj;
}

// Convert key-indexed object → positional array for the current month window
function _keyedToPositional(keyedDays, months) {
  return months.map(m => keyedDays[m.key] || 0);
}

// Migrate v4 positional days array → key-indexed using the hardcoded epoch
function _v4DaysToKeyed(daysArr) {
  const obj = {};
  (daysArr || []).forEach((d, i) => { if (d) obj[V4_KEYS[i]] = d; });
  return obj;
}

/* ── LOAD DATA FROM STORAGE ─────────────────────────────────── */

export function loadFromStorage() {
  const stored = Storage.load();
  const s = Alpine.store('plan');

  const isV4 = stored && stored.dataVersion === 4;
  const isV5 = stored && stored.dataVersion === DATA_VERSION;
  // Treat any higher version as v5-compatible (forward-compat guard — never wipe data)
  const isFuture = stored && typeof stored.dataVersion === 'number' && stored.dataVersion > DATA_VERSION;

  if (stored && !isV4 && !isV5 && !isFuture) {
    console.warn(`Data version unrecognised (stored: ${stored.dataVersion ?? 'none'}, current: ${DATA_VERSION}). Loading defaults without clearing storage.`);
    return;
  }

  if (stored) {
    if (isFuture) {
      console.warn(`Stored data version (${stored.dataVersion}) is newer than code (${DATA_VERSION}). Loading best-effort.`);
    }
    // ── Plan settings
    const rawSettings = stored.planSettings || stored.projectSettings;
    if (rawSettings) {
      // Strip legacy horizon field — no longer used
      const { horizon: _h, ...settings } = rawSettings;
      s.planSettings = settings;
    }

    // ── Build monthConfig
    let monthConfig = {};
    if (isV5 && stored.monthConfig) {
      monthConfig = stored.monthConfig;
    } else if (isV4 && stored.months) {
      // Extract working days / holidays from the old positional array, keyed by v4 month keys
      stored.months.forEach((m, i) => {
        if (!m || !V4_KEYS[i]) return;
        const key = V4_KEYS[i];
        const hols = m.holidays || {};
        // Back-compat: old field names bhFR / bhPR
        if (m.bhFR !== undefined) hols['FR'] = m.bhFR;
        if (m.bhPR !== undefined) hols['CZ'] = m.bhPR;
        monthConfig[key] = { workingDays: m.workingDays, holidays: hols };
      });
    }

    // ── Regenerate full month pool and sync into state
    s.monthConfig = monthConfig;
    const months = generateMonths(monthConfig);
    s.months = months;
    state.months = months;
    rebuildMonthIdxMap();

    // ── Restore scroll position (default: POOL_BACK − 1 = index 11, i.e. one month before today)
    if (stored.state?.viewStartIndex !== undefined) {
      s.viewStartIndex = stored.state.viewStartIndex;
    }
    s._refreshVisibleMonths();

    if (stored.activeLocations) s.activeLocations = stored.activeLocations;

    if (stored.employees) {
      s.employees = stored.employees.map(emp =>
        (emp.location && (emp.location === 'Prague' || emp.location === 'France' || emp.location.length > 2))
          ? { ...emp, location: migrateLocationToCode(emp.location) }
          : emp
      );
      // #1310: migrate flat OH fields → ohAllocations if needed
      _migrateOhAllocations(s);
    }

    if (stored.entries) {
      s.entries = stored.entries.map(entry => {
        let keyedDays;
        if (isV4) {
          keyedDays = _v4DaysToKeyed(entry.days);
        } else {
          // v5: days is already key-indexed in storage
          keyedDays = entry.days && typeof entry.days === 'object' && !Array.isArray(entry.days)
            ? entry.days
            : _v4DaysToKeyed(entry.days); // fallback for malformed data
        }
        return { ...entry, days: _keyedToPositional(keyedDays, months), _allDays: keyedDays };
      });
    }

    if (stored.state) {
      if (stored.state.nextId !== undefined)            s.nextId         = stored.state.nextId;
      if (stored.state.nextEmpId !== undefined)         s.nextEmpId      = stored.state.nextEmpId;
      if (stored.state.filterISM !== undefined)         s.filterISM      = stored.state.filterISM;
      if (stored.state.filterIPM !== undefined)         s.filterIPM      = stored.state.filterIPM;
      if (stored.state.filterType !== undefined)        s.filterType     = stored.state.filterType;
      if (stored.state.filterLocation !== undefined)    s.filterLocation = stored.state.filterLocation;
      if (stored.state.groupBy !== undefined)           s.groupBy        = stored.state.groupBy;
      if (stored.state.expandedGroups !== undefined)    s.expandedGroups = stored.state.expandedGroups;
      if (stored.state.sortColumn !== undefined)        s.sortColumn     = stored.state.sortColumn;
      if (stored.state.sortDirection !== undefined)     s.sortDirection  = stored.state.sortDirection;
      if (stored.state.showAvailCards !== undefined)    s.showAvailCards      = stored.state.showAvailCards;
      if (stored.state.collapseAllEntries !== undefined) s.collapseAllEntries = stored.state.collapseAllEntries;
      if (stored.state.expandedInSummary  !== undefined) s.expandedInSummary  = stored.state.expandedInSummary;
      if (stored.state.showArchived       !== undefined) s.showArchived       = stored.state.showArchived;
      if (stored.state.filterUtilization  !== undefined) s.filterUtilization  = stored.state.filterUtilization;
    }
    if (Array.isArray(stored.auditLog)) initAuditLog(stored.auditLog);
    console.log(`Data loaded from storage (v${stored.dataVersion})`);
  } else {
    console.log('No stored data — starting with empty plan');
    s.nextId    = 1;
    s.nextEmpId = 1;
  }
  s._refreshVisibleMonths();
}

/* ── COMPUTED HELPERS ───────────────────────────────────────── */

// Per-render-cycle cache for empStats. Cleared by invalidateEmpStatsCache()
// which is called at the top of every mutate() so results are never stale.
let _empStatsCache = null;

export function invalidateEmpStatsCache() {
  _empStatsCache = null;
}

// Build a Map<empId, entry[]> from a flat entries array in a single O(n) pass.
// Used by buildTableData, buildCardData, chartData to avoid O(n²) filter loops.
export function buildEntriesByEmp(entries) {
  const map = new Map();
  for (const e of entries) {
    let list = map.get(e.empId);
    if (!list) { list = []; map.set(e.empId, list); }
    list.push(e);
  }
  return map;
}

export function bh(emp, mi) {
  const locationCode = emp.location || 'CZ';
  return state.months[mi].holidays[locationCode] || 0;
}

export function getEffectiveAvailability(emp, monthKey) {
  if (!emp.availabilityEffectiveDate || emp.futureAvailability === null || emp.futureAvailability === undefined) {
    return emp.availability || 1.0;
  }
  return monthKey < emp.availabilityEffectiveDate ? (emp.availability || 1.0) : emp.futureAvailability;
}

export function empStats(emp, mi, entriesByEmp) {
  if (!emp || mi < 0 || mi >= state.months.length) {
    return {bhDays: 0, oh: 0, alloc: 0, avail: 0, pct: 0, effectiveAvailability: 1.0};
  }
  if (!_empStatsCache) _empStatsCache = new Map();
  const cacheKey = `${emp.id}:${mi}`;
  if (_empStatsCache.has(cacheKey)) return _empStatsCache.get(cacheKey);

  const s = Alpine.store('plan');
  const bhDays = bh(emp, mi);
  const cats = s.planSettings?.fixedCategories ?? [];
  const ohAlloc = cats.reduce((sum, cat) => sum + ((emp.ohAllocations?.[cat.id]?.days) || 0), 0);
  const oh = bhDays + ohAlloc;
  const empList = entriesByEmp ? (entriesByEmp.get(emp.id) ?? []) : s.entries.filter(e => e.empId === emp.id);
  const alloc = empList.reduce((sum, e) => sum + (e.days[mi]||0), 0);
  const effectiveAvailability = getEffectiveAvailability(emp, state.months[mi].key);
  const baseAvail = state.months[mi].workingDays - oh;
  const avail = (baseAvail * effectiveAvailability) - alloc;
  const pct = state.months[mi].workingDays > 0 ? avail / state.months[mi].workingDays : 0;
  const result = {bhDays, oh, alloc, avail, pct, effectiveAvailability};
  _empStatsCache.set(cacheKey, result);
  return result;
}

export function empEntries(empId, entriesByEmp) {
  const s = Alpine.store('plan');
  let e = entriesByEmp ? (entriesByEmp.get(empId) ?? []) : s.entries.filter(x => x.empId === empId);
  if (s.filterType !== 'All') e = e.filter(x => x.type === s.filterType);
  if (!s.showArchived) {
    const vis = s.visibleMonths;
    const mi0 = monthIdxMap.get(vis[0]?.key);
    const editingId = Alpine.store('ui').editingRowId;
    e = e.filter(entry => {
      if (entry.archived) return false;
      if (entry.id === editingId) return true;   // always show the row being edited
      return entry.days.slice(mi0, mi0 + vis.length).some(d => d > 0);
    });
  }
  if (s.sortColumn) e = sortEntries(e, s.sortColumn, s.sortDirection);
  return e;
}

const _TYPE_RANK = { 'Project': 0, 'Other': 1, 'Absence': 2 };

export function sortEntries(entriesList, column, direction) {
  const sorted = [...entriesList];
  const mult = direction === 'asc' ? 1 : -1;
  sorted.sort((a, b) => {
    const rankA = _TYPE_RANK[a.type] ?? 99;
    const rankB = _TYPE_RANK[b.type] ?? 99;
    // For non-type columns: type grouping is always preserved regardless of direction
    if (column !== 'type' && rankA !== rankB) return rankA - rankB;
    let valA, valB;
    switch(column) {
      case 'type':    valA = rankA;                              valB = rankB;                              break;
      case 'project': valA = (a.project||'').toLowerCase();     valB = (b.project||'').toLowerCase();     break;
      case 'status':  valA = (a.status||'').toLowerCase();      valB = (b.status||'').toLowerCase();      break;
      case 'epsd': {
        // nulls always sort last regardless of direction
        if (!a.epsd && !b.epsd) return 0;
        if (!a.epsd) return 1;
        if (!b.epsd) return -1;
        valA = a.epsd; valB = b.epsd; break;
      }
      default: return 0;
    }
    if (valA < valB) return -1 * mult;
    if (valA > valB) return  1 * mult;
    return 0;
  });
  return sorted;
}

export function acls(pct) {
  if (typeof pct !== 'number' || isNaN(pct)) return 'avail-bad';
  const s = Alpine.store('plan');
  const green  = ((s ? s.planSettings.greenThreshold  : 20) || 20) / 100;
  const yellow = ((s ? s.planSettings.yellowThreshold : 10) || 10) / 100;
  if (pct >= green)  return 'avail-good';
  if (pct >= yellow) return 'avail-warn';
  return 'avail-bad';
}

export function cardStyle(pct) {
  if (typeof pct !== 'number' || isNaN(pct)) return {bg:'var(--color-danger-bg)',bd:'var(--color-danger-light)',tx:'var(--color-danger-dark)'};
  const s = Alpine.store('plan');
  const green  = ((s ? s.planSettings.greenThreshold  : 20) || 20) / 100;
  const yellow = ((s ? s.planSettings.yellowThreshold : 10) || 10) / 100;
  if (pct >= green)  return {bg:'var(--color-success-bg)',bd:'var(--color-success-light)',tx:'var(--color-success-dark)'};
  if (pct >= yellow) return {bg:'var(--color-warning-bg)',bd:'var(--color-warning-light)',tx:'var(--color-warning-dark)'};
  return {bg:'var(--color-danger-bg)',bd:'var(--color-danger-light)',tx:'var(--color-danger-dark)'};
}

export function getGroupedEmployees(employees, groupBy) {
  if (!groupBy || groupBy === 'None') {
    return [{ key: 'all', label: '', employees }];
  }
  const groups = {};
  employees.forEach(emp => {
    let groupKey, groupLabel;
    switch(groupBy) {
      case 'ISM':
        groupKey  = emp.ism || 'No ISM';
        groupLabel = emp.ism || 'No ISM';
        break;
      case 'Location': {
        groupKey = emp.location || 'Unknown';
        const country = getCountryByCode(emp.location);
        const flag    = country ? getCountryFlag(country.code) : '🏳️';
        const name    = country ? country.name : emp.location;
        groupLabel = `${flag} ${name}`;
        break;
      }
      default:
        groupKey  = 'all';
        groupLabel = '';
    }
    if (!groups[groupKey]) groups[groupKey] = { key: groupKey, label: groupLabel, employees: [] };
    groups[groupKey].employees.push(emp);
  });
  const groupsArray = Object.values(groups);
  groupsArray.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  return groupsArray;
}

export function getGroupStats(groupEmployees, visibleMonths) {
  if (!visibleMonths || !visibleMonths.length) return { count: groupEmployees.length, avgUtil: 0 };
  const firstMonthIndex = monthIdxMap.get(visibleMonths[0].key);
  let totalAvail = 0;
  let totalCapacity = 0;
  groupEmployees.forEach(emp => {
    const stats = empStats(emp, firstMonthIndex);
    const effectiveAvail = getEffectiveAvailability(emp, visibleMonths[0].key);
    totalCapacity += visibleMonths[0].workingDays * effectiveAvail;
    totalAvail    += stats.avail;
  });
  const avgUtil = totalCapacity > 0 ? ((totalCapacity - totalAvail) / totalCapacity) * 100 : 0;
  return { count: groupEmployees.length, avgUtil: Math.round(avgUtil) };
}
