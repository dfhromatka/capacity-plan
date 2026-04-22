/* ── ALPINE STORE ─────────────────────────────────────────────── */

import { state, generateMonths, MONTHS_VISIBLE, monthIdxMap } from './data.js';
import {
  empStats, getGroupedEmployees, getGroupStats,
  getEffectiveAvailability, empEntries, acls, bh, cardStyle, sortEntries,
  formatDateShort, getMonthKeyFromDate, buildEntriesByEmp
} from './data.js';import { getCountryByCode, getCountryFlag } from './countries.js';
import { triggerAutoSave, Storage } from './storage.js';
import { mutate } from './history.js';
import { showConfirmModal } from './modals.js';
import { initChart, resetChart } from './chart.js';

// chartData is now a reactive store getter — no manual render needed

/* ── MODULE-LEVEL BUILD HELPERS ──────────────────────────────── */

function buildCardData(store) {
  const vis = store.visibleEmployees;
  if (!vis.length) return [];
  const isSingle = vis.length === 1;
  const byEmp = buildEntriesByEmp(store.entries);
  return store.visibleMonths.map(m => {
    const i = monthIdxMap.get(m.key);
    let avail, pct;
    if (isSingle) {
      const s = empStats(vis[0], i, byEmp);
      avail = s.avail; pct = s.pct;
    } else {
      const totalWD = vis.length * m.workingDays;
      const totalAvail = vis.reduce((sum, emp) => sum + empStats(emp, i, byEmp).avail, 0);
      avail = totalAvail / vis.length;
      pct   = totalWD > 0 ? totalAvail / totalWD : 0;
    }
    const st   = cardStyle(pct);
    const sign = avail >= 0 ? '+' : '';
    return {
      key:        m.key,
      short:      m.short,
      availText:  sign + avail.toFixed(avail % 1 === 0 ? 0 : 1) + 'd',
      pctText:    (pct * 100).toFixed(0) + '% free',
      bg: st.bg, bd: st.bd, tx: st.tx
    };
  });
}

