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
import { checkEPSDAllocationPrompt, checkBudgetAllocationPrompt } from './app.js';

export function registerComponents(Alpine) {

  // ── TOOLBAR DROPDOWN ──────────────────────────────────────
  Alpine.data('toolbarDropdown', (id) => ({
    isOpen: false,

    get opts() {
      if (id === 'groupBy') return [
        { value: 'None',     label: 'Group: None'     },
        { value: 'ISM',      label: 'Group: ISM'      },
        { value: 'Location', label: 'Group: Location' }
      ];
      if (id === 'utilization') return Alpine.store('plan').utilizationOptions;
      return [];
    },

    get currentVal() {
      const s = Alpine.store('plan');
      if (id === 'groupBy')     return s.groupBy;
      if (id === 'utilization') return s.filterUtilization;
      return null;
    },

    get label() {
      return this.opts.find(o => o.value === this.currentVal)?.label ?? '';
    },

    get isFiltered() {
      if (id === 'utilization') return Alpine.store('plan').filterUtilization !== 'All';
      return false;
    },

    toggle() {
      this.isOpen = !this.isOpen;
    },

    close() { this.isOpen = false; },

    select(val) {
      this.isOpen = false;
      const store = Alpine.store('plan');
      if (id === 'groupBy')     store.setGroupBy(val);
      if (id === 'utilization') store.setUtilization(val);
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

  // ── FILTER DROPDOWN ───────────────────────────────────────
  Alpine.data('customDropdown', (id) => ({
    isOpen: false,
    search: '',

    get opts() {
      const s = Alpine.store('plan');
      const typeOpts = [
        { value: 'All',     label: 'All types'    },
        { value: 'Project', label: 'Project only' },
        { value: 'Other',   label: 'Other only'   },
        { value: 'Absence', label: 'Absence only' }
      ];
      return { ism: s.ismOptions, ipm: s.ipmOptions, location: s.locationOptions, type: typeOpts }[id] || [];
    },

    get currentVal() {
      const s = Alpine.store('plan');
      return ({ ism: s.filterISM, ipm: s.filterIPM, location: s.filterLocation, type: s.filterType }[id]) ?? 'All';
    },

    get isFiltered() { return this.currentVal !== 'All'; },

    get visibleOpts() {
      if (!this.search) return this.opts;
      const q = this.search.toLowerCase();
      return this.opts.filter(o => o.label.toLowerCase().includes(q));
    },

    get label() {
      return this.opts.find(o => o.value === this.currentVal)?.label ?? this.currentVal;
    },

    toggle() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.search = '';
        this.$nextTick(() => this.$refs.ddSearch?.focus());
      }
    },

    close() { this.isOpen = false; },

    select(val) {
      this.isOpen = false;
      const store = Alpine.store('plan');
      if      (id === 'ism')      store.setISM(val);
      else if (id === 'ipm')      store.setIPM(val);
      else if (id === 'location') store.setLocation(val);
      else if (id === 'type')     store.setType(val);
    },

    focusFirstOpt() {
      this.$nextTick(() => this.$el.querySelectorAll('[data-opt]')[0]?.focus());
    },

    keyNav(e, idx) {
      const opts = Array.from(this.$el.querySelectorAll('[data-opt]'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        opts[Math.min(idx + 1, opts.length - 1)]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx <= 0) this.$refs.ddSearch?.focus();
        else opts[idx - 1]?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const v = this.visibleOpts[idx];
        if (v) this.select(v.value);
      }
    }
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
}
