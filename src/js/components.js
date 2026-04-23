/* ── ALPINE COMPONENT REGISTRATIONS ─────────────────────── */

import { state, monthIdxMap } from './data.js';
import {
  empStats, getEffectiveAvailability, empEntries, acls, bh,
  formatDateShort, sortEntries
} from './data.js';
import { getCountryByCode, getCountryFlag } from './countries.js';
import { mutate } from './history.js';
import { showConfirmModal } from './modals.js';
import { triggerAutoSave, Storage } from './storage.js';
import { checkEPSDAllocationPrompt, checkBudgetAllocationPrompt, checkAutoFillPrompt } from './app.js';

export function registerComponents(Alpine) {

  // ── TOOLBAR DROPDOWN ──────────────────────────────────────
  Alpine.data('toolbarDropdown', (id) => ({
    isOpen: false,

    get opts() {
      if (id === 'groupBy') return [
        { value: 'None',     label: 'None'     },
        { value: 'ISM',      label: 'ISM'      },
        { value: 'Location', label: 'Location' }
      ];
      return [];
    },

    get currentVal() {
      const s = Alpine.store('plan');
      if (id === 'groupBy') return s.groupBy;
      return null;
    },

    get label() {
      const val = this.currentVal;
      if (id === 'groupBy') {
        return (!val || val === 'None') ? 'Group by' : `Group by ${val}`;
      }
      return this.opts.find(o => o.value === val)?.label ?? '';
    },

    get isFiltered() { return false; },

    toggle() {
      this.isOpen = !this.isOpen;
    },

    close() { this.isOpen = false; },

    select(val) {
      this.isOpen = false;
      const store = Alpine.store('plan');
      if (id === 'groupBy') store.setGroupBy(val);
    },

    keyNav(e, idx) {
      const items = Array.from(this.$el.querySelectorAll('[data-opt]'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[Math.min(idx + 1, items.length - 1)]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[Math.max(idx - 1, 0)]?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.select(this.opts[idx]?.value);
      } else if (e.key === 'Escape') {
        this.close();
        this.$el.querySelector('.filter-btn')?.focus();
      }
    }
  }));

  // ── FILTER ROW ────────────────────────────────────────────────
  Alpine.data('filterRow', (slotIdx) => ({
    fieldOpen:  false,
    condOpen:   false,
    condSearch: '',

    get slot()      { return Alpine.store('plan').activeFilters[slotIdx]; },
    get field()     { return this.slot?.field     ?? null; },
    get condition() { return this.slot?.condition ?? null; },
    get isActive()  { return this.field !== null && this.condition !== null; },

    get fieldLabel() {
      return this.fieldOpts.find(o => o.value === this.field)?.label ?? 'Filter by';
    },
    get condLabel() {
      if (!this.field) return '';
      return this.condOpts.find(o => o.value === this.condition)?.label ?? 'Select…';
    },

    get fieldOpts() {
      return [
        { value: 'ism',         label: 'ISM'        },
        { value: 'location',    label: 'Location'   },
        { value: 'ipm',         label: 'IPM'        },
        { value: 'ipm_pct',     label: 'IPM %'      },
        { value: 'project_pct', label: 'Project %'  },
        { value: 'rag',         label: 'RAG Status' },
      ];
    },

    get condOpts() {
      const s = Alpine.store('plan');
      const pct = s.planSettings.budgetTolerancePct ?? 10;
      switch (this.field) {
        case 'ism':         return s.ismOptions.filter(o => o.value !== 'All');
        case 'ipm':         return s.ipmOptions.filter(o => o.value !== 'All');
        case 'location':    return s.locationOptions.filter(o => o.value !== 'All');
        case 'ipm_pct':     return s.utilizationConditionOpts;
        case 'rag':         return [
          { value: 'red',   label: 'Red'   },
          { value: 'amber', label: 'Amber' },
          { value: 'green', label: 'Green' },
        ];
        case 'project_pct': return [
          { value: 'over',  label: `Over allocated (>${pct}%)`  },
          { value: 'under', label: `Under allocated (>${pct}%)` },
        ];
        default: return [];
      }
    },

    get visibleCondOpts() {
      if (!this.condSearch) return this.condOpts;
      const q = this.condSearch.toLowerCase();
      return this.condOpts.filter(o => o.label.toLowerCase().includes(q));
    },

    get condHasSearch() { return ['ism', 'ipm'].includes(this.field); },

    selectField(val) {
      Alpine.store('plan').setFilter(slotIdx, val, null);
      this.fieldOpen  = false;
      this.condSearch = '';
      this.$nextTick(() => { this.condOpen = true; });
    },

    selectCond(val) {
      Alpine.store('plan').setFilter(slotIdx, this.field, val);
      this.condOpen = false;
      // If a row already had row-filter-match the class never leaves, so the CSS
      // animation doesn't restart. Force-restart it after Alpine re-renders.
      this.$nextTick(() => {
        document.querySelectorAll('.row-filter-match > td').forEach(td => {
          td.style.animation = 'none';
          void td.offsetWidth; // trigger reflow to reset animation state
          td.style.animation  = '';
        });
      });
    },

    clearSlot() {
      Alpine.store('plan').setFilter(slotIdx, null, null);
      this.fieldOpen = false;
      this.condOpen  = false;
    },

    keyNavField(e, idx) {
      const items = Array.from(this.$el.querySelectorAll('[data-field-opt]'));
      if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
      else if (e.key === 'ArrowUp')  { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
      else if (e.key === 'Enter')    { e.preventDefault(); this.selectField(this.fieldOpts[idx]?.value); }
      else if (e.key === 'Escape')   { this.fieldOpen = false; this.$el.querySelector('.filter-field-btn')?.focus(); }
    },

    keyNavCond(e, idx) {
      const opts  = Array.from(this.$el.querySelectorAll('[data-cond-opt]'));
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(idx + 1, opts.length - 1)]?.focus(); }
      else if (e.key === 'ArrowUp')  {
        e.preventDefault();
        if (idx <= 0) this.$refs.condSearch?.focus();
        else opts[idx - 1]?.focus();
      }
      else if (e.key === 'Enter')  { e.preventDefault(); const v = this.visibleCondOpts[idx]; if (v) this.selectCond(v.value); }
      else if (e.key === 'Escape') { this.condOpen = false; this.$el.querySelector('.filter-cond-btn')?.focus(); }
    },
  }));

  // ── CONFIRM MODAL ─────────────────────────────────────────
  Alpine.data('confirmModal', () => ({
    get title()       { return Alpine.store('modal').payload.title       || 'Confirm Action'; },
    get message()     { return Alpine.store('modal').payload.message     || 'Are you sure?'; },
    get confirmText() { return Alpine.store('modal').payload.confirmText || 'Confirm'; },
    get cancelText()  { return Alpine.store('modal').payload.cancelText  || 'Cancel'; },
    get isDangerous() { return Alpine.store('modal').payload.isDangerous || false; },

    init() {
      this.$watch('$store.modal.activeModal', val => {
        if (val === 'confirm') {
          this.$nextTick(() => this.$refs.confirmBtn && this.$refs.confirmBtn.focus());
        }
      });
    },

    confirm() {
      const cb = Alpine.store('modal').payload.onConfirm;
      Alpine.store('modal').close();
      if (typeof cb === 'function') cb();
    },

    cancel() {
      const cb = Alpine.store('modal').payload.onCancel;
      Alpine.store('modal').close();
      if (typeof cb === 'function') cb();
    }
  }));

  // ── ENTRY ACTION MODAL ────────────────────────────────────
  Alpine.data('entryActionModal', () => ({
    get isArchived() { return Alpine.store('modal').payload.isArchived || false; },
    get entryName()  { return Alpine.store('modal').payload.entryName  || 'this row'; },

    init() {
      this.$watch('$store.modal.activeModal', val => {
        if (val === 'entryAction')
          this.$nextTick(() => this.$refs.safeBtn?.focus());
      });
    },

    archive() {
      const id = Alpine.store('modal').payload.entryId;
      Alpine.store('modal').close();
      Alpine.store('plan').archiveEntry(id);
    },

    restore() {
      const id = Alpine.store('modal').payload.entryId;
      Alpine.store('modal').close();
      Alpine.store('plan').archiveEntry(id);
    },

    doDelete() {
      const id = Alpine.store('modal').payload.entryId;
      Alpine.store('modal').close();
      Alpine.store('plan').deleteEntry(id);
    },

    cancel() { Alpine.store('modal').close(); }
  }));

  // ── EMPLOYEE MODAL ────────────────────────────────────────
  Alpine.data('empModal', () => ({
    name:       '',
    ism:        '',
    location:   '',
    ohAllocValues: {},   // keyed by catId: { 'cat-1': 3, 'cat-2': 1, ... }
    availabilityPct: 100,
    futureAvailabilityPct: '',
    effectiveMonth: '',
    effectiveYear: '',
    errors: {},

    get empId()     { return Alpine.store('modal').payload.empId || null; },
    get isEditing() { return !!this.empId; },

    get activeLocs() {
      return Alpine.store('plan').activeLocations
        .map(code => getCountryByCode(code))
        .filter(Boolean);
    },

    get yearOptions() {
      const y = new Date().getFullYear();
      return Array.from({ length: 4 }, (_, i) => y + i);
    },

    get monthOptions() {
      return [
        { value: '01', label: 'January'   }, { value: '02', label: 'February'  },
        { value: '03', label: 'March'     }, { value: '04', label: 'April'     },
        { value: '05', label: 'May'       }, { value: '06', label: 'June'      },
        { value: '07', label: 'July'      }, { value: '08', label: 'August'    },
        { value: '09', label: 'September' }, { value: '10', label: 'October'   },
        { value: '11', label: 'November'  }, { value: '12', label: 'December'  }
      ];
    },

    init() {
      this.$watch('$store.modal.activeModal', val => {
        if (val === 'empEdit') {
          this.errors = {};
          const ps = Alpine.store('plan');
          const emp = this.empId
            ? ps.employees.find(e => e.id === this.empId)
            : null;
          const cats = ps.planSettings?.fixedCategories ?? [];
          if (emp) {
            this.name        = emp.name;
            this.ism         = emp.ism;
            this.location    = emp.location;
            this.ohAllocValues = Object.fromEntries(
              cats.map(cat => [cat.id, emp.ohAllocations?.[cat.id]?.days ?? cat.defaultDays])
            );
            this.availabilityPct = Math.round((emp.availability || 1) * 100);
            this.futureAvailabilityPct = emp.futureAvailability != null
              ? Math.round(emp.futureAvailability * 100) : '';
            if (emp.availabilityEffectiveDate) {
              const [yr, mo] = emp.availabilityEffectiveDate.split('-');
              this.effectiveYear  = yr;
              this.effectiveMonth = mo;
            } else {
              this.effectiveMonth = '';
              this.effectiveYear  = '';
            }
          } else {
            this.name        = '';
            this.ism         = '';
            this.location    = ps.activeLocations[0] || 'CZ';
            this.ohAllocValues = Object.fromEntries(cats.map(cat => [cat.id, cat.defaultDays]));
            this.availabilityPct = 100;
            this.futureAvailabilityPct = '';
            this.effectiveMonth = '';
            this.effectiveYear  = '';
          }
          this.$nextTick(() => this.$refs.empName && this.$refs.empName.focus());
        }
      });
    },

    validate() {
      this.errors = {};
      if (!this.name.trim()) { this.errors.name = 'Employee name is required'; return false; }
      if (!this.ism.trim())  { this.errors.ism  = 'Manager (ISM) is required'; return false; }
      const avail = parseFloat(this.availabilityPct);
      if (isNaN(avail) || avail < 1 || avail > 100)
        { this.errors.availabilityPct = 'Must be 1–100%'; return false; }
      const futVal = this.futureAvailabilityPct !== '' ? parseFloat(this.futureAvailabilityPct) : null;
      if (futVal !== null && (futVal < 1 || futVal > 100))
        { this.errors.futureAvailabilityPct = 'Must be 1–100%'; return false; }
      if (futVal !== null && (!this.effectiveMonth || !this.effectiveYear))
        { this.errors.effectiveMonth = 'Both month and year required when future availability is set'; return false; }
      if ((this.effectiveMonth && !this.effectiveYear) || (!this.effectiveMonth && this.effectiveYear))
        { this.errors.effectiveMonth = 'Both month and year must be specified together'; return false; }
      if (this.effectiveMonth && this.effectiveYear && futVal === null)
        { this.errors.futureAvailabilityPct = 'Future availability required when effective date is set'; return false; }
      return true;
    },

    save() {
      if (!this.validate()) return;
      const availability       = parseFloat(this.availabilityPct) / 100;
      const futureAvailability = this.futureAvailabilityPct !== ''
        ? parseFloat(this.futureAvailabilityPct) / 100 : null;
      const availabilityEffectiveDate = (this.effectiveMonth && this.effectiveYear)
        ? `${this.effectiveYear}-${this.effectiveMonth}` : null;
      const empId = this.empId;
      const ohSnapshot = { ...this.ohAllocValues };
      if (empId) {
        mutate('updateEmployee', () => {
          const s = Alpine.store('plan');
          s.employees = s.employees.map(e => {
            if (e.id !== empId) return e;
            const ohAllocations = Object.fromEntries(
              Object.entries(ohSnapshot).map(([id, days]) => [id, { days: parseFloat(days) || 0, desc: e.ohAllocations?.[id]?.desc ?? '' }])
            );
            return { ...e, name: this.name.trim(), ism: this.ism.trim(), location: this.location,
                     ohAllocations, availability, futureAvailability, availabilityEffectiveDate };
          });
        }, { empId });
      } else {
        mutate('addEmployee', () => {
          const s = Alpine.store('plan');
          const id = 'emp' + s.nextEmpId++;
          const ohAllocations = Object.fromEntries(
            Object.entries(ohSnapshot).map(([catId, days]) => [catId, { days: parseFloat(days) || 0, desc: '' }])
          );
          s.employees = [...s.employees, {
            id, name: this.name.trim(), ism: this.ism.trim(), location: this.location,
            ohAllocations, availability, futureAvailability, availabilityEffectiveDate
          }];
        });
      }
      Alpine.store('modal').close();
    },

    close() { Alpine.store('modal').close(); }
  }));

  // ── TABLE ROW ─────────────────────────────────────────────
  Alpine.data('tableRow', (entryId) => ({
    editType:    'Project',
    editProject: '',
    editStatus:  '',
    editUrl:     '',
    editEpsd:    '',
    editBudgetHours: '',
    editDays:    {},
    showUrlRow:  false,
    _focusMonthIndex: null,

    get isEditing() { return Alpine.store('ui').editingRowId === entryId; },

    init() {
      this.$watch('$store.ui.editingRowId', id => {
        if (id === entryId) this._populate();
      });
    },

    _populate() {
      const entry = Alpine.store('plan').entries.find(e => e.id === entryId);
      if (!entry) return;
      this.editType    = entry.type;
      this.editProject = entry.project    || '';
      this.editStatus  = entry.status     || '';
      this.editUrl     = entry.projectUrl || '';
      this.editEpsd    = entry.epsd       || '';
      this.editBudgetHours = entry.budgetHours != null ? String(entry.budgetHours) : '';
      this.editDays    = Object.fromEntries(state.months.map((_, i) => [i, entry.days[i] || 0]));
      this.showUrlRow  = !!entry.projectUrl;
      const focusPos = this._focusMonthIndex;
      this.$nextTick(() => {
        if (focusPos !== null) {
          const input = this.$el.querySelectorAll('.inline-edit')[focusPos];
          if (input) { input.focus(); input.select(); return; }
        }
        this.$refs.editProject?.focus();
      });
    },

    startEdit(monthIndex = null) {
      const ui = Alpine.store('ui');
      if (ui.editingRowId && ui.editingRowId !== entryId) return;
      this._focusMonthIndex = monthIndex ?? null;
      ui.editingRowId = entryId;
    },

    save() {
      const s = Alpine.store('plan');
      const entry = s.entries.find(e => e.id === entryId);
      if (!entry) return;
      const isNew  = typeof entryId === 'string' && entryId.startsWith('temp-');

      const newDays = [...entry.days];
      s.visibleMonths.forEach(m => {
        const i = monthIdxMap.get(m.key);
        let v = parseFloat(this.editDays[i]) || 0;
        if (v < 0) v = 0;
        if (v > 31) v = 31;
        newDays[i] = v;
      });

      const oldEPSD    = entry.epsd;
      const newProject = this.editProject.trim() || 'Untitled';
      const newUrl     = this.editUrl.trim() || null;
      const newEpsd    = this.editEpsd || null;
      const newBudgetHours = parseFloat(this.editBudgetHours) || null;

      let savedId = entryId;  // for isNew, overwritten inside mutate closure below
      if (!isNew) {
        mutate('saveEntry', () => {
          const ps = Alpine.store('plan');
          ps.entries = ps.entries.map(e => e.id !== entryId ? e : {
            ...e,
            type: this.editType, project: newProject, status: this.editStatus.trim(),
            projectUrl: newUrl, epsd: newEpsd, budgetHours: newBudgetHours, days: newDays
          });
          Alpine.store('ui').editingRowId = null;
        }, { entryId, project: newProject }, { type: 'entry', record: entry });
      } else {
        mutate('addEntry', () => {
          const ps = Alpine.store('plan');
          const newId = ps.nextId++;
          savedId = newId;
          ps.entries = ps.entries.map(e => e.id !== entryId ? e : {
            ...e, id: newId,
            type: this.editType, project: newProject, status: this.editStatus.trim(),
            projectUrl: newUrl, epsd: newEpsd, budgetHours: newBudgetHours, days: newDays
          });
          Alpine.store('ui').editingRowId = null;
        }, { project: newProject });
      }
      if (newEpsd !== oldEPSD) {
        setTimeout(() => checkEPSDAllocationPrompt(
          Alpine.store('plan').entries.find(e => e.id === savedId) || entry,
          oldEPSD, newEpsd
        ), 100);
        if (isNew) {
          setTimeout(() => checkAutoFillPrompt(
            Alpine.store('plan').entries.find(e => e.id === savedId) || entry
          ), 200);
        }
      } else {
        setTimeout(() => checkBudgetAllocationPrompt(
          Alpine.store('plan').entries.find(e => e.id === savedId) || entry
        ), 150);
      }
    },

    cancel() {
      const isNew = typeof entryId === 'string' && entryId.startsWith('temp-');
      if (isNew) {
        const s = Alpine.store('plan');
        s.entries = s.entries.filter(e => e.id !== entryId);
      }
      Alpine.store('ui').editingRowId = null;
    },

    toggleUrlRow() {
      this.showUrlRow = !this.showUrlRow;
      if (this.showUrlRow) this.$nextTick(() => this.$refs.editUrl?.focus());
      else { this.editUrl = ''; this.$nextTick(() => this.$refs.editProject?.focus()); }
    },

    handleKeydown(e) {
      if (!this.isEditing) return;
      const inNotesTextarea = e.target.classList.contains('entry-notes-input');
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); this.cancel();
      } else if (e.key === 'Enter' && e.shiftKey && !inNotesTextarea) {
        e.preventDefault(); e.stopPropagation();
        const empId = Alpine.store('plan').entries.find(en => en.id === entryId)?.empId;
        this.save();
        if (empId) setTimeout(() => Alpine.store('plan').startInlineAdd(empId), 50);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); e.stopPropagation(); this.save();
      } else if (e.key === 'k' && e.ctrlKey) {
        e.preventDefault(); e.stopPropagation(); this.toggleUrlRow();
      }
    }
  }));

  // ── FIXED ALLOCATION DESCRIPTION ─────────────────────────
  // descField is now a category ID; desc lives at emp.ohAllocations[catId].desc
  Alpine.data('fixedAllocDesc', (empId, catId) => ({
    editing: false,
    value:   '',

    get display() {
      const emp = Alpine.store('plan').employees.find(e => e.id === empId);
      return emp ? (emp.ohAllocations?.[catId]?.desc || '') : '';
    },

    startEdit() {
      this.value   = this.display;
      this.editing = true;
      this.$nextTick(() => this.$refs.descInput?.focus());
    },

    save() {
      const s = Alpine.store('plan');
      const emp = s.employees.find(e => e.id === empId);
      if (!emp) { this.editing = false; return; }
      mutate('updateFixedAllocationDesc',
        () => {
          const ps = Alpine.store('plan');
          ps.employees = ps.employees.map(e => {
            if (e.id !== empId) return e;
            const existing = e.ohAllocations?.[catId] || { days: 0, desc: '' };
            return { ...e, ohAllocations: { ...e.ohAllocations, [catId]: { ...existing, desc: this.value.trim() } } };
          });
        },
        { empId, catId, value: this.value.trim() },
        { type: 'employee', record: emp });
      this.editing = false;
    },

    cancel() { this.editing = false; }
  }));

  // ── SAVE INDICATOR ────────────────────────────────────────
  Alpine.data('saveIndicator', () => ({
    get label() {
      const n = this.$store.ui.pendingWriteCount;
      const q = n > 0 ? ` (${n})` : '';
      return {
        saved:   'Saved',
        saving:  n > 0 ? `Saving\u2026${q}` : 'Saving\u2026',
        failed:  `Save failed${q}`,
        offline: `Offline${q}`,
      }[this.$store.ui.saveStatus] ?? 'Saved';
    },
    get title() {
      const n = this.$store.ui.pendingWriteCount;
      const q = n > 0 ? ` ${n} change${n === 1 ? '' : 's'} queued.` : '';
      return {
        saved:   'All changes saved',
        saving:  `Saving changes\u2026${q}`,
        failed:  `Changes could not be saved \u2014 check your connection.${q}`,
        offline: `No network connection \u2014 changes will sync when back online.${q}`,
      }[this.$store.ui.saveStatus] ?? '';
    },
  }));
}
