# Completed Features

This document tracks features that have been completed and delivered. Features remain in ROADMAP.md through the current minor version cycle, then move here when a new minor version is released.

---

## Version 3.16.x – 3.18.x Features

### [#1360] Hierarchical Filter Redesign
**Completed**: April 23, 2026 · **Version**: v3.18.0

Replaced 5 individual filter dropdowns (ISM, IPM, Location, Type, All %) with a hierarchical two-dropdown system: select a field first, then a condition. Up to 3 filter slots (AND-combined): slot 1 always visible; slots 2 and 3 appear when the preceding slot is active via the `+` button. New filter fields: RAG Status (Red / Amber / Green) and Project % (Over / Under allocated vs. budget tolerance). Both produce a visual left-border indicator on matching project rows when active. `activeFilters[3]` array replaces `filterISM`, `filterIPM`, `filterType`, `filterLocation`, `filterUtilization` in the store. `customDropdown` component removed; `filterRow(slotIdx)` component added.

### [#1350] Auto-Fill Allocations from Budget + EPSD
**Completed**: April 23, 2026 · **Version**: v3.17.0

When a new Project row is saved with both `budgetHours` and `epsd` set and all month cells are zero, `checkAutoFillPrompt()` fires after save and offers to distribute the budget evenly across the period from current month through EPSD. Calculation: `daysPerMonth = round(budgetDays / monthCount, 0.25)` — rounded to nearest ¼ day. Confirm fills all months in range; Cancel leaves cells empty. No-op if any month cell already has a value. Undo (`Ctrl+Z`) reverts in one step.

### [#1200] Allocation Solver — Budget vs. EPSD Validation
**Completed**: April 22, 2026 · **Version**: v3.16.0

New field `entry.budgetHours` (nullable number): project budget in hours, divided by 8 when comparing against day-based allocations. Inline edit panel: budget hours input inside the EPSD cell (Project type only); read mode shows budget below EPSD date when set. Validation on save: `checkBudgetAllocationPrompt()` fires and compares committed days against budget — warns if delta exceeds configurable tolerance. Tolerance setting: `planSettings.budgetTolerancePct` (default 10%), configurable in Settings → Plan Settings. CSV export/import includes `budgetHours` column. Migration: `_migrateData()` sets `budgetHours = null` on entries lacking the field.

---

## Version 3.15.x Features

### [#1310] Configurable Fixed Allocation Categories
**Completed**: April 22, 2026 · **Version**: v3.15.0

Fixed allocation categories are now plan-configurable rather than hardcoded. `planSettings.fixedCategories` holds category definitions (id, name, defaultDays). `employee.ohAllocations` holds per-employee values keyed by category id (`{days, desc}`). Settings → Fixed Allocation tab has a category management card for adding, renaming, and removing categories. The employee edit modal dynamically renders one input per category. Legacy flat fields (`ohAdmin`, `ohTraining`, etc.) are automatically migrated to the new keyed structure on first load.

---

## Version 3.11.x – 3.14.x Features

### [#1300] Delete vs. Archive Choice Modal
**Completed**: April 21, 2026 · **Version**: v3.10.0

Replaced the archive-only 📦 button on allocation rows with a red × that opens a choice modal. On a normal row: Archive (soft-hide, allocations preserved, undoable) or Delete (permanent, not undoable). On an archived row: Restore or Delete. Modal wording makes irreversibility explicit. `promptEntryAction()` store method opens `'entryAction'` modal; `archiveEntry()` and `deleteEntry()` already existed in `store.js`.

### [#1150] Audit Trail & Version History
**Completed**: April 21, 2026 · **Version**: v3.11.0

localStorage-based audit trail with History tab in Settings. Append-only audit log (capped 50 entries) stored outside the Alpine store to avoid reactive overhead. History tab shows a reverse-chronological list with label, detail, and timestamp. Point-in-time restore with confirm modal; current state becomes new undo point before restore. Export audit log as JSON; Clear history with confirm. IM-01 resolved: undo/redo stacks migrated to `Alpine.store('plan')`; reactive toolbar undo/redo buttons added.