function buildTableData(store) {
  const vis = store.visibleEmployees;
  if (!vis.length) return { mthHeaders: [], rows: [] };

  const visMonths = store.visibleMonths;
  const isSingleEmp = vis.length === 1;
  const byEmp = buildEntriesByEmp(store.entries);

  const mthHeaders = visMonths.map(m => {
    const i = monthIdxMap.get(m.key);
    const totalWD    = vis.length * m.workingDays;
    const totalAlloc = vis.reduce((sum, emp) => {
      const s = empStats(emp, i, byEmp);
      return sum + s.oh + s.alloc;
    }, 0);
    const util      = totalWD > 0 ? Math.min(1, totalAlloc / totalWD) : 0;
    const utilColor = util > 0.9 ? '#ef4444' : util > 0.7 ? '#f59e0b' : '#22c55e';
    let daysLabel   = m.workingDays + 'd';
    if (isSingleEmp) {
      const ea  = getEffectiveAvailability(vis[0], m.key);
      const avd = m.workingDays * ea;
      daysLabel  = avd.toFixed(avd % 1 === 0 ? 0 : 1) + 'd';
    }
    return { key: m.key, short: m.short, daysLabel, utilPct: Math.round(util * 100), utilColor };
  });

  const rows = [];
  const grouped = getGroupedEmployees(vis, store.groupBy);

  grouped.forEach(group => {
    const isExpanded = store.groupBy === 'None' || store.expandedGroups[group.key] !== false;
    const groupStats = (store.groupBy !== 'None' && !isExpanded) ? getGroupStats(group.employees, visMonths) : null;

    if (store.groupBy !== 'None') {
      rows.push({ rowType: 'group', key: 'grp-' + group.key, groupKey: group.key, label: group.label, isExpanded, groupStats, mthCells: visMonths.map(m => ({ key: m.key })) });
    }

    group.employees.forEach(emp => {
      const country  = getCountryByCode(emp.location);
      const flag     = country ? getCountryFlag(country.code) : '🏳️';
      const firstMonthKey = visMonths[0]?.key || state.months[0].key;
      const ea       = getEffectiveAvailability(emp, firstMonthKey);
      const availPct = ea < 1.0 ? Math.round(ea * 100) : null;

      // Future availability badge: show when there is a pending change not yet in effect
      let futureAvailPct  = null;
      let futureAvailLabel = null;
      if (emp.futureAvailability != null && emp.availabilityEffectiveDate &&
          firstMonthKey < emp.availabilityEffectiveDate) {
        futureAvailPct = Math.round(emp.futureAvailability * 100);
        const [yr, mo] = emp.availabilityEffectiveDate.split('-');
        const monthName = new Date(Number(yr), Number(mo) - 1, 1)
          .toLocaleString('default', { month: 'short' });
        futureAvailLabel = futureAvailPct + '% from ' + monthName + ' ' + yr;
      }

      const availCells = visMonths.map(m => {
        const i = monthIdxMap.get(m.key);
        const s = empStats(emp, i, byEmp);
        return { key: m.key, sign: s.avail >= 0 ? '+' : '', avail: s.avail, pct: s.pct, cls: acls(s.pct) };
      });

      rows.push({ rowType: 'emp', key: 'emp-' + emp.id, groupKey: group.key, emp, flag, availPct, futureAvailPct, futureAvailLabel, availCells });

      rows.push({
        rowType: 'oh', key: 'bh-' + emp.id, groupKey: group.key,
        empId: emp.id, descField: null, icon: flag, label: 'Bank Holidays', daysPerMonth: null,
        cells: visMonths.map(m => { const i = monthIdxMap.get(m.key); return { key: m.key, val: bh(emp, i) }; })
      });
      const cats = store.planSettings?.fixedCategories ?? [];
      cats.forEach(cat => {
        const alloc = emp.ohAllocations?.[cat.id];
        const val = alloc?.days || 0;
        if (val > 0) rows.push({
          rowType: 'oh', key: cat.id + '-' + emp.id, groupKey: group.key,
          empId: emp.id, descField: cat.id, icon: '📋', label: cat.name,
          daysPerMonth: val,
          cells: visMonths.map(m => ({ key: m.key, val }))
        });
      });

      const visEntries = empEntries(emp.id, byEmp);
      visEntries.forEach(e => {
        const dayCells = visMonths.map(m => {
          const i = monthIdxMap.get(m.key);
          const d = e.days[i] || 0;
          const pct = state.months[i].workingDays > 0 ? Math.round(d / state.months[i].workingDays * 100) : 0;
          return { i, key: m.key, d, pct };
        });
        rows.push({ rowType: 'entry', key: 'entry-' + e.id, groupKey: group.key, ...e, ragStatus: e.ragStatus || 'null', epsdDisplay: e.epsd ? formatDateShort(e.epsd) : '—', dayCells });
      });

      if (visEntries.length > 0 || store.showArchived) {
        const empList = byEmp.get(emp.id) ?? [];
        const subCells = visMonths.map(m => {
          const i = monthIdxMap.get(m.key);
          const tot = empList.reduce((s, e) => s + (e.days[i] || 0), 0);
          return { key: m.key, tot };
        });
        rows.push({ rowType: 'sub', key: 'sub-' + emp.id, groupKey: group.key, empId: emp.id, empName: emp.name, subCells });
        rows.push({ rowType: 'addrow', key: 'add-' + emp.id, groupKey: group.key, empId: emp.id, empName: emp.name });
      }
    });
  });

  return { mthHeaders, rows };
}