---

## Version 3.9.x Features

### [#1290] Per-Employee Expand in Summary Mode
**Completed**: April 21, 2026 · **Version**: v3.9.0

Employee name rendered as a `<button>` in Summary view. Clicking expands that employee's entry/sub/addrow rows while all others stay collapsed; clicking again collapses them. `expandedInSummary` store property; `toggleExpandInSummary(empId)` method. Switching to/from Summary resets expansions. `aria-expanded` drives `cursor: pointer` via CSS. `.emp-name--expanded` applies accent colour. State persisted and restored on reload.

### [#1110] Hide/Archive Rows
**Completed**: April 21, 2026 · **Version**: v3.9.0

Delete replaced by Archive (📦 button on each entry row). `archiveEntry(id)` soft-deletes via `archived: true`; undoable with Ctrl+Z. Non-archived rows with all-zero allocations in the visible window are auto-hidden. Sub-total and add-row rows are suppressed when no visible entries exist for an employee. "📦 Archived" toggle button in sidebar row 2 reveals all hidden/archived rows (archived rows shown with 45% opacity + italic). `showArchived` store property; `toggleShowArchived()` method. State and archived flags fully persisted.

---

## Version 3.8.x Features

### [#1270] Collapse All Employee Detail Rows
**Completed**: April 21, 2026 · **Version**: v3.8.0

"View" toggle button in the filter sidebar collapses all entry/sub/addrow rows so only employee header rows are visible. `collapseAllEntries` store property; `toggleCollapseAll()` method; `x-show` conditions on entry, sub, and addrow rows. State persisted and restored on reload.

### [#1120] Utilization Filtering
**Completed**: April 21, 2026 · **Version**: v3.8.0

"Utilization" dropdown in the filter sidebar filters employees by average utilization across visible months: Overallocated (>90%), Balanced (70–90%), Underutilised (<70%). `filterUtilization` store property; `utilizationOptions` getter; `setUtilization()` method. Included in `hasActiveFilters` and cleared by `clearFilters()`.

---



### [#1280] Move Filters to Left Panel
**Completed**: April 21, 2026 · **Version**: v3.7.0

All filter and grouping controls (ISM, IPM, Location, Type, Group By, Clear filters) moved from the top toolbar into a persistent `.sidebar-filters` panel. The panel occupies `grid-column: info-start / months-start` in `.content-grid`, placing it to the left of the summary cards and chart in the same grid row. The top bar now contains only the title, employee count, and Settings button. No JS changes — Alpine components and store state are unchanged.

---

## Version 3.3.x – 3.6.x Features

### [#2060] v3.3 — Full State Migration
**Completed**: April 20, 2026 · **Version**: v3.3.0

Eliminated the dual-state anti-pattern. `Alpine.store('plan')` is the single source of truth. `data.js` stripped to static config only. Reactive getters auto-update; `syncStore()` deleted. All `mutate()` closures write to the store. `history.js` snapshots/restores from store. `storage.js` payload reads from store. `loadFromStorage()` writes to store.

### [#2050] v3.2 — Final Cleanup & Integration
**Completed**: April 20, 2026 · **Version**: v3.2.0

`rChart()` string-builder deleted; all `window.*` exports removed from `app.js`; `renderAll()` simplified with no more `innerHTML` injection; legacy root files deleted.

### [#2020-phase4] v3.1 — Table Alpinification
**Completed**: April 20, 2026 · **Version**: v3.1.0

`rTable()` deleted; all table interactions moved to Alpine: `tableRow` component, `fixedAllocDesc` component, and `Alpine.store('plan')` methods.

### [#1160] Import / Export
**Completed**: April 20, 2026 · **Version**: v3.4.2

JSON backup export and import wired to `Storage.exportToFile` / `importFromFile`. UI panel added to Plan Settings tab in `settings.html`. Clear All Data button also added.