export function registerStores(Alpine) {

  // ── PLAN STORE ─────────────────────────────────────────────
  Alpine.store('plan', {
    planSettings:    {
      planName: 'EMEA North – Capacity Plan',
      planDescription: '',
      yellowThreshold: 10,
      greenThreshold: 20,
      redThreshold: 0,
      fixedCategories: [
        { id: 'cat-1', name: 'Admin Time',           defaultDays: 3 },
        { id: 'cat-2', name: 'Training',             defaultDays: 1 },
        { id: 'cat-3', name: 'Internal Initiatives', defaultDays: 0 },
        { id: 'cat-4', name: 'CIP Support',          defaultDays: 0 },
        { id: 'cat-5', name: 'E&C Activity',         defaultDays: 0 },
      ],
    },
    activeLocations: ['CZ', 'FR', 'DE'],
    employees:       [],
    entries:         [],
    months:          state.months,
    monthConfig:     {},
    nextId:          1,
    nextEmpId:       1,
    filterISM:       'All',
    filterIPM:       'All',
    filterType:      'All',
    filterLocation:  'All',
    groupBy:         'None',
    expandedOH:      {},
    expandedGroups:  {},
    sortColumn:      null,
    sortDirection:   'asc',
    viewStartIndex: 11,   // index into months pool; default = one month before today
    visibleMonths:  [],   // maintained by _refreshVisibleMonths(); never set directly
    showAvailCards: true, // toggle: availability cards (true) vs. capacity chart (false)
    collapseAllEntries: true,
    expandedInSummary:  {},
    showArchived:       false,
    filterUtilization:  'All',

    // ── COMPUTED ───────────────────────────────────────────────
    _refreshVisibleMonths() {
      this.visibleMonths = this.months.slice(this.viewStartIndex, this.viewStartIndex + MONTHS_VISIBLE);
    },

    get canPanBack()    { return this.viewStartIndex > 0; },
    get canPanForward() { return this.viewStartIndex < this.months.length - MONTHS_VISIBLE; },

    get visibleEmployees() {
      let emps = this.employees;
      if (this.filterISM      !== 'All') emps = emps.filter(e => e.ism      === this.filterISM);
      if (this.filterIPM      !== 'All') emps = emps.filter(e => e.id       === this.filterIPM);
      if (this.filterLocation !== 'All') emps = emps.filter(e => e.location === this.filterLocation);
      if (this.filterUtilization !== 'All') {
        const vis = this.visibleMonths;
        const byEmp = buildEntriesByEmp(this.entries);
        emps = emps.filter(emp => {
          const totalUsed = vis.reduce((sum, m) => {
            const mi = monthIdxMap.get(m.key);
            const st = empStats(emp, mi, byEmp);
            return sum + st.oh + st.alloc;
          }, 0);
          const totalCap = vis.reduce((sum, m) => sum + (m.workingDays || 0), 0);
          const util = totalCap > 0 ? totalUsed / totalCap : 0;
          const overT  = 1 - (this.planSettings.yellowThreshold || 10) / 100;
          const underT = 1 - (this.planSettings.greenThreshold  || 20) / 100;
          if (this.filterUtilization === 'Over')     return util > overT;
          if (this.filterUtilization === 'Balanced') return util >= underT && util <= overT;
          if (this.filterUtilization === 'Under')    return util < underT;
          return true;
        });
      }
      if (this.sortColumn === 'empName') {
        const mult = this.sortDirection === 'asc' ? 1 : -1;
        emps = [...emps].sort((a, b) => a.name.localeCompare(b.name) * mult);
      }
      return emps;
    },

    get ismOptions() {
      const isms = [...new Set(this.employees.map(e => e.ism).filter(Boolean))].sort();
      return [{ value: 'All', label: 'All ISMs' }, ...isms.map(v => ({ value: v, label: v }))];
    },

    get ipmOptions() {
      let emps = this.filterISM !== 'All'
        ? this.employees.filter(e => e.ism === this.filterISM)
        : this.employees;
      emps = [...emps].sort((a, b) => a.name.localeCompare(b.name));
      return [{ value: 'All', label: 'All IPMs' }, ...emps.map(e => ({ value: e.id, label: e.name }))];
    },

    get locationOptions() {
      const codes = [...new Set(this.employees.map(e => e.location).filter(Boolean))].sort();
      const opts = codes.map(code => {
        const country = getCountryByCode(code);
        const flag    = country ? getCountryFlag(code) : '';
        const name    = country ? country.name : code;
        return { value: code, label: `${flag} ${name}`.trim() };
      });
      return [{ value: 'All', label: 'All Locations' }, ...opts];
    },

    get utilizationOptions() {
      const overPct  = 100 - (this.planSettings.yellowThreshold || 10);
      const underPct = 100 - (this.planSettings.greenThreshold  || 20);
      return [
        { value: 'All',      label: 'All %'                        },
        { value: 'Over',     label: `>${overPct}%`                 },
        { value: 'Balanced', label: `${underPct}–${overPct}%`      },
        { value: 'Under',    label: `<${underPct}%`                },
      ];
    },

    get hasActiveFilters() {
      return this.filterISM !== 'All' || this.filterIPM !== 'All' ||
             this.filterType !== 'All' || this.filterLocation !== 'All' ||
             this.filterUtilization !== 'All';
    },

    get cardData() {
      // Touch reactive deps so Alpine re-evaluates when they change
      void this.employees; void this.entries; void this.months;
      void this.filterISM; void this.filterIPM; void this.filterLocation;
      return buildCardData(this);
    },

    get cardSubtitle() {
      const vis = this.visibleEmployees;
      if (!vis.length) return '';
      if (vis.length === 1) {
        const emp     = vis[0];
        const country = getCountryByCode(emp.location);
        const flag    = country ? getCountryFlag(country.code) : '';
        return `${emp.name} · ${flag} ${country ? country.name : emp.location}`.trim();
      }
      return `Team · ${vis.length} employees (aggregate)`;
    },

    get chartData() {
      void this.employees; void this.entries; void this.months;
      void this.filterISM; void this.filterIPM; void this.filterLocation;
      const vis = this.visibleEmployees;
      if (!vis.length) return [];
      const visMonths  = this.visibleMonths;
      const byEmp = buildEntriesByEmp(this.entries);
      const bars = visMonths.map(vm => {
      const i     = monthIdxMap.get(vm.key);
        const proj  = vis.reduce((sum, emp) => {
          const empList = byEmp.get(emp.id) ?? [];
          return sum + empList.filter(e => e.type === 'Project').reduce((t, e) => t + (e.days[i] || 0), 0);
        }, 0);
        const oh    = vis.reduce((sum, emp) => sum + empStats(emp, i, byEmp).oh, 0);
        const abs   = vis.reduce((sum, emp) => {
          const empList = byEmp.get(emp.id) ?? [];
          return sum + empList.filter(e => e.type !== 'Project').reduce((t, e) => t + (e.days[i] || 0), 0);
        }, 0);
        const avail = Math.max(0, vis.reduce((sum, emp) => sum + empStats(emp, i, byEmp).avail, 0));
        const total = proj + oh + abs + avail;
        const wd    = vm.workingDays * vis.length;
        return { key: vm.key, short: vm.short, label: vm.label, proj, oh, abs, avail, total, wd };
      });
      const maxTotal = Math.max(...bars.map(b => b.total), 1);
      return bars.map(b => ({ ...b, heightPct: Math.round(b.total / maxTotal * 100) }));
    },

    get tableData() {
      void this.employees; void this.entries; void this.months;
      void this.filterISM; void this.filterIPM; void this.filterLocation; void this.filterType;
      void this.groupBy; void this.sortColumn; void this.sortDirection; void this.showArchived;
      return buildTableData(this);
    },

    // ── TABLE OPERATIONS ───────────────────────────────────────
    toggleOH(empId) {
      this.expandedOH[empId] = !this.expandedOH[empId];
    },

    cycleRAG(entryId) {
      const idx = this.entries.findIndex(e => e.id === entryId);
      if (idx === -1 || this.entries[idx].type !== 'Project') return;
      const cycle = { 'null': 'green', 'green': 'amber', 'amber': 'red', 'red': null };
      const cur   = this.entries[idx].ragStatus || 'null';
      const next  = cycle[cur];
      mutate('cycleRag', () => {
        const s = Alpine.store('plan');
        s.entries = s.entries.map((e, i) => i === idx ? { ...e, ragStatus: next } : e);
      }, { entryId, from: cur, to: next }, { type: 'entry', record: this.entries[idx] });
    },

    copyEntry(id) {
      const orig = this.entries.find(e => e.id === id);
      if (!orig) return;
      mutate('copyEntry', () => {
        const s = Alpine.store('plan');
        const newId = s.nextId++;
        s.entries = [...s.entries, {
          id: newId, empId: orig.empId, type: orig.type,
          project: orig.project + ' (copy)', status: orig.status, days: [...orig.days],
          archived: false
        }];
        Alpine.store('ui').editingRowId = newId;
      }, { sourceEntryId: id, project: orig.project }, null);
    },

    archiveEntry(id) {
      const entry = this.entries.find(e => e.id === id);
      if (!entry) return;
      const op = entry.archived ? 'unarchiveEntry' : 'archiveEntry';
      mutate(op, () => {
        const s = Alpine.store('plan');
        s.entries = s.entries.map(e => e.id !== id ? e : { ...e, archived: !entry.archived });
      }, { entryId: id, project: entry.project }, { type: 'entry', record: entry });
    },

    deleteEntry(id) {
      const s = Alpine.store('plan');
      s.entries = s.entries.filter(e => e.id !== id);
      Storage.deleteRecord('entry', id);
    },

    promptEntryAction(id) {
      const entry = this.entries.find(e => e.id === id);
      if (!entry) return;
      Alpine.store('modal').open('entryAction', {
        entryId:    id,
        entryName:  entry.project || 'this row',
        isArchived: !!entry.archived
      });
    },

    delEmp(id) {
      const emp = this.employees.find(e => e.id === id);
      if (!emp) return;
      const relatedEntries = this.entries.filter(e => e.empId === id);
      const msg = relatedEntries.length > 0
        ? `Delete ${emp.name} and their ${relatedEntries.length} allocation row(s)?\n\nThis action can be undone with Ctrl+Z.`
        : `Delete ${emp.name}?\n\nThis action can be undone with Ctrl+Z.`;
      showConfirmModal({
        title: 'Delete Employee', message: msg,
        confirmText: 'Delete', cancelText: 'Cancel', isDangerous: true,
        onConfirm: () => {
          mutate('deleteEmployee', () => {
            const s = Alpine.store('plan');
            s.employees = s.employees.filter(e => e.id !== id);
            s.entries   = s.entries.filter(e => e.empId !== id);
          }, { empId: id, name: emp.name, entriesRemoved: relatedEntries.length },
            [{ type: 'employee', action: 'delete', id },
             ...relatedEntries.map(e => ({ type: 'entry', action: 'delete', id: e.id }))]);
        }
      });
    },

    startInlineAdd(empId) {
      if (Alpine.store('ui').editingRowId) return;
      const tempId = 'temp-' + Date.now();
      mutate('addEntry', () => {
        const s = Alpine.store('plan');
        s.entries = [...s.entries, {
          id: tempId, empId, type: 'Project', project: '',
          status: '', days: new Array(state.months.length).fill(0)
        }];
      }, { empId }, null);
      Alpine.store('ui').editingRowId = tempId;
    },

    toggleSort(col) {
      if (this.sortColumn === col) {
        if (this.sortDirection === 'asc') {
          this.sortDirection = 'desc';
        } else {
          this.sortColumn = null;
          this.sortDirection = 'asc';
        }
      } else {
        this.sortColumn = col;
        this.sortDirection = 'asc';
      }
      triggerAutoSave();
    },

    toggleGroup(key) {
      this.expandedGroups[key] = !this.expandedGroups[key];
      triggerAutoSave();
    },

    // ── FILTER SETTERS ─────────────────────────────────────────
    toggleAvailCards() {
      this.showAvailCards = !this.showAvailCards;
      triggerAutoSave();
    },

    setISM(v) {
      this.filterISM = v;
      if (this.filterIPM !== 'All' && v !== 'All') {
        const emp = this.employees.find(e => e.id === this.filterIPM);
        if (!emp || emp.ism !== v) this.filterIPM = 'All';
      }
    },

    setIPM(v)         { this.filterIPM         = v; },
    setType(v)        { this.filterType        = v; },
    setLocation(v)    { this.filterLocation    = v; },
    setUtilization(v) { this.filterUtilization = v; triggerAutoSave(); },

    setGroupBy(v) {
      this.groupBy = v;
      triggerAutoSave();
    },

    panMonths(delta) {
      const s = Alpine.store('plan');
      const next = s.viewStartIndex + delta;
      const max  = s.months.length - MONTHS_VISIBLE;
      if (next < 0 || next > max) return;
      s.viewStartIndex = next;
      s._refreshVisibleMonths();
      triggerAutoSave();
    },

    clearFilters() {
      this.filterISM         = 'All';
      this.filterIPM         = 'All';
      this.filterType        = 'All';
      this.filterLocation    = 'All';
      this.filterUtilization = 'All';
      triggerAutoSave();
    },

    toggleCollapseAll() {
      this.collapseAllEntries = !this.collapseAllEntries;
      this.expandedInSummary  = {};
      triggerAutoSave();
    },
    toggleExpandInSummary(empId) {
      this.expandedInSummary = { ...this.expandedInSummary, [empId]: !this.expandedInSummary[empId] };
      triggerAutoSave();
    },
    toggleShowArchived() {
      this.showArchived = !this.showArchived;
      triggerAutoSave();
    },
  });

  // ── UI STORE — ephemeral UI state that must not trigger data recomputation ──
  Alpine.store('ui', {
    editingRowId:    null,
    showKeyboardHelp: false,
  });

  // ── MODAL STORE ────────────────────────────────────────────
  Alpine.store('modal', {
    activeModal: null,
    payload:     {},

    open(name, payload = {}) {
      this.payload     = payload;
      this.activeModal = name;
    },

    close() {
      this.activeModal = null;
      this.payload     = {};
    }
  });
}

/* ── GLOBAL SYNC HELPER ──────────────────────────────────────── */
export function syncStore() {}