### [#1130] Rolling / Dynamic Date Range
**Completed**: April 20, 2026 · **Version**: v3.4.0

Dynamic window always covering current month−1 through current month+N (horizon 3/6/9/12). Horizon picker in toolbar. Entry allocations serialised as key-indexed objects so they survive window regeneration. V4 positional migration handled on load.

### [#1260] Toggle: Monthly Availability Cards ↔ Chart
**Completed**: April 21, 2026 · **Version**: v3.5.0

`showAvailCards` store property (default `true`). "Monthly Availability" heading is a toggle button; clicking hides cards and shows chart (and vice versa). State persisted and restored on reload. `<button>` with `aria-expanded` and `aria-controls`.

### [#1250] Summary Card Container Border
**Completed**: April 21, 2026 · **Version**: v3.4.5

`.summary-card` wrapper added around the availability card strip, styled identically to `.chart-card`: same border, border-radius, box-shadow, and padding.

### [#1070] Chart / Tile Alignment
**Completed**: April 21, 2026 · **Version**: v3.4.4

Card strip left-offset alignment implemented. `--col-rag-width` and `--col-epsd-width` tokens added to `design-tokens.css`. Card strip uses `display:grid; grid-auto-columns:var(--col-month-width)` with no gap.

---

## Version 3.0.x Features

### [#2020] SWA Rewrite — Vite + ES Modules (Phases 0–3)
**Completed**: April 20, 2026 · **Version**: v3.0.0

Full rewrite of the app into `src/` using Vite + ES modules. Both entry points (`src/index.html` and `src/settings.html`) produce clean builds. The root-level app is untouched.

- **Phase 0** — Foundation: `data.js` (`export const state`), `storage.js`, `countries.js`, `toast.js`, CSS copied
- **Phase 1** — Core app: `history.js` (with `structuredClone`), `store.js` (with `setStoreSyncRender`), `modals.js` (with `setModalRenderFn`), `chart.js`, `keyboard.js`, `components.js`, `app.js`, `main.js`, `src/index.html`
- **Phase 2** — Settings page: `settings-page.js` (full `settingsPage()` Alpine factory, 4-tab `x-show` layout, availability planning inline sub-components), `settings-main.js`, `src/settings.html`
- **Phase 3** — Build validation + docs: `npm run build` → 24 modules, 2 HTML entry points, `dist/` clean

### [#2030] Modal System — Alpine Components
**Completed**: April 20, 2026 · **Version**: v3.0.0 (SWA rewrite)

`src/index.html` and `src/settings.html` both use Alpine `x-show` components for all modals. `src/js/modals.js` is zero-`innerHTML`. (Root app equivalent completed in v2.1.9/v2.2.1.)

### [#2040] Settings Page — Full Alpine Conversion
**Completed**: April 20, 2026 · **Version**: v3.0.0 (SWA rewrite)

`src/settings.html` has `<body x-data="settingsPage">`. All 4 tabs are `x-show` panels. Location dropdown uses `filteredCountries` getter with `x-model` search. Employee table uses `x-for` with per-row inline `x-data` for availability planning. All mutations go through `mutate()`. No `innerHTML`, no `renderTab()`, no string concatenation.

---

## Version 2.2.x Features

### [#2000] v2.0.0 — Alpine Foundation
**Completed**: March 25, 2026 · **Version**: v2.0.0



### [#1060] Custom Dropdown Components & Filter Overhaul
**Completed**: March 25, 2026 · **Version**: v1.7.0

Replaced all four native `<select>` filter controls with custom dropdown components:
- **Custom dropdown component** — trigger button, search input, scrollable option list, click-outside close
- **Keyboard navigation** — `↑`/`↓` navigate options, `Enter` selects, `Escape` closes and returns focus to trigger
- **Search/type-ahead** — real-time option filtering as you type in the search input
- **ARIA compliance** — `role="combobox"`, `role="listbox"`, `role="option"`, `aria-expanded`, `aria-selected`
- **Active filter visual feedback** — trigger button highlighted blue when a filter is applied; selected option marked with `✓`
- **Hierarchical ISM → IPM filtering** — IPM list auto-filters to employees under selected ISM; switching ISM auto-resets IPM if no longer valid
- **"Clear filters" button** — appears when any filter is active; resets all four at once
- **Group By unchanged** — remains native `<select>` (3 options, no search needed)
- **Files**: `js/components.js` (dropdown helpers + `rHeader()` rewrite), `js/app.js` (`setISM()` cascade + `clearAllFilters()`)

---

## Version 1.6.x Features

### [#1080] Chart Rendering Optimization
**Completed**: March 25, 2026 · **Version**: v1.6.3

Eliminated unnecessary chart re-initialization on every render:
- **Root cause**: canvas lived inside `#app`; every `renderAll()` call destroyed it via `innerHTML` replacement
- **Fix**: `#chart-container` sibling div in `index.html`; seeded once, never re-replaced
- **Result**: `initChart()` → `updateChart()` path now works correctly; no more destroy/recreate cycle
- **Bonus**: chart labels, data, tooltip all use `getVisibleMonths()` — date range filter applies to chart

### [#1040] Settings Page Keyboard Navigation
**Completed**: March 25, 2026 · **Version**: v1.6.2

Enhanced keyboard controls within the settings page:
- **`←` / `→` arrow keys** — cycle through all four settings tabs
- **`ESC`** — navigates back to main plan; first ESC blurs active input, second navigates away
- **Arrow suppression** — disabled when focus is inside `<input>`, `<textarea>`, or `<select>`
- **Focus management** — keyboard focus moves to newly active tab button after each switch
- **ARIA compliance** — `role="tab"`, `aria-selected`, `title` hints on all tab buttons
- **`switchTab()` fix** — no longer depends on implicit `event` global

### [#1050] Hyperlink Support in Project/Activity Field
**Completed**: March 25, 2026 · **Version**: v1.6.0

Rich text support for project documentation links:
- **🔗 button** in edit mode to reveal URL input; **Ctrl+K** shortcut to toggle
- **View mode** — project names with URL render as clickable `↗` links
- **Tab navigation aware** — URL input skipped by Tab when hidden
- **`projectUrl`** field added to data model (nullable, auto-migrated from v1.5.x)

---

## Version 1.5.x Features

### [#1030] RAG Status + EPSD Fields
**Completed**: March 25, 2026 · **Version**: v1.5.0

Project lifecycle management with visual status tracking:
- **RAG Status Column** — click-to-cycle: ⚪ None → 🟢 Green → 🟡 Amber → 🔴 Red → ⚪
- **EPSD Column** — Estimated Production Site Date with date picker (DD/MM/YY display)
- **Smart Allocation Logic** — prompts when EPSD moves earlier (clear after?) or later (extend?)
- **New layout**: `Type | Project | RAG | EPSD | Notes | Months…`
- Data version bumped to v4; automatic backward-compatible migration

---

## Version 1.4.x Features

### [#1000] Complete Undo/Redo System
**Completed**: March 25, 2026 · **Version**: v1.4.0

In-memory undo/redo with toast notifications:
- **50-step history** via `js/history.js`
- **Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y** shortcuts
- **Captures all mutations** — entries, employees, calendar, availability changes
- **Toast notifications** — slide-in visual feedback for undo/redo actions
- Foundation for future audit trail (#1150)

### [#1010] Technical Debt: Harmonize Internal Field Names
**Completed**: March 25, 2026 · **Version**: v1.4.1

Cleaned up naming inconsistency from global project details feature:
- **Implementation**: Renamed all `projectSettings` to `planSettings` throughout codebase
- **Files updated**: js/data.js, js/app.js, js/components.js, js/settings.js, js/storage.js (28 total occurrences)
- **Backward compatibility**: Automatic migration for existing stored data
