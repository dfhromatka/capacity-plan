# Changelog

## [3.19.2] - 2026-04-24

### Fixed
- **REACT-02** — `expandedOH` moved from `$store.plan` to `$store.ui`; toggling Fixed Allocation rows no longer triggers a full `tableData`/`cardData`/`chartData` rebuild (`src/js/store.js`, `src/index.html`)
- **REACT-03** — `collapseAllEntries`, `expandedInSummary`, `showArchived` moved from `$store.plan` to `$store.ui`; summary-mode toggles and archive filter no longer cause expensive store recomputation. `showArchived` removed from persisted payload — resets to `false` on reload (session-only UI state). (`src/js/store.js`, `src/js/data.js`, `src/js/storage.js`, `src/index.html`)
- **ARCH-08** — `tableData` getter: removed 4 phantom `void` dep-touches (`filterISM`, `filterIPM`, `filterLocation`, `filterType` never existed in the store). Added explicit `void this.activeFilters` and `void Alpine.store('ui').showArchived` deps. (`src/js/store.js`)
- **ARCH-09** — `cancelTempEntry(id)` extracted to plan store; calls `mutate()` so cache is invalidated and audit trail fires. `keyboard.js` Escape handler and `tableRow.cancel()` both delegate to it — no more duplicated inline filter logic. (`src/js/store.js`, `src/js/keyboard.js`, `src/js/components.js`)
- **REACT-04** — `editDays` month input handler changed from in-place key assignment to reference replacement (`editDays = { ...editDays, [cell.i]: ... }`), making the change detectable by Alpine v3's reactive proxy. (`src/index.html`)

---

## [3.19.1] - 2026-04-24

### Fixed
- **ARCH-05** — `deleteEntry` now goes through `mutate()`, ensuring cache invalidation, undo snapshot, and audit entry on permanent row deletion (`src/js/store.js`)
- **ARCH-06** — `updateMonthWorkingDays` and `updateMonthHoliday` now replace the array element reference instead of mutating in-place, making Alpine reactivity and `state.months` synchronisation reliable (`src/js/settings-page.js`)
- **ARCH-07** — Removed duplicate empty `ismOptions` getter that was silently masking the real implementation (`src/js/store.js`)
- **CSS-05** — Utilisation bar `utilColor` now uses `var(--color-danger)`, `var(--color-warning)`, `var(--color-success)` instead of raw hex values, aligning with the design token system (`src/js/store.js`)

---

## [3.19.0] - 2026-04-23

### Added
- **Multi-select filter conditions** — ISM, IPM, and Location filter slots now support selecting multiple values; panel stays open while toggling; label summarises selections (e.g. "Alice (+2)"). Single-select preserved for IPM%, Project%, and RAG filters.
- **Keyboard Shortcuts settings tab** — Read-only reference panel in Settings listing all active shortcuts; accessible via `settings.html?tab=keyboard`.
- **Footer shortcut hints** — Footer now shows `Ctrl+F` and a `Shift+? all shortcuts` button that opens the keyboard overlay.

### Changed
- **EPSD column** widened from 108 px to 132 px; Notes column narrowed from 272 px to 248 px. Reduces cell padding in edit mode so date and budget inputs render without overflow.
- **Budget input** changed to `width: 100%` to fill available column width in edit mode.
- **Sub-total row** — removed "∑ entries" label text; summary numbers remain.
- **Keyboard shortcuts overlay** — removed Ctrl+Z / Ctrl+Y (unimplemented undo/redo) to avoid misleading users (resolves STOR-08).
- **EPSD display** state now uses CSS classes (`epsd-display--set` / `epsd-display--empty`) instead of inline `:style` fontWeight binding.

### Fixed
- `font-weight: normal` → `var(--font-normal)` in `.modal__hint-inline` (CSS-* debt).
- `.row-action-btn--insert` `15px` and `.row-action-btn--restore` `13px` hardcoded font sizes replaced with design tokens.
- `margin-top: 2px` in `.budget-hours-display` replaced with `var(--space-1)`.

## [3.18.0] - 2026-04-23

### Added — #1360: Hierarchical Filter Redesign

- **Replaced** 5 individual filter dropdowns (ISM, IPM, Location, Type, All %) with a **hierarchical two-dropdown system**: select a field first, then a condition.
- Up to **3 filter slots** (AND-combined): slot 1 always visible; slots 2 and 3 appear when the preceding slot is active via the `+` button.
- **New filter fields:** RAG Status (Red / Amber / Green) and Project % (Over / Under allocated vs. budget tolerance). Both produce a visual **left-border indicator** (`inset 3px var(--color-primary)`) on matching project rows when active.
- **IPM % renamed** from "All %" — condition options unchanged.
- `activeFilters[3]` array replaces `filterISM`, `filterIPM`, `filterType`, `filterLocation`, `filterUtilization` in the store. Session state only — not persisted to localStorage.
- **Clear filters** button resets all 3 slots and collapses to 1 visible row.
- `customDropdown` component removed; `filterRow(slotIdx)` component added. `toolbarDropdown` (Group by) unchanged.

---

## [3.17.0] - 2026-04-23

### Added — #1350: Auto-Fill Allocations from Budget + EPSD

- When a **new** Project row is saved with both `budgetHours` and `epsd` set and all month cells are zero, `checkAutoFillPrompt()` fires after save and offers to distribute the budget evenly across the period.
- Calculation: `daysPerMonth = round(budgetDays / monthCount, 0.25)` — rounded to nearest ¼ day; period is current month through EPSD.
- Prompt shows the start month, end month, month count, and per-month value. Confirm fills all months in range; Cancel leaves cells empty.
- No-op if any month cell in the entry already has a value (avoids overwriting existing work).
- No modal clash: auto-fill fires at 200ms in the EPSD-changed branch only for new rows; EPSD clear/extend (100ms) is silent for blank rows; budget check (150ms) lives in the EPSD-unchanged branch.
- Undo (`Ctrl+Z`) reverts the fill in one step.
- Audit trail entry: "Auto-filled allocations (Xd/mo × N months)".

---

## [3.16.0] - 2026-04-22

### Added — #1200: Allocation Solver (Budget vs. EPSD Validation)

- **New field `entry.budgetHours`** (nullable number): project budget entered in hours. Stored as hours; divided by 8 when comparing against day-based allocations.
- **Inline edit panel:** Budget hours input appears inside the EPSD cell in edit mode (Project type only). No new column. In read mode, budget is shown below the EPSD date when set (`123h`).
- **Validation on save:** After every save of a Project row, `checkBudgetAllocationPrompt()` (`src/js/app.js`) fires and compares committed days against the budget:
  - If EPSD is set: sums `entry.days[0..epsdIdx]` vs `budgetHours / 8`; warns if delta exceeds the configured tolerance.
  - If no EPSD: uses last non-zero allocation month as the horizon; warns on the same condition.
  - No-op if either `budgetHours` or allocations are absent.
- **Tolerance setting:** `planSettings.budgetTolerancePct` (default 10%). Configurable in Settings → Plan Settings → "Budget Validation Tolerance" card.
- **Migration:** `_migrateData()` in `storage.js` sets `budgetHours = null` on entries that lack the field.
- **CSV:** `budgetHours` column added to entries export/import (after `epsd`).
- **Tab sequence:** Project → URL → Notes → EPSD → Budget hours → month cells.

### Fixed

- **Fixed allocations expand button** (FIX-01): `toggleOH()` and `toggleGroup()` in `store.js` were mutating object properties in-place, which Alpine v3 does not detect as reactive changes when adding a new key. Both now replace the object reference (`{ ...obj, [key]: val }`) so Alpine triggers correctly.

### Changed

- **Column widths:** `--col-proj-width` 168px → 100px; `--col-notes-width` 222px → 272px; `--col-epsd-width` 90px → 108px; `--col-rag-width` 50px → 40px.

---

## [3.15.0] - 2026-04-22

### Added — #1310: Configurable Fixed Allocation Categories

- **Data model:** OH allocation categories are no longer hardcoded. `planSettings.fixedCategories` holds plan-global category definitions (`id`, `name`, `defaultDays`). Per-employee values live in `employee.ohAllocations` keyed by category ID: `{ days, desc }`.
- **Migration:** `_migrateOhAllocations()` in `data.js` runs once on load when `planSettings.fixedCategories` is absent. Maps legacy flat fields (`adminDays`, `trainingDays`, `internalInitiatives`, `cipSupport`, `encActivity` + desc counterparts) to the new structure. Legacy fields are stripped from employee records after migration.
- **Settings → Fixed Allocation tab:** New "Fixed Allocation Categories" card above the per-employee table. Supports rename, default-days change (applies to all employees immediately), add, and delete (with confirm when any employee has days > 0).
- **Per-employee table:** Columns are now driven by `planSettings.fixedCategories` dynamically — categories added/renamed/removed reflect instantly.
- **Employee edit modal:** Fixed allocation inputs are now dynamic (`x-for` over `planSettings.fixedCategories`). "Future Availability Change (optional)" section label removed (redundant).
- **`empStats`:** OH calculation now reads `ohAllocations` keys instead of flat fields.
- **`buildTableData`:** OH sub-rows generated from `fixedCategories` + `ohAllocations` dynamically.
- **`fixedAllocDesc` component:** Updated to read/write `ohAllocations[catId].desc` instead of `emp[descField]`.
- **CSV export:** `exportEmployeesCsv` now accepts `fixedCategories` and emits `oh_<id>_days`/`oh_<id>_desc` columns.
- **CSV import:** `parseEmployeesCsv` and `parseCapacityPlanCsv` produce `ohAllocations` instead of flat fields.

### Fixed — CSS-02: `.settings-card` spacing via flex + gap

- `.settings-card` now `display: flex; flex-direction: column; gap: var(--space-4)`.
- `.settings-field-group` class and its CSS rule removed entirely.
- All `<div class="settings-field-group">` wrapper elements removed from `settings.html`.
- `.settings-card__description` `margin-bottom` removed (redundant with gap).
- Full audit of all settings tabs confirmed no other spacing-wrapper patterns.

---

## [3.14.3] - 2026-04-22

### Fixed — TOKEN-01: design token alias and dead token consolidation

- **Dead tokens removed** from `src/css/design-tokens.css`: `--color-bg-page`, `--color-bg-card`, `--color-background` (0 uses in styles.css; superseded by canonical tokens)
- **Spacing aliases migrated** (~54 replacements in `styles.css`): `--spacing-xs/sm/md/lg` → `--space-1/2/3/4`; alias definitions removed from `design-tokens.css`; 5 redundant fallback values cleaned up (`var(--space-1, 4px)` → `var(--space-1)`)
- **Font-weight aliases migrated** (7 replacements): `--font-weight-medium/semibold` → `--font-medium/semibold`; alias definitions removed
- **Color-accent aliases migrated** (26 replacements): `--color-accent` → `--color-primary`, `--color-accent-hover` → `--color-primary-hover`, `--color-accent-subtle` → `--color-primary-light`; alias definitions removed
- `docs/DESIGN_SYSTEM.md` gray-scale rule already documented at line 99 — no change needed
- Net: 12 alias/dead token definitions removed from `design-tokens.css`; one token per distinct design decision

---

## [3.14.2] - 2026-04-22

### Fixed — PERF-10: filter/group-by lag (DOM node count)

- **Root cause:** each `<tbody>` in the `x-for="row in tableData.rows"` loop rendered all 6 row-type templates (`group`, `emp`, `oh`, `entry`, `sub`, `addrow`) and hid 5 of them with `x-show`. The complex entry row template alone carries ~124 nodes (13 month cells × ~7 elements each); with ~348 rows in the dataset this produced ~153k avoidable DOM nodes per render.
- **Fix:** wrapped each row-type `<tr>` in a `<template x-if="row.rowType === '...'">` inside the `<tbody>`. Each `<tbody>` now creates only the one `<tr>` that matches its row type. Expected DOM node count drops from ~200k to ~26k (~6× reduction).
- The `rowType` property is permanent for a given row object so `x-if` is correct here: `x-show` is reserved for conditions that toggle on the same element (group expand, edit mode, etc.), which are preserved as `x-show` on the `<tr>` itself.
- Profiling confirmed the bottleneck was Alpine's reactive flush across too many nodes (~1,300ms per filter change), not JS computation (`buildTableData`, `empStats`, etc.).
- `x-data="row.rowType === 'entry' ? tableRow(row.id) : {}"` simplified to `x-data="tableRow(row.id)"` (the `x-if` now guarantees entry context).
- `settings.html` confirmed clear — pattern was isolated to `src/index.html`.

---

## [3.14.1] - 2026-04-22

### Fixed — ST-02: settings.html inline style extraction

- All ~109 static `style="…"` attributes removed from `src/settings.html` and replaced with semantic CSS classes in `src/css/styles.css`
- New classes added: `.settings-plan-grid`, `.settings-section-header` (+ `__title`, `__subtitle`, `--row`), `.settings-card` (+ `__title`, `__description`), `.location-tag` (+ `__remove`, `-row`), `.location-dropdown-trigger`, `.location-dropdown-panel` (+ `__search`, `__list`, `__item`, `__name`, `__code`, `__body`), `.threshold-preview`, `.threshold-box` (+ `__value`, `__label`, `--danger`, `--warning`, `--success`), `.avail-panel` (+ `__header`, `__title`, `__close`, `__body`, `__current`), `.avail-btn` (+ `--active`, `--inactive`), `.avail-panel-cell`, `.settings-avail-grid`, `.settings-avail-actions`, `.settings-actions-cell`, `.settings-emp-name-cell`, `.settings-month-label`, `.settings-table-empty`, `.settings-empty-hint`, `.settings-delete-btn`, `.settings-field-group`, `.settings-divider`, `.settings-btn-stack`, `.settings-dropdown-anchor`, `.settings-threshold-inputs`, `.settings-threshold-preview-section`, `.settings-preview-label`, `.calendar-year-chevron`, `.location-dropdown-item__checkbox`, `.location-dropdown-item__flag`
- Dynamic `:style` binding on availability toggle button replaced with `:class` using `.avail-btn--active` / `.avail-btn--inactive`
- `src/settings.html` now contains zero raw hex values; only justified layout exceptions remain inline (`resize:vertical`, file input `display:none`, `cursor:pointer` on file labels, table column width percentages)
- `docs/CODE_REVIEW.md`: HTML-01 and ST-02 marked resolved; TOKEN-01 and CSS-02 logged as new debt items

### Fixed — TOKEN-01 (partial): undefined semantic tokens defined

- `--color-surface-raised` (used 3× in styles.css, was undefined) → `var(--color-gray-neutral-50)`
- `--color-text-secondary` (used in styles.css, was undefined) → `var(--color-gray-neutral-500)`
- `--font-size-base` (used in styles.css, was undefined) → `var(--text-md)`
- All three added to the semantic aliases section of `src/css/design-tokens.css`

---

## [3.14.0] - 2026-04-22

### Added — CSV Import/Export + Clear All Data fix

- **CSV export:** Export employees and entries as CSV files from the Plan Settings tab
- **CSV import (employees):** Upload `employees.csv` to replace the entire employee roster; all entries cleared
- **CSV import (entries):** Upload `entries.csv` to replace all allocations; employees must exist first; employee names resolved by name match
- `src/js/csv.js` — new module: pure CSV parse/generate functions, RFC-4180 quoted-field handling, error log builder
- On validation error: import is aborted and an error log `.txt` file is downloaded automatically listing every failing row
- **Clear All Data fix:** `clearAllData()` now calls `location.reload()` instead of `loadFromStorage()`, ensuring Alpine store resets fully
- **`?reset=true` URL parameter:** navigating to `index.html?reset=true` clears localStorage and strips the param before Alpine starts — useful for sharing a clean-slate UAT link

---

## [3.13.1] - 2026-04-22

### Fixed — PERF-07: `cardStyle()` hex strings replaced with design tokens

- All nine hardcoded hex values in `cardStyle()` (`src/js/data.js`) replaced with `var(--color-success-*)`, `var(--color-warning-*)`, and `var(--color-danger-*)` token references
- No new tokens needed — the exact values were already defined in `design-tokens.css`
- Availability card colours are now themeable from one place

---

## [3.13.0] - 2026-04-21

### Changed — PERF-06/08/09: Alpine reactivity performance pass II

- **PERF-09 (tableData deps):** `expandedOH` and `expandedGroups` removed from `tableData`'s reactive void-dep list. `buildTableData` now always emits all rows (OH rows always present, employee/entry/sub/addrow rows always present). All rows carry a `groupKey` property. Visibility now controlled by `x-show` in the template: OH rows check `$store.plan.expandedOH[row.empId]`; employee-related rows check the group's expansion state. `toggleOH` and `toggleGroup` now mutate the nested property in-place instead of replacing the whole object. Result: expanding/collapsing OH sections or groups no longer triggers a full `tableData` rebuild.
- **PERF-06 (monthIdxMap):** Added `monthIdxMap` (Map<key, index>) and `rebuildMonthIdxMap()` to `data.js`. Map is pre-built at init and refreshed in `loadFromStorage()` when the month pool is regenerated. All `state.months.findIndex()` / `this.months.findIndex()` calls in `store.js` (build functions, `visibleEmployees`, `chartData`), `data.js` (`empEntries`, `getGroupStats`), and `app.js` (`checkEPSDAllocationPrompt`) replaced with O(1) `monthIdxMap.get(key)` lookups.
- **PERF-08 (renderWithChart cleanup):** Removed `export function renderWithChart() {}` stub from `store.js` and all 10 call sites across `store.js`, `components.js`, `app.js`, and `main.js`. Removed the now-empty `renderAll()` wrapper from `app.js` and its import in `main.js`. Removed dead `needsChart` variable from `components.js`. Chart rendering has been fully reactive via the `chartData` getter since v3.12.0; all call sites were dead code.

---

## [3.12.0] - 2026-04-21

### Added — #1150: Audit Trail & Version History

- **History tab** in Settings — reverse-chronological list of all data changes with timestamp and detail
- **Point-in-time restore** — click Restore on any history entry to roll back; current state becomes a new undo point
- **Export history** — download full audit log as JSON
- **Clear history** — confirm modal to wipe all recorded entries
- **Reactive undo/redo buttons** in the main toolbar (↶ / ↷) — disabled when stack is empty; paired with existing Ctrl+Z / Ctrl+Y shortcuts
- `src/js/audit.js` — new file; `makeAuditEntry()` and op → human-readable label map (18 ops)

### Changed — IM-01: undo/redo stacks migrated to Alpine store

- `undoStack`, `redoStack`, `isUndoRedoInProgress` moved from module-level `let` globals in `history.js` into `Alpine.store('plan')`
- `canUndo` / `canRedo` computed getters; `undoAction()` / `redoAction()` store methods
- Dead code removed from `history.js`: `setRenderFn()`, `getHistoryStatus()`, `_render` no-op
- `main.js` cleaned: `setRenderFn` import and call removed
- Audit log capped at 50 entries; persisted in `localStorage`; undo/redo stacks are session-only (not persisted)

---

## [3.10.0] - 2026-04-21

### Added — #1300: Delete vs. Archive Choice Modal

The 📦 archive button on allocation rows is replaced by a `×` dismiss button. Clicking it opens
a two-choice modal:

- **Normal row:** "Remove row" — Archive (undoable, allocations preserved) or Delete (permanent)
- **Archived row:** "Archived row" — Restore (undoable) or Delete (permanent)

Focus lands on the safe action (Archive/Restore) on open, never on Delete. The modal body
describes what each action does so the distinction is explicit before committing.

**Delete is permanent** and bypasses `mutate()` so it cannot be undone. Archive/Restore go
through the existing `archiveEntry()` method and remain undoable via Ctrl+Z.

New methods in `store.js`: `deleteEntry(id)`, `promptEntryAction(id)`.
New Alpine component: `entryActionModal` in `components.js`.
New CSS classes: `.row-action-btn--dismiss`, `.entry-action-option`, `.entry-action-option--danger`.
Removed: `.row-action-btn--archive`, `.row-action-btn--restore` (no longer used in rows).

---

## [3.9.0] - 2026-04-21

### Added — #1290: Per-Employee Expand in Summary Mode

Clicking an employee's name in Summary view expands that employee's entry/sub/addrow rows
inline while all other employees remain collapsed. A second click collapses them. The name
renders as a `<button>` element; `aria-expanded` is present only in Summary mode (drives
`cursor: pointer` via CSS). `.emp-name--expanded` class applies accent colour when expanded.
`expandedInSummary` store property (object keyed by empId); `toggleExpandInSummary(empId)`
method. Switching to/from Summary always resets `expandedInSummary = {}`. State persisted.

### Added — #1110: Hide/Archive Rows + Auto-hide

**Archive replaces Delete:** The `×` delete button is replaced by a 📦 archive button.
Archiving soft-deletes a row: it sets `archived: true` on the entry and the row disappears
immediately. Ctrl+Z restores it. `archiveEntry(id)` method; `delEntry()` removed.

**Auto-hide zero-allocation rows:** Any non-archived row whose allocations are all zero across
the visible 13-month window is automatically hidden in normal view. No manual action needed —
rows reappear as soon as an allocation is entered. Logic in `empEntries()` (`data.js`).

**Sub-total and add-row suppressed** for employees with no visible entries (prevents orphaned
summary rows for employees whose entries are all hidden or archived).

**Show Archived toggle:** A "📦 Archived" button in the second sidebar filter row (after View)
reveals all archived and zero-allocation rows simultaneously. Archived rows appear with 45%
opacity and italic text (`.row-archived`). Toggle is independent of the View button — both
can be active simultaneously. `showArchived` store property; `toggleShowArchived()` method.
State persisted.

**Sidebar row layout revised:** Type filter moved from row 2 to row 1 (ISM · IPM · Location · Type).
Row 2 now: Utilization · Group By · View · Archived.

### Fixed — UI-03: Tab key in notes textarea no longer triggers save

Removed `@keydown.tab="save()"` from the `<textarea>` in the Status/Notes cell. Tab now
advances browser focus normally. Save-on-Tab is still handled by the `<tr>`-level
`handleKeydown` listener which catches Tab bubbling up from any child element.

## [3.8.0] - 2026-04-21

### Added — #1270: Collapse All + #1120: Utilization Filter

**Summary / Detail toggle (#1270):** A "View" toggle button in the second filter row collapses
all entry rows (project, other, absence) so only employee header rows are visible. Sub-total
and add-row rows are also hidden when collapsed. Click "⊞ Detail" to restore. State persisted
and restored on reload. `collapseAllEntries` store property; `toggleCollapseAll()` method.
Entry/sub/addrow `x-show` conditions gated on `!$store.plan.collapseAllEntries`.

**Utilization filter (#1120):** New "Utilization" dropdown in the second filter row filters
employees by average utilization across visible months. Options: All / Overallocated (>90%) /
Balanced (70–90%) / Underutilised (<70%). Thresholds match existing column header RAG colours.
`filterUtilization` store property; `utilizationOptions` getter; `setUtilization()` method.
Included in `hasActiveFilters` and reset by `clearFilters()`. State persisted.

**Filter row layout revised:** Row 1: ISM, IPM, Location. Row 2: Type, Utilization, Group By,
View toggle. `toolbarDropdown` extended with `isFiltered` getter and `'utilization'` key support.
`.sidebar-filters__group--narrow` modifier added for the View toggle (no equal-width expansion).

## [3.7.1] - 2026-04-21

### Changed — Header and table polish

**Header simplified:** Employee count subtitle (`page-subtitle`) removed. `.page-header` changed
to `align-items: center` so the Settings button aligns with the plan name baseline. `margin-bottom`
reduced from 20px (`--space-5`) to 8px (`--spacing-sm`). `.page-subtitle` CSS rule removed.

**Employee name no longer clipped:** The two-cell layout (name in `col-type`, buttons in
`col-proj colspan="4"`) merged into a single `colspan="5"` cell. `.emp-header-row` flex container
places name on the left (`white-space: nowrap`) and `.emp-header-actions` (OH toggle + Edit)
on the right with `flex-shrink: 0`. Name can now span the full combined info column width.

**Column widths rebalanced:** `--col-type-width` 90px → 110px (fits "Internal Initiatives"
label and the type `<select>` with its arrow). `--col-proj-width` → 168px (43%),
`--col-notes-width` → 222px (57%) of the 390px combined pool. `col-notes` now uses
`width: var(--col-notes-width)` (was `auto`) so EPSD's sticky `left:` offset matches the
actual column width, eliminating the dead space between Status/Notes and EPSD.

**Multi-line Status/Notes:** `<input>` replaced with `<textarea rows="4" resize:none>`.
View mode clips to one line (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`).
Edit mode lifts `overflow: hidden` via `.col-notes--editing` class. Row expands on edit,
snaps back on save/cancel — no JS needed.

**Keyboard behaviour:** `handleKeydown` Enter always saves (including when focus is in the
notes textarea — `preventDefault` stops newline insertion). Shift+Enter in the notes textarea
is unhandled → browser inserts `\n`. Shift+Enter elsewhere saves + adds a row (unchanged).

**Fixed allocation vertical bar removed:** `.oh-desc-cell` gets `border-right: none`;
`.row-oh .col-notes` gets `border-left: none`. Eliminates the hairline between the
Project/Activity and Status/Notes cells on fixed allocation rows.

**Clear filters button moved inline:** Button repositioned from standalone bottom-of-sidebar
element into the `.sidebar-filters__title` row (right-aligned). Sidebar height is now constant
regardless of filter state, so `align-self: center` works correctly in both cards and chart
view modes.

## [3.7.0] - 2026-04-21

### Changed — #1280: Filters moved to persistent left panel

All filter and grouping controls (ISM, IPM, Location, Type, Group By, Clear filters) removed
from the top toolbar and placed in a `.sidebar-filters` panel that occupies the grid area
immediately to the left of the summary cards and chart.

**Layout:** `.sidebar-filters` is the first child of `.content-grid` with explicit
`grid-row: 1; grid-column: info-start / months-start`. Summary/chart sections also have
`grid-row: 1`; `#app-table` has `grid-row: 2`. Explicit rows were required because CSS Grid
auto-placement with named-line column spans proved unreliable for this layout. Works correctly
in both the cards and chart view states. Sidebar is vertically centred within the row via
`align-self: center`.

**Filter arrangement:** Two `.sidebar-filters__row` flex rows — ISM, IPM, Location on the
first row; Type and Group By on the second. Each group uses `flex: 1 1 0` for equal widths.

**Top bar** now contains only the plan title, employee count subtitle, and Settings button.
The `.controls-row` wrapper and its CSS rule were removed.

**Card styling simplified:** `.summary-card` and `.chart-card` had their border, background,
box-shadow, and border-radius removed — content renders directly on the page background.
Left padding removed from both (`padding-left: 0`); `padding-left: var(--spacing-lg)` added to
`.summary-label` and `.chart-card__header` to preserve label insets. This resolved the visual
overlap with the adjacent filter panel that the earlier `margin-left: -16px` trick had caused.

**No JS changes:** All filter state and Alpine components (`customDropdown`, `toolbarDropdown`)
are reused verbatim — only their DOM parent changed.

---

## [3.6.2] - 2026-04-21

### Fixed — Settings page "Alpine is not defined" error (CR-06)

`settings-page.js` and `modals.js` referenced `Alpine` as a bare global instead of importing
it. When bundled by Vite, bare global references are not resolved via the ES module graph —
`window.Alpine` is never set by the npm-installed Alpine module (only the CDN build sets it).
All `Alpine.store()` calls on the settings page therefore threw `ReferenceError: Alpine is not defined`.

**Fix:** Added `import Alpine from 'alpinejs'` to both files. Vite now resolves `Alpine` via
the shared module chunk, exactly as `store.js`, `history.js`, and `components.js` do.

**Also fixed (data safety):** `loadFromStorage()` in `data.js` previously called `Storage.clear()`
on a dataVersion mismatch, silently wiping all user data. Replaced with a non-destructive warn +
load-defaults path. Future versions (higher than current `DATA_VERSION`) are now treated as
forward-compatible (best-effort load) rather than triggering a wipe.

---

## [3.6.1] - 2026-04-21

### Changed — Housekeeping: banner comments, roadmap cleanup (EN-05, EN-07)

**EN-05 — Banner comment style standardised across all JS files**

Three files had inconsistent internal section headers (mix of short/lowercase vs. full-width uppercase banners). Standardised to `/* ── SECTION NAME ────────────────── */` throughout:
- `src/js/store.js`: MODULE-LEVEL BUILD HELPERS, PLAN STORE, COMPUTED, TABLE OPERATIONS, FILTER SETTERS, MODAL STORE, GLOBAL SYNC HELPER
- `src/js/components.js`: TOOLBAR DROPDOWN, FILTER DROPDOWN, CONFIRM MODAL, EMPLOYEE MODAL, TABLE ROW, FIXED ALLOCATION DESCRIPTION
- `src/js/settings-page.js`: GETTERS, TAB SWITCHING, TAB 0–3, DATA IMPORT / EXPORT

**EN-07 — Completed items moved from ROADMAP.md to COMPLETED_FEATURES.md**

- New "Version 3.3.x–3.6.x Features" section added to `COMPLETED_FEATURES.md` covering #1070, #1130, #1160, #1250, #1260, #2020-phase4, #2050, #2060
- All ✅ items removed from `ROADMAP.md`; completed Alpine migration detail blocks (#2000–#2060) removed
- `CODE_REVIEW.md` updated: EN-05 and EN-07 marked resolved; last-updated date bumped to v3.6.1

---

## [3.6.0] - 2026-04-21

### Added — Info column differentiation + proj/notes column resize (#1290)

**Column reorder:** Type → Project/Activity → Status/Notes → EPSD → RAG → Months → Delete.
Status/Notes moved next to Project/Activity so the two text columns are adjacent and share a
combined auto-width that fills all available space not consumed by fixed-width columns.

**Column resizing:** Project/Activity and Status/Notes share a fixed combined width. A drag
handle on the right edge of the Project/Activity header lets users adjust the split. Persisted
in localStorage and restored on reload.

**Visual differentiation:** Info column headers (Type, Project, Notes, EPSD, RAG) use a
`--color-info-col-bg` tint. RAG (last info column) has a heavier right border separating it
from the month data columns.

**Code changes:**
- `src/css/design-tokens.css`: `--color-info-col-bg` token added
- `src/css/styles.css`: column order, sticky `left:` values now token-derived `calc()`, `.col-info`
  rules replace 8 repeated per-row selector groups, `.col-resize-handle` added, `thead th.col-proj`
  `position: relative` for handle, `.col-rag` right-border separator
- `src/index.html`: `<colgroup>` with Alpine `:style` bindings; `<table :style :x-init>`; all
  column cells reordered and marked `col-info`; resize handle in `<th class="col-proj">`
- `src/js/store.js`: `colProjWidth`, `colNotesWidth`, `tableColVars`, `colStyles` getters,
  `measureColWidths()`, `startColResize()`, `_onColResize()`, `_resizeState`
- `src/js/storage.js`: `colProjWidth` + `colNotesWidth` persisted
- `src/js/data.js`: `colProjWidth` + `colNotesWidth` restored on load



### Added — Toggle: monthly availability cards ↔ capacity chart (#1260)

**#1260 — "Monthly Availability" label is now a toggle button**

- `showAvailCards: true` added to `Alpine.store('plan')` (default: cards shown, chart hidden)
- `toggleAvailCards()` method added to the store — flips the flag and calls `triggerAutoSave()`
- `showAvailCards` persisted in `_buildSavePayload()` and restored in `loadFromStorage()`
- Chart container uses `x-if` (not `x-show`) so it is fully removed from DOM when hidden
- The "Monthly Availability" heading is a `.summary-toggle-btn` (`<button>`) with `@click`,
  `:aria-expanded`, and `aria-controls`; the chart title mirrors this as `.chart-card__title-toggle`
- `.chart-card__header` restructured: title + subtitle on top row (right-aligned), legend below
- `.summary-card` wraps the availability section with `.chart-card`-matching border/shadow/padding
- CSS: `.summary-toggle-btn`, `.chart-card__title-row`, `.chart-card__subtitle` added

### Changed — Chart.js replaced with Alpine CSS bar chart

- **Chart.js removed** from the bundle (JS payload: 295 kB → 86 kB gzipped)
- `src/js/chart.js` gutted to no-op stub exports (`initChart`, `updateChart`, `resetChart`)
- `get chartData()` reactive getter added to `Alpine.store('plan')` — computes per-month
  stacked segments (projects, fixed allocation, absences, available) automatically from store state
- `renderWithChart()` in `store.js` is now a no-op; chart updates are driven by Alpine reactivity
- New Alpine CSS bar chart in `src/index.html`: `x-for` over `chartData`, proportional `flex`
  segment heights, hover tooltips via `x-data="{ tip: false }"` on each column
- Segment colours use existing design tokens: `--color-primary-light` (projects),
  `--color-gray-neutral-400` (fixed), `--color-warning` (absences), `--color-success-light` (available)
- New CSS section `ALPINE CSS BAR CHART` in `styles.css` replaces `.chart-canvas-wrap`

---

## [3.4.5] - 2026-04-21

### Changed — Summary card container border (#1250)

**#1250 — Monthly availability card strip wrapped in styled container**

`.summary-card` div added around the `x-if` templates inside `.summary-section`.
Styled identically to `.chart-card`: same `background`, `border-radius`, `box-shadow`,
`border`, and `padding`. Creates visual parity between the two summary sections
(availability cards above, capacity chart below). CSS-only; no JS or store changes.

---

## [3.4.4] - 2026-04-21

### Changed — Card strip alignment (#1070)

**#1070 — Card strip now aligns with table month columns (DOM-measured offset)**

CSS `calc()` from column width tokens was insufficient because the browser's auto table layout
expands `col-proj` to fit content (project names), making the actual first-month-column offset
larger than the sum of the token values.

**Approach:** `measureStickyColsOffset()` in `src/js/app.js` reads the actual rendered
`getBoundingClientRect().left` of the first `th.col-month` relative to `#app-top` and stores the
result in `Alpine.store('plan').stickyColsOffset`. The summary section binds this via
`:style="{ marginLeft: $store.plan.stickyColsOffset + 'px' }"` — fully reactive.

**When it runs:**
- On initial load: double `requestAnimationFrame` after `loadFromStorage()` in `main.js`
- On horizon change: double `requestAnimationFrame` in `setHorizon()` after Alpine re-renders
- On window resize: debounced (150ms) listener in `main.js`

`--sticky-cols-width` CSS token retained (still used for `--col-rag-width` / `--col-epsd-width`
derivation). CSS `margin-left` on `.summary-section` removed; `:style` binding takes over.

Also: `.card-strip` switched from `display:flex + gap` to `display:grid; grid-auto-flow:column;
grid-auto-columns:var(--col-month-width)` with no gap. `.month-card` horizontal padding trimmed
6px → fits 72px grid cell. `--col-rag-width` and `--col-epsd-width` tokens added.

**`CLAUDE.md` — "Dynamic over hardcoded" rule added** to CSS Architecture Standards.

**Files:** `src/js/app.js`, `src/js/main.js`, `src/js/store.js`, `src/css/design-tokens.css`,
`src/css/styles.css`, `src/index.html`, `CLAUDE.md`

---

## [3.4.3] - 2026-04-21

### Changed — Alpine-native toolbar controls (UI-01) + localStorage error handling (EN-03)

**UI-01 — Group By and Horizon native `<select>` replaced with `toolbarDropdown` Alpine components**

Both `<select>` controls in the toolbar were replaced with custom Alpine dropdown components
(`toolbarDropdown`) using the same markup and CSS as the existing filter dropdowns. All six
toolbar controls now render identically — same font, weight, height, hover and focus states.
The `.ctrl-select` CSS class and its `appearance:none` workaround block have been removed.

- New `toolbarDropdown(id)` component registered in `src/js/components.js`
- `src/index.html` toolbar updated to use `x-data="toolbarDropdown('groupBy')"` and `x-data="toolbarDropdown('horizon')"`
- `.ctrl-select` removed from `src/css/styles.css` (and from the shared base rule)
- `CLAUDE.md` updated with an explicit Alpine-first rule: native `<select>` is forbidden for toolbar/filter controls; custom Alpine dropdowns are the standard

**EN-03 — localStorage error boundaries**

`_saveToLocalStorage` now emits a specific toast for `QuotaExceededError` ("Storage full —
export a backup to free space") and a generic toast for other write failures. `_loadFromLocalStorage`
emits a "storage blocked — read-only" toast on `SecurityError`. The `alert()` in `triggerAutoSave`
has been removed.

**EN-02 — `aria-live` toast region verified correct** (no code changes needed)

**Files:** `src/index.html`, `src/js/components.js`, `src/css/styles.css`, `src/js/storage.js`, `CLAUDE.md`

---

## [3.4.2] - 2026-04-20

### Added — JSON Backup & Restore (#1160)

Added a **Data Backup & Restore** panel to the Plan Settings tab in `src/settings.html`:
- **Export JSON Backup** — calls `saveToStorage()` then `Storage.exportToFile()` to download a dated `.json` snapshot of all plan data
- **Import JSON Backup** — file picker triggers `Storage.importFromFile()`, shows a confirmation dialog, then calls `Storage._saveToLocalStorage()` + `loadFromStorage()` to atomically replace all data
- **Clear All Data** — confirmation-gated `Storage.clear()` + `loadFromStorage()` reset

**Files:** `src/settings.html`, `src/js/settings-page.js`

---

## [3.4.1] - 2026-04-20

### Changed — Inline Style Extraction (ST-01)

Extracted all 84 static `style="…"` attributes from `src/index.html` to semantic CSS classes in
a new TABLE CONTENT section in `src/css/styles.css`. All values mapped to design tokens — zero
raw hex or raw `px` values remain in the HTML. Modal `style="display:none"` attributes replaced
with `x-cloak`. One dynamic `:style=` binding updated to use `var(--color-*)` references instead
of raw hex literals.

**New CSS classes:** `.chart-canvas-wrap`, `.sortable`, `.col-header-label`, `.cell-inactive`,
`.row-editing`, `.row-group`, `.row-group__cell`, `.row-group__label`, `.row-group__stats`,
`.emp-name`, `.emp-avail-pct`, `.btn-oh-toggle`, `.btn-emp-edit`, `.avail-day-val`,
`.avail-day-pct`, `.oh-bank-cell`, `.oh-desc-cell`, `.oh-desc-placeholder`, `.oh-desc-input`,
`.oh-month-cell`, `.badge` (cursor), `.entry-type-select`, `.entry-proj-label`,
`.entry-proj-edit-row`, `.entry-proj-input`, `.btn-link-toggle`, `.entry-url-row`,
`.entry-url-input`, `.btn-url-remove`, `.entry-epsd-input`, `.entry-status-text`,
`.entry-notes-input`, `.day-zero`, `.day-val`, `.day-pct-label`, `.btn-row-save`,
`.btn-row-cancel`, `.sub-label`, `.sub-month-val`, `.addrow-sticky-cell`, `.btn-add-entry`,
`.table-legend kbd`, `.legend-sep`, `.legend-avail-swatch` (with `--green/--yellow/--red`
modifiers). CSS rules for `thead .col-month`, `thead .col-rag`, `thead .col-epsd`,
`.row-group td`, `.row-emp .col-type/proj`, `.row-oh .col-type/notes`, `.row-addrow td`,
`.mth-bar` max-width also added.

**Files:** `src/index.html`, `src/css/styles.css`

---

## [3.4.0] - 2026-04-20

### Changed — Rolling Date Window (#1130)

Replaced the hardcoded 14-month calendar array (`2025-12` → `2027-01`) with a dynamically
generated window always covering **current month − 1 through current month + N** where N is
the user-selected horizon (3, 6, 9, or 12 months).

**`src/js/data.js`**: Added `countWeekdays(year, month)` and `generateMonths(horizon, monthConfig)`
helpers. `state.months` is now `generateMonths(12)` — computed at runtime, not hardcoded.
Added `positionalToKeyed()` (exported) and `_keyedToPositional()` / `_v4DaysToKeyed()` (internal)
for serialisation round-trips. `loadFromStorage()` detects v4 vs v5 data, migrates v4 positional
`entry.days` via `V4_KEYS` epoch, and regenerates the month window from persisted `monthConfig`.
Removed `_initializeDateRange()`.

**`src/js/store.js`**: Added `horizon: 12` to `planSettings` and `monthConfig: {}` property.
Removed `dateRangeStart` / `dateRangeEnd`. `visibleMonths` returns `this.months` directly.
Added `setHorizon(n)` method — remaps entry days through key-indexed intermediate on window change.

**`src/js/storage.js`**: `DATA_VERSION` bumped 4 → 5. `_buildSavePayload()` saves `monthConfig`
(replaces `months` array) and serialises `entry.days` as `{ 'YYYY-MM': N }` key-indexed objects
so allocations survive window regeneration.

**`src/js/modals.js`**: Removed `showDateRangeModal()` and `setDateRangePreset()`.

**`src/js/components.js`**: Removed `dateRangeModal` Alpine.data component.

**`src/js/settings-page.js`**: `updateMonthWorkingDays` and `updateMonthHoliday` now also write
to `s.monthConfig` so user overrides persist across horizon changes and page reloads.

**`src/index.html`**: Replaced date range modal button with a `<select>` horizon picker (+3 / +6 /
+9 / +12 months). Removed date range modal template.

### Fixed — Alpine anti-patterns in table row template (AP-01)

Replaced `@mouseover="$el.style.*"` / `@mouseout` inline DOM mutations on RAG icon, EPSD display,
and copy/delete buttons with CSS classes (`.rag-icon`, `.epsd-display`, `.row-action-btn`) using
`:hover` rules and design tokens.

## [3.3.0] - 2026-04-20

### Changed — Full State Migration: data.js globals → Alpine.store('plan') (ARCH-02)

Eliminated the dual-state anti-pattern where `data.js` globals held canonical data and
`Alpine.store('plan')` held manual copies synced via `sync()`. Alpine's `reactive()` only tracks
property accesses on proxied objects — plain JS globals are invisible to it, causing stale UI
after every mutation. `Alpine.store('plan')` is now the single source of truth.

**`src/js/store.js`**: Complete rewrite. Employees, entries, etc. start as empty arrays (populated
by `loadFromStorage()`). Module-level `buildCardData(store)` and `buildTableData(store)` functions
replace store methods. Reactive getters use `void this.x` to register deps so Alpine re-evaluates
on any change. All store methods write to `this.*` directly. `sync()` deleted; `syncStore()`
exported as no-op stub while call sites are cleaned up.

**`src/js/history.js`**: Imports `Alpine` from `'alpinejs'` directly. Snapshots and restores
read/write `Alpine.store('plan')` instead of `state.*`. `setSyncFn` / `_syncStore` removed.
`mutate()` no longer calls `syncStore()` — Alpine reacts automatically.

**`src/js/storage.js`**: `_buildSavePayload()` reads from `Alpine.store('plan')`. Removed
`import { state }` from `data.js`.

**`src/js/data.js`**: `state` stripped to `{ months: [...] }` (static config only). All mutable
properties (`employees`, `entries`, `activeLocations`, `planSettings`, `nextId`, `nextEmpId`,
filter state) removed. `loadFromStorage()` now writes to `Alpine.store('plan')` and must run
after `Alpine.start()`. `empStats()` and `empEntries()` read entries from the store.
`getGroupedEmployees` and `getGroupStats` accept store/param args instead of reading `state.*`.
Deleted: `visibleEmps`, `toggleSort`, `toggleGroup`, `getVisibleMonths`, `formatDateRange`,
`initializeDateRange` (all superseded by store getters/methods).

**`src/js/main.js`**: `loadFromStorage()` moved into `queueMicrotask()` (after `Alpine.start()`).
`setSyncFn` import and call removed.

**`src/js/components.js`**: All `mutate()` fn() closures write to `Alpine.store('plan')`. Array
mutations use replacement pattern (`s.entries = [...s.entries, e]`) to trigger Alpine reactivity.

**`src/js/modals.js`**: `setDateRangePreset()` writes to `Alpine.store('plan')` for date range.
Removed `syncStore()` call.

**`src/js/app.js`**: `checkEPSDAllocationPrompt()` entry.days mutations use store array replacement.

**`src/js/settings-page.js`**: All reads/writes use `Alpine.store('plan')` via `_store()` helper.
Removed `import { state }` from `data.js`.

**`src/js/settings-main.js`**: Calls `registerStores(Alpine)` before `Alpine.start()` so the
plan store exists. `loadFromStorage()` moved to `queueMicrotask()`.

**`src/js/chart.js`**: `getVisibleMonths` import removed; replaced with local `_visibleMonths()`
reading `Alpine.store('plan').visibleMonths`. `state.entries` and `state.activeLocations` reads
replaced with store reads.

**`docs/CODE_REVIEW.md`**: ARCH-02 (dual-state bug) marked resolved.

---

## [3.2.0] - 2026-04-20

### Changed — v3.2 Final Cleanup & Legacy Removal (#2050)

**Removed last string-builder pattern:**
- Moved chart HTML (`chart-card`, legend, canvas) from `rChart()` string injection into `src/index.html` as static markup
- Replaced inline hex legend colors with `.legend-swatch--*` CSS classes using design tokens
- Deleted `rChart()` from `src/js/components.js`
- Simplified `renderAll()` in `src/js/app.js` — removed `innerHTML` injection; now just `syncStore()` + optional `initChart()`

**Removed callback injection plumbing:**
- Deleted `setComponentRenderFn`, `setCheckEPSDFn` from `src/js/components.js`; now imports `syncStore` and `checkEPSDAllocationPrompt` directly
- Deleted `setStoreSyncRender` from `src/js/store.js`; now calls `syncStore()` / `renderWithChart()` directly
- Deleted `setModalRenderFn` from `src/js/modals.js`; redundant `_render()` call before `syncStore()` removed
- Cleaned up `src/js/main.js` and `src/js/settings-main.js` — removed all setter wiring calls

**Deleted legacy root files:**
- Removed `/js/`, `/css/`, `/index.html`, `/settings.html` (root-level legacy copies, superseded by `src/`)
- Removed `/capacity_plan.html` (old standalone prototype)
- Removed `/debug_check.cjs` (dev debugging artifact)

## [3.1.0] - 2026-04-20

### Changed — Phase 4: Table Alpinification

Replaced `rTable()` innerHTML rendering with a full Alpine `x-for` template in `src/index.html`. Eliminated all transitional `window.*` exports from `src/js/app.js`.

**`src/index.html`**: `<div id="app-table"></div>` replaced with a 250-line Alpine table template. All interaction is `@click`/`@keydown`/`x-show`/`x-for` — zero `innerHTML`.

**`src/js/store.js`**: Added `tableData` computed getter (returns `{ mthHeaders, groups }` — pre-computed per-group/per-employee/per-entry data for the template). Added store methods: `toggleOH`, `cycleRAG`, `copyEntry`, `delEntry`, `delEmp`, `startInlineAdd`, `toggleSort`, `toggleGroup`.

**`src/js/components.js`**: Added `tableRow(entryId)` Alpine component (per-row edit state: `editType`, `editProject`, `editStatus`, `editUrl`, `editEpsd`, `editDays`, `showUrlRow`; `handleKeydown` covers Enter/Escape/Shift+Enter/Ctrl+K; `save()` calls `checkEPSDAllocationPrompt` via registered callback). Added `fixedAllocDesc(empId, descField)` Alpine component (inline description editing via `x-show` toggle). Added `setComponentRenderFn` and `setCheckEPSDFn` registration exports.

**`src/js/app.js`**: Reduced to `renderAll()` + `checkEPSDAllocationPrompt()` only. Removed: `startRowEdit`, `cancelRowEdit`, `saveRowEdit`, `startInlineAdd`, `setupRowTabNav`, `editFixedAllocationDesc`, `toggleProjectUrlInput`, `clearProjectUrl`, `toggleOH`, `copyEntry`, `delEntry`, `delEmp`, `cycleRAG`, `updEmp`, `updMonth`, and all `window.*` transitional exports.

**`src/js/main.js`**: Wires `setComponentRenderFn(renderAll)` and `setCheckEPSDFn(checkEPSDAllocationPrompt)` in `alpine:initialized`.

**Build output:** 24 modules, 837ms. `main-*.js` reduced from 234 kB → 223 kB (rTable deletion).



### Added — SWA Rewrite: Vite + ES Modules + Full Alpine Settings

**Major version bump.** The `src/` directory now contains a fully working Vite-built version of the app — both the main plan view and the settings page — with ES modules throughout. The root-level app is untouched; this is an additive rewrite target.

#### `src/` — New Vite application

**Entry points:**
- `src/index.html` — main plan page; single `<script type="module" src="./js/main.js">` replacing all script tags
- `src/settings.html` — settings page; full Alpine template with `<body x-data="settingsPage">`; 4 `x-show` tab panels; confirm modal in `#modal-root`; `<script type="module" src="./js/settings-main.js">`

**Module files created:**

| File | Responsibility |
|------|----------------|
| `src/js/data.js` | `export const state = {...}` singleton; all helper functions as named exports |
| `src/js/storage.js` | `export const Storage`; `triggerAutoSave`, `saveToStorage` as named exports |
| `src/js/history.js` | `mutate()`, `performUndo/Redo`, `setRenderFn`/`setSyncFn` registration; `structuredClone()` replaces `JSON.parse/stringify` (resolves EN-04) |
| `src/js/store.js` | `registerStores(Alpine)`, `syncStore()`, `setStoreSyncRender(fn)` exports; filter setters on plan store call `_render()` |
| `src/js/modals.js` | Thin wrappers + `setModalRenderFn(fn)`; `setDateRangePreset` parses month keys from `YYYY-MM` format |
| `src/js/chart.js` | `import Chart from 'chart.js/auto'`; module-level `let capacityChart` |
| `src/js/keyboard.js` | Direct port; imports from `./history.js` and `./toast.js` |
| `src/js/components.js` | `registerComponents(Alpine)`; `customDropdown.select()` calls store methods; transitional `window.*` exports marked TODO |
| `src/js/app.js` | `renderAll`, inline edit workflow, all mutation functions using `state.*`; `window.cycleRAG = cycleRAG` etc. (transitional, Phase 4 target) |
| `src/js/main.js` | Wires `setRenderFn`, `setSyncFn`, `setStoreSyncRender`, `setModalRenderFn` all to `renderAll`/`syncStore` in `alpine:initialized` |
| `src/js/settings-page.js` | `settingsPage()` Alpine factory — 4-tab logic, all mutations via `mutate()`, `filteredCountries` getter, inline per-row `x-data` for availability planning |
| `src/js/settings-main.js` | Settings page entry point — `registerStores`, `Alpine.data('settingsPage')`, `Alpine.start()`, storage init |
| `src/js/countries.js` | Direct port of `js/countries.js` with ES module exports |
| `src/js/toast.js` | `showToast` extracted from history.js as named export |

**Key architectural decisions:**
- `export const state` singleton — bare `let` globals can't be re-assigned across ES module boundaries
- Circular dependency `history.js` ↔ `app.js` resolved via `setRenderFn`/`setSyncFn` registration (no circular imports)
- Store filter setters wired to `renderAll` via `setStoreSyncRender(fn)` from `main.js`
- `setDateRangePreset` wired to `renderAll` via `setModalRenderFn(fn)` from `main.js`
- Settings page: 4 tabs always in DOM with `x-show`; availability planning per-employee uses inline `x-data` sub-component per `x-for` row
- Transitional `window.*` exports in `app.js` for `rTable()` onclick strings — all marked `// TODO: Remove when table is Alpinified (Phase 4)`

**Build output (`npm run build`):**
```
dist/index.html        21.72 kB  │ gzip:  3.67 kB
dist/settings.html     23.91 kB  │ gzip:  5.08 kB
dist/assets/*.css      32.19 kB  │ gzip:  5.88 kB
dist/assets/main-*.js 247.04 kB  │ gzip: 82.39 kB
24 modules, ✓ built in 873ms
```

**Phase 4 (separate session):** Table Alpinification — replace `rTable()` with `x-for` template, inline edit becomes `x-show` toggle, eliminates all `window.*` assignments from `app.js`.

---

## [2.2.6] - 2026-03-26

### Fixed — EN-01: Full interactive-state audit (`:hover`, `:focus-visible`, `:active`, `:disabled`)

**Problem:** Fourteen interactive element classes in `css/styles.css` were missing one or more
required interactive states. Keyboard users had no visible focus indicator on legacy buttons,
toolbar controls, the back button, settings tabs, project links, and editable cells. Disabled
form inputs had no visual feedback. There was no `:active` press feedback on most button types.

**`css/styles.css`** — added missing states to every affected element (file version 1.3.1 → 1.3.2):

| Element | States added |
|---------|-------------|
| `.btn-prim` | `:focus-visible`, `:active`, `:disabled` |
| `.btn-sec` | `:focus-visible`, `:active`, `:disabled` |
| `.filter-btn`, `.ctrl-btn`, `.ctrl-select` (shared base) | `:focus-visible`, `:active` (select excluded from `:active`) |
| `.filter-clear-btn` | `:focus-visible` (danger-color ring), `:active` |
| `.form-input` | `:hover:not(:focus)`, `:disabled` |
| `.form-select` | `:hover:not(:focus)`, `:disabled` |
| `.cfg-input` | `:hover:not(:focus)`, `:focus`, `:disabled` (had no states at all) |
| `.fc-input` | `:hover:not(:focus)`, `:disabled` |
| `.back-button` | `:focus-visible`, `:active` |
| `.settings-tab` | `:focus-visible` (inset ring), `:active` |
| `.modal__close` | `:active` |
| `.project-link` | `:focus-visible` |
| `.editable` | `:focus-visible` (inset ring), `:active` |
| `.lib-back-link`, `.lib-intro-links a`, `.lib-footer a` | `:focus-visible` |

**Token usage:** All focus rings use `outline: 2px solid var(--color-accent)` (consistent with the
existing BEM `.btn:focus-visible` rule). Disabled inputs use `background: var(--color-gray-100)`.
Hover on inputs uses `:hover:not(:focus)` to prevent the hover border from overriding the
blue focus ring when both states apply simultaneously.

**Already-complete elements (no changes needed):** BEM `.btn--primary`, `.btn--ghost`,
`.btn--danger` — all four states were present from v2.1.9.

---

## [2.2.5] - 2026-03-26

### Fixed — CSS-01: Missing semantic token aliases for BEM modal/button system

**Problem:** The BEM modal and button system (introduced v2.1.9) references canonical token names
(`--color-accent`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-muted`,
`--color-text-inverse`, `--color-background`, `--color-surface-alt`, `--spacing-xs/sm/md/lg`,
`--font-size-xs/sm/md`, `--font-weight-medium/semibold`, `--duration-fast`) that were never added
to `design-tokens.css`. This caused transparent modal backgrounds, invisible button text, and
zero padding on all `.btn--*` and `.modal__*` elements.

**`css/design-tokens.css`** — 20 semantic alias tokens added under a new `SEMANTIC ALIASES` section:

| Group | Tokens |
|-------|--------|
| Color (10) | `--color-accent`, `--color-accent-hover`, `--color-accent-subtle`, `--color-surface`, `--color-surface-alt`, `--color-border`, `--color-text-primary`, `--color-text-muted`, `--color-text-inverse`, `--color-background` |
| Spacing (4) | `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg` |
| Font size (3) | `--font-size-xs`, `--font-size-sm`, `--font-size-md` |
| Font weight (2) | `--font-weight-medium`, `--font-weight-semibold` |
| Duration (1) | `--duration-fast` |

Each alias is a `var()` reference to its palette equivalent (e.g. `--color-accent: var(--color-primary)`);
visual output is unchanged — the tokens were just missing their definitions.

### Fixed — IM-06: Component library fully synced to v2.2.5

**`component-library.html`** — full audit pass performed; all gaps with the live app resolved:
- Version updated from v2.1.7 → v2.2.5 in page title, header badge, and footer
- **BEM Button system** section added — `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--danger`,
  `.btn--sm` with all interactive states (hover/focus/active/disabled) — was completely absent
- **BEM Modal system** section updated — old single-div placeholder replaced with full
  `.modal-backdrop` + `.modal__header/body/footer` structural examples including size variants
  (`.modal--sm`, `.modal--md`, `.modal--lg`) and helper classes
- **Keyboard Help Modal** section added — `.kbd-help__*` layout classes and `<kbd>` element
  styling — was completely absent
- **Form error state** demo updated to use `.form-field.has-error` + `.form-error` BEM pattern
  (was using an ad-hoc inline override)
- `<!-- SYNC CHECK: v2.2.5 -->` comment added to page header

---

## [2.2.4] - 2026-03-26

### Fixed — IM-05: Local vendor fallbacks for Alpine.js and Chart.js (CDN resilience)

**Problem:** Alpine.js and Chart.js were loaded exclusively from `cdn.jsdelivr.net` with no
fallback. On SharePoint deployments behind corporate firewalls or network policies that block
external CDNs, the app would silently fail to load with no recovery path.

**Changes:**

`js/vendor/` — new directory with two vendored files:
- `js/vendor/alpinejs.min.js` — Alpine.js v3.14.8 (44,758 bytes; sourced from jsDelivr CDN)
- `js/vendor/chart.umd.min.js` — Chart.js v4.4.0 (205,222 bytes; sourced from jsDelivr CDN)
- `js/vendor/README.md` — documents the vendored libraries, versions, CDN sources, and
  update procedure

`index.html` — `onerror` fallback handlers added to both CDN `<script>` tags:
- Chart.js CDN `<script>`: `onerror` injects `js/vendor/chart.umd.min.js` if CDN request fails
- Alpine.js CDN `<script defer>`: `onerror` injects `js/vendor/alpinejs.min.js` (with `defer`)
  if CDN request fails

`settings.html` — same `onerror` handler added to the Alpine.js CDN `<script defer>` tag.

**Fallback mechanism:** `onerror` fires when the browser receives a network error or blocked
request for the CDN URL. A new `<script>` element pointing to the local vendor file is
dynamically appended to `<head>` with the same `defer` attribute (for Alpine) to preserve
correct initialisation order.

**No changes to `component-library.html`** — that page does not load Alpine.js or Chart.js
(it is a static HTML showcase with no dynamic functionality).

---

## [2.2.1] - 2026-03-26

### Changed — Dead settings modal code removed from `js/modals.js` (CR-05 fully resolved)

**`js/modals.js`** — three dead functions deleted:
- `showSettingsModal()` — built a settings overlay via `innerHTML`; unreachable because the
  Settings button navigates to `settings.html` and `Ctrl+,` in `keyboard.js` does the same
- `switchSettingsTab(tab)` — tab-switching helper for the settings overlay; unused
- `renderEmployeesTab()` / `renderCalendarTab()` — inline HTML generators for the overlay tabs; unused

`closeModal()` simplified: the `document.getElementById('settings-modal-root').innerHTML = ''`
line was removed; `closeModal()` now delegates entirely to `Alpine.store('modal').close()`.

**`index.html`** — `<div id="settings-modal-root">` removed (was the mount point for the now-deleted
settings overlay; had no other purpose).

### Result
`js/modals.js` now contains **zero `innerHTML` usage**. CR-05 is fully resolved. Three
previously identified new issues documented in `CODE_REVIEW.md`: KJ-01 (`showKeyboardHelp` DOM
rendering), KJ-02 (`focusFilters` broken selector), APP-01 (`editEPSD` dead code).

---

## [2.2.0] - 2026-03-26

### Changed — Final raw hex elimination from `css/styles.css` (CR-02 fully resolved)

**`css/styles.css`** — 7 remaining raw colour values replaced with design tokens:
- `color: #fff` → `var(--color-text-inverse)` in `.btn--primary` and `.btn--danger`
- `background/border-color: var(--color-danger, #ef4444)` → `var(--color-danger-error)` in
  `.btn--danger`, `.form-field.has-error`, and `.form-error` (fallback removed — token is always defined)
- `background: rgba(0, 0, 0, 0.45)` → `var(--color-bg-modal)` in `.modal-backdrop`

**`css/design-tokens.css`** — `--color-bg-modal` updated from `rgba(0,0,0,0.4)` to
`rgba(0,0,0,0.45)` to match the value used in the modal backdrop (standardises both the old
`.modal-bg` overlay and the new `.modal-backdrop`).

### Result
`css/styles.css` now contains **zero raw hex, rgb(), or rgba() colour values** in component
rules. All colour decisions flow through `css/design-tokens.css`. CR-02 is fully resolved.

---

## [2.1.10] - 2026-03-26

### Changed — Component library inline `<style>` moved to `css/styles.css` (CR-03)

**`component-library.html`** — `<style>` block removed (~290 lines):
- All `.lib-*` layout and chrome styles that were page-local `<style>` declarations are now in `css/styles.css` under the `COMPONENT LIBRARY PAGE` section
- This was the last page in the project with a `<style>` block; all styling now flows through `css/design-tokens.css` → `css/styles.css`

**`css/styles.css`** — new `COMPONENT LIBRARY PAGE` section added:
- Contains every `.lib-*`, `.component-example`, `.code-block`, `.swatch*`, `.typography-example`, `.spacing-row/bar/label`, `.lib-do/dont-list`, `.lib-notes`, `.cl-flex*` rule previously inlined in `component-library.html`
- Raw hex `color: #1e3a8a` (blue-900 in `.lib-intro h2`) replaced with `var(--color-gray-900)` — the only remaining raw colour in the removed block
- All other values were already token-based

**`component-library.html`** — Modals section description updated:
- Stale text referring to `innerHTML`-based modals and CR-05 as "planned" replaced with accurate description of the current Alpine `x-show`/`x-data` architecture (CR-05 was completed in v2.1.9)

### Technical
- Zero inline `<style>` blocks remain across all three app pages (`index.html`, `settings.html`, `component-library.html`)
- No visual output changes; styles are byte-for-byte equivalent

---

## [2.1.9] - 2026-03-26

### Changed — Modal system migrated to Alpine components (CR-05)

**`js/modals.js`** gutted to thin call-site-compatible wrappers:
- `showEmpModal(id)` → `Alpine.store('modal').open('empEdit', {empId})`
- `showDateRangeModal()` → `Alpine.store('modal').open('dateRange', {})`
- `showConfirmModal(opts)` → `Alpine.store('modal').open('confirm', opts)`
- `closeModal()` → `Alpine.store('modal').close()` + clears `#settings-modal-root`
- `confirmEmp`, `showModalError`, `clearModalErrors` removed (now handled by `empModal` Alpine component)
- Settings modal retargeted to `#settings-modal-root` so its `innerHTML =` no longer clobbers Alpine modal templates

**`js/store.js`** — `Alpine.store('modal')` expanded: `open(name, payload)` / `close()` methods; focus moves to first interactive element on open via `$nextTick`

**`js/components.js`** — three new `Alpine.data()` components: `confirmModal`, `dateRangeModal`, `empModal` (full client-side validation)

**`index.html`** — static Alpine modal markup added inside `#modal-root`; `<div id="settings-modal-root">` added separately; `style="display:none"` prevents FOUM before Alpine boots

**`css/styles.css`** — new sections: Modal System (`.modal-backdrop`, `.modal--sm/md/lg`, `.modal__*`), Button System (`.btn`, `.btn--primary/ghost/danger/sm`), Form Helpers (`.form-field`, `.form-error`, `.form-date-pair`). All values use design tokens — zero raw hex.

### Architecture
- Eliminates `innerHTML`-for-modals for emp/dateRange/confirm modals
- Settings modal remains `innerHTML`-based (known migration target — tracked in CODE_REVIEW CR-05)
- Backward-compatible: all existing call sites unchanged

## [2.1.8] - 2026-03-26

### Changed — Named mutation dispatcher (`mutate()`) replaces ad-hoc mutation pattern

**`js/history.js` — `mutate()` function added**
- New `mutate(op, fn, meta = {})` function centralises every persistent data change behind a single entry point
- Responsibilities in order: ① `captureUndoSnapshot()` → ② `fn()` (the mutation) → ③ `triggerAutoSave()` → ④ `syncStore()`
- `op` (string) and `meta` (object) are pre-wired audit-trail hooks; adding a full audit log in future requires one new line inside `mutate()` — no call-site changes needed
- Placed in `history.js` (alongside `captureUndoSnapshot`) rather than `data.js` (migration target) or `app.js` (too late in dependency chain to be the canonical home)

**`js/app.js` — all 13 `captureUndoSnapshot()` call sites migrated to `mutate()`**

| Function | Operation name | Notes |
|---|---|---|
| `copyEntry()` | `'copyEntry'` | `newId` written to outer scope via closure |
| `delEntry()` `onConfirm` | `'deleteEntry'` | Inside confirm callback |
| `delEmp()` `onConfirm` | `'deleteEmployee'` | Removes employee + all their entries |
| `updEmp()` | `'updateEmployee'` | |
| `updMonth()` | `'updateMonth'` | |
| `startInlineAdd()` | `'addEntry'` | UI state (`editingRowId`) set before `mutate()` |
| `saveRowEdit()` existing | `'saveEntry'` | DOM reads extracted before `mutate()` call |
| `saveRowEdit()` new entry | *(no mutate)* | Undo snapshot already captured in `startInlineAdd()`; `triggerAutoSave()` called directly |
| `cycleRAG()` | `'cycleRag'` | `nextStatus` computed before closure |
| `editEPSD()` confirm | `'setEpsd'` | `oldEPSD` captured before closure |
| `editEPSD()` cancel (clear) | `'clearEpsd'` | |
| `checkEPSDAllocationPrompt()` case 1 | `'clearAllocationsAfterEpsd'` | |
| `checkEPSDAllocationPrompt()` case 2 | `'extendAllocationsToEpsd'` | |
| `editFixedAllocationDesc()` save | `'updateFixedAllocationDesc'` | UI state cleared before `mutate()` |

**`saveRowEdit()` restructured**
- All DOM reads (`getElementById`, `querySelectorAll`) now happen before any data mutation, making the "read phase" and "write phase" clearly separate
- Validation (`newDays` array construction) also runs in the read phase
- The `if (!isNewEntry) mutate(...) else { ... triggerAutoSave() }` branch is explicit and self-documenting

### Technical
- `captureUndoSnapshot()` is no longer called directly outside `history.js` — all callers use `mutate()` instead
- `triggerAutoSave()` is no longer called after individual mutations in `app.js` — `mutate()` handles it; the two remaining direct calls (`setGroupBy`, `clearAllFilters`) are intentional (view-preference saves, not data mutations)
- No user-facing behaviour changes; undo/redo, auto-save, and Alpine reactivity all work identically

## [2.1.7] - 2026-03-26

### Changed — Complete design-token coverage for filter, project-link & card CSS

**`css/design-tokens.css` — 5 new tokens added (v1.3.0 → v1.3.1)**
- `--color-primary-bg-light: #f0f9ff` — sky-50; filter option hover background (lighter than active)
- `--color-primary-bg-active: #dbeafe` — blue-100; filter option selected hover / active item background
- `--color-danger-bg-subtle: #fef2f2` — red-50; clear-button resting background
- `--color-danger-border: #fecaca` — red-200; clear-button resting border
- `--shadow-panel: 0 8px 24px rgba(0,0,0,0.12)` — floating dropdown / panel shadow

**`css/styles.css` — all remaining raw hex values in three sections tokenised**
- **`.project-link` / `.project-link:hover` / `.project-link .link-icon`** — 4 hex literals + 1 raw `px` replaced with `--color-primary-border-strong`, `--color-primary`, `--color-primary-light`, `--text-xs`, `--space-1`, `--transition-fast`
- **Filter panel & search input** (`.filter-panel`, `.filter-panel-search input`) — 3 hex + raw `px` values → `--color-gray-200`, `--shadow-panel`, `--z-modal`, `--text-md`, `--space-2`, `--radius-base`, `--color-gray-700`
- **Filter option rows** (`.filter-opt`, `:hover`, `[aria-selected]`) — 5 hex literals → `--color-gray-700`, `--text-lg`, `--space-3`, `--color-primary-bg-light`, `--color-primary`, `--color-primary-bg`, `--color-primary-bg-active`, `--color-primary-light`, `--space-1`
- **Clear-all button** (`.filter-clear-btn`, `:hover`) — 4 hex literals → `--text-md`, `--color-danger-bg-subtle`, `--color-danger-border`, `--space-1`, `--shadow-sm`, `--color-danger-bg`, `--color-danger-light`
- **Month card value/pct** (`.card-value`, `.card-pct`) — 3 raw px + `line-height: 1` → `--text-3xl`, `--leading-none`, `--space-1`, `--text-base`

### Technical
- Zero raw hex values remain in the filter component, project-link, or card text CSS
- All hardcoded `rgba()` shadow values replaced with named shadow tokens
- `z-index: 200` on `.filter-panel` replaced with `var(--z-modal)` for consistency

## [2.1.6] - 2026-03-25

### Changed — Inline styles extracted to semantic CSS classes

**`index.html` — 3 static `style=` attributes removed**
- Card strip wrapper: `style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px"` → `class="card-strip"`
- Card month label: `style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.05em"` → `class="card-month-label"`
- Card bottom text: `style="font-size:9px;color:#9ca3af;margin-top:3px"` → `class="card-bottom-text"`
- Alpine `:style=` bindings for dynamic colors (`card.bg`, `card.bd`, `card.tx`) retained unchanged — they carry runtime values and cannot be moved to CSS

**`settings.html` — inline styles + page-scoped `<style>` block fully removed**
- `<style>` block (12 class rules) deleted from `<head>`; all rules migrated to `css/styles.css`
- `<body style="background:#f3f4f6;margin:0;font-family:...">` → `<body class="settings-page">`
- `<h1 style="font-size:24px;font-weight:700;color:#111827;margin:0">` → `<h1>` (styled via `.settings-header h1` selector)

**`css/styles.css` — two new sections added (v1.3.0 → v1.3.1)**
- **`MONTH CARD INNER ELEMENTS`** section — 3 new rules:
  - `.card-strip` — flex row; gap, overflow-x, padding-bottom
  - `.card-month-label` — 10px bold label; `--text-sm`, `--font-bold`, `--color-gray-neutral-500`, `--tracking-wide`
  - `.card-bottom-text` — 9px detail line; `--text-xs`, `--color-gray-neutral-400`
- **`SETTINGS PAGE`** section — 12 rules migrated from `settings.html` with all hex literals replaced by design tokens:
  - `.settings-page` — body class; `--color-gray-neutral-100` background, margin reset
  - `.settings-header` + `.settings-header h1` — flex header bar; size/weight/color from tokens
  - `.settings-tabs` + `.settings-tab` + `:hover` + `.active` — tab strip; all colors/spacing tokenised
  - `.settings-content` — content area; `--space-6` padding, 1400px max-width
  - `.back-button` + `:hover` — back-link button; `--radius-lg`, `--color-gray-neutral-300` border
  - `.settings-table` + `th` + `td` + `tr:hover` — data table; `--space-3 --space-4` padding, `--tracking-wide`
  - `.fc-input` + `:focus` — fixed-commitment % input; `--radius-md`, `--shadow-focus-input`

### Technical
- Zero `style=` attributes remain in `index.html` or `settings.html` (Alpine `:style=` object bindings with runtime values are not inline styles)
- All migrated values reference design tokens; no new hardcoded hex or pixel literals introduced
- Visual output pixel-identical to v2.1.5

## [2.1.5] - 2026-03-25

### Changed — Remove Tailwind CDN; replace with hand-written CSS + semantic classes

**Phase B — `css/utilities.css` + CDN removal**
- **`index.html`** — removed `<script src="https://cdn.tailwindcss.com">` from `<head>`; replaced with `<link rel="stylesheet" href="css/utilities.css">` (temporary file, deleted in Phase C below)
- **`settings.html`** — removed `<script src="https://cdn.tailwindcss.com">` and the now-dead `tailwind.config` colour-extension script block; `settings.html` carried no Tailwind utility classes in its markup, so the removal is side-effect free
- **`css/utilities.css`** *(created then deleted in same version)* — 27 hand-written one-to-one CSS rule equivalents for every Tailwind utility class that remained in `index.html`:
  - Layout: `flex`, `flex-wrap`, `items-start`, `items-center`, `justify-between`
  - Gap: `gap-2`, `gap-3`
  - Margin: `mb-2`, `mb-5`, `mt-0.5`
  - Page-body: `bg-slate-100`, `min-h-screen`, `p-4`, `md:p-6` (with `@media` query)
  - Font size: `text-xs`, `text-sm`, `text-2xl`
  - Font weight: `font-normal`, `font-semibold`, `font-bold`
  - Colour: `text-gray-400`, `text-gray-500`, `text-gray-900`
  - Transform / tracking: `uppercase`, `normal-case`, `tracking-tight`, `tracking-widest`

**Phase C — Semantic classes replace utilities**
- **`css/styles.css`** — new `PAGE LAYOUT` section added with 8 semantic classes (all values reference existing design tokens where available):
  - `.app-page` — body wrapper for `index.html` only; `background`, `min-height`, `padding` with `@media (min-width:768px)` responsive override; scoped to a class rather than the `body` rule so `settings.html` layout is unaffected
  - `.page-header` — title row flex container (justify-between, gap, margin-bottom)
  - `.page-title` — plan name `<h1>`: size `--text-5xl` (24px), bold, `--color-gray-900`, letter-spacing −0.025em
  - `.page-subtitle` — employee count `<p>`: size `--text-xl` (14px), `--color-gray-neutral-500`, 2px top margin
  - `.controls-row` — filter + toolbar button flex container (wrap, gap)
  - `.summary-section` — summary cards outer wrapper (margin-bottom)
  - `.summary-empty` — "no employees" empty-state paragraph
  - `.summary-label` — "Monthly Availability" label row (uppercase, semibold, letter-spacing); `.summary-label span` child rule overrides to `normal-case`, `font-normal` (eliminates the need for utility classes on the subtitle span)
- **`index.html`** — 7 multi-class Tailwind utility strings replaced with single semantic class names:
  - `<body class="bg-slate-100 min-h-screen p-4 md:p-6">` → `class="app-page"`
  - Title row div → `class="page-header"`
  - Plan name `<h1>` → `class="page-title"`
  - Employee count `<p>` → `class="page-subtitle"`
  - Controls div → `class="controls-row"`
  - Summary outer `<div>` → `class="summary-section"`
  - "No employees" `<p>` → `class="summary-empty"`
  - Monthly Availability `<div>` → `class="summary-label"`; `class="normal-case font-normal text-gray-400"` removed from the inner `<span>` (now handled by `.summary-label span` CSS)
- **`css/utilities.css`** — deleted; all 27 utility rules are now embedded in semantic classes in `styles.css`; `<link>` tag removed from `index.html`

### Technical
- Zero external CSS dependencies remain; both pages load only `css/design-tokens.css` + `css/styles.css`
- Visual output is pixel-identical to v2.1.4 — every Tailwind value was matched exactly (e.g. `text-xs` = 12px, `text-sm` = 14px, `tracking-widest` = 0.1em)
- `settings.html` unaffected: it used no Tailwind utility classes; only the dead CDN script + config block were removed

## [2.1.4] - 2026-03-25

### Fixed — ctrl-select text clipping + Clear Filters button sizing
- **`css/styles.css`** — `.ctrl-select`: added `padding-top: 0; padding-bottom: 0` override; with the 6px top/bottom padding inherited from the shared base and `height: 27px`, the available content area was exactly 13px — matching the line-height but leaving no room for native widget rendering, which clipped descenders; zeroing the vertical padding gives the full 25px interior to the browser's native select renderer
- **`css/styles.css`** — `.filter-clear-btn`: reduced `padding` from `6px 12px` → `4px 10px` and `font-weight` from `--font-semibold` → `--font-medium`; the button is a dismissive secondary action and should read smaller than the main toolbar controls

## [2.1.3] - 2026-03-25

### Fixed — ctrl-select height normalisation
- **`css/styles.css`** — `.ctrl-select` now sets `height: var(--toolbar-ctrl-height)` (27px) so the Group By native select matches the computed height of the filter and ctrl buttons; native selects ignore padding for height, making an explicit height necessary

### Changed — toolbar base rule fully tokenised
- All hardcoded values in the `.filter-btn, .ctrl-btn, .ctrl-select` shared base rule replaced with design tokens:
  - `13px` → `var(--text-lg)`
  - `#d1d5db` → `var(--color-gray-neutral-300)`
  - `6px 12px` → `var(--padding-button-toolbar)` (new token)
  - `0 1px 2px rgba(0,0,0,.05)` → `var(--shadow-sm)`
  - `#374151` → `var(--color-gray-700)`
  - `1` → `var(--leading-none)`
  - `box-sizing: border-box` added to the base rule
- **`css/design-tokens.css`** — two new tokens added to the padding section:
  - `--padding-button-toolbar: 6px 12px` — toolbar control padding (filter dropdowns, ctrl-btn, ctrl-select)
  - `--toolbar-ctrl-height: 27px` — normalised toolbar control height (derived: font 13px + padding 12px + border 2px)
  - Clarified comments on existing `--padding-button` and `--padding-button-sm` tokens

## [2.1.2] - 2026-03-25

### Changed — Toolbar controls centralised to CSS classes
- **`css/styles.css`** — `FILTER BAR` section refactored:
  - Shared base rule `.filter-btn, .ctrl-btn, .ctrl-select { … }` introduced — all seven toolbar controls now inherit font-size, weight, border, radius, padding, shadow, and transition from a single declaration; changing any of these updates the entire toolbar
  - `.filter-btn` retains only its additions over the base: `display:inline-flex`, `align-items:center`, `gap`, and slightly tighter right padding for the chevron
  - New `.ctrl-select` — Group By native select; adds `font-family: var(--font-base)` override (native selects don't inherit it automatically)
  - New `.ctrl-btn` — plain ghost button (Date Range); no additions beyond the shared base
  - New `.ctrl-btn--cta` modifier — blue fill + white text (Settings button); overrides bg/color/border-color
- **`index.html`** — long Tailwind utility strings removed from three elements:
  - Group By `<select>`: 13-class Tailwind string → `class="ctrl-select"`
  - Date Range `<button>`: 11-class Tailwind string → `class="ctrl-btn"`
  - Settings `<button>`: 12-class Tailwind string → `class="ctrl-btn ctrl-btn--cta"`

### Technical
- All toolbar visual decisions now live exclusively in `css/styles.css`; no per-element inline or Tailwind utility styling remains in the toolbar HTML
- To restyle the entire toolbar (font, size, radius, shadow) — edit the single shared base rule

## [2.1.1] - 2026-03-25

### Fixed — Filter bar inline styles extracted to CSS classes
- **`x-data` on `<body>`** — added `x-data` attribute to `<body>` in `index.html` so Alpine's `$store` is accessible from the top-level template (was causing `$store.plan` to be undefined on initial render)
- **Alpine `:style` string vs object conflict** — when a string-valued `:style` binding and a static `style` attribute coexist on the same element, Alpine replaces the entire `style` attribute, wiping all static properties; resolved by moving every static property to a CSS class and keeping only dynamic values in `:style` as an object literal (`{color: card.tx}`)
- **All `@mouseover`/`@mouseout` JS colour handlers removed** — hover state on filter option rows is now handled by `.filter-opt:hover` CSS; no JavaScript needed

### Changed
- **`css/styles.css`** — new `FILTER BAR` and `MONTH CARD TEXT` sections added:
  - `.filter-dropdown` — wrapper positioning
  - `.filter-btn` / `.filter-btn--active` — trigger button base + active (filtered) state
  - `.filter-btn-chevron` — ▾ arrow span
  - `.filter-panel` — dropdown panel container
  - `.filter-panel-search` / `.filter-panel-search input` — search box area
  - `.filter-panel-opts` — scrollable options list
  - `.filter-opt` with `[aria-selected="true"]` and `:hover` selectors
  - `.filter-opt-check` — ✓ selected indicator
  - `.filter-clear-btn` — "Clear filters" button
  - `.card-value` / `.card-pct` — month card availability number and percentage label
- **`index.html`** — filter bar template cleaned up:
  - All four filter dropdowns: `style="..."` + `:style="string"` → CSS classes + `:class="{'filter-btn--active': isFiltered}"`
  - Month card value/pct divs: static `style` → `.card-value`/`.card-pct` classes; `:style` changed from template literal string to object `{color: card.tx}`
  - No functional changes — all Alpine `x-data`, `x-show`, `x-for`, `x-text`, `@click`, keyboard handlers unchanged

### Technical
- All design tokens (`--font-medium`, `--border-thin`, `--radius-lg`, etc.) used where available; raw hex only for values without a matching token
- CSS `:hover` and `[aria-selected="true"]` replace the previous JS-driven `@mouseover`/`@mouseout` handlers entirely

## [2.1.0] - 2026-03-25

### Changed — #app-top converted to Alpine.js (Feature #2010)
- **Filter bar** — all four custom filter dropdowns (ISM, IPM, Location, Type) are now Alpine `x-data="customDropdown(id)"` components instead of `innerHTML`-injected HTML strings
  - Arrow-key navigation properly scrolls the list (browser handles focus natively)
  - `@click.outside` closes the dropdown without a global `document.addEventListener` listener
  - Consistent visual style across all four dropdowns (fixes the `buildFilterDropdown` vs settings page inconsistency)
  - Hierarchical ISM → IPM cascading works correctly via store reactive getters
- **Group By select** — restyled to match filter dropdown trigger buttons using Tailwind classes; font/size mismatch resolved
- **Summary cards** — `rCards()` replaced with `x-for="card in $store.plan.cardData"` loop; `cardData` and `cardSubtitle` computed getters added to the Alpine store
- **Plan title + employee count** — driven by `x-text` bindings on the store; no longer require a `renderAll()` write
- **Clear filters button** — rendered via `x-show="$store.plan.hasActiveFilters"` instead of conditional HTML injection
- **Date Range / Settings buttons** — `@click` Alpine handlers; Date Range label reactive via `x-text`
- `renderAll()` no longer writes to `#app-top` — the first rendered DOM region fully removed from the hybrid innerHTML model
- **Removed from `components.js`:** `_closeAllDropdowns`, `toggleDropdown`, `filterDropdownSearch`, `dropdownKeyNav`, `selectDropdown`, `buildFilterDropdown`, `rHeader()`, `rCards()`, and the global click-outside `document.addEventListener`
- Added `customDropdown` Alpine.data component and `cardData`/`cardSubtitle`/`locationOptions`/`ipmOptions`/`ismOptions`/`hasActiveFilters` getters to `js/store.js`
- Added `[x-cloak]{display:none!important}` rule to `index.html` to prevent dropdown panel flash

### Technical
- `js/store.js` sync() method deduplicated (was accidentally doubled in v2.0.0 patch)
- Backward-compatible: all `setISM`, `setIPM`, `setLocation`, `setType`, `setGroupBy`, `clearAllFilters` global functions unchanged — Alpine calls them as before

## [2.0.0] - 2026-03-25

### Added — Alpine.js Foundation (#2000)
- `js/store.js` — new file; defines `Alpine.store('plan', {...})` and `Alpine.store('modal', {...})` via `alpine:init` listener
  - Store mirrors all `data.js` mutable globals as reactive Alpine properties
  - Computed getters: `visibleMonths`, `visibleEmployees`, `ismOptions`, `ipmOptions`, `locationOptions`, `hasActiveFilters`, `dateRangeLabel`
  - `sync()` method for hybrid-mode: pushes current global values into the store after any mutation
  - `Alpine.store('modal')` stub prepared for v2.3 modal conversion
- `syncStore()` global helper function — safely calls `Alpine.store('plan').sync()`, no-ops if Alpine not yet initialised
- Alpine 3.14.8 CDN (`<script defer>`) added to `index.html` and `settings.html`
- `store.js` loaded in both HTML pages (after `data.js`/`storage.js`, before `app.js`/`settings.js`)

### Changed
- `js/app.js` — `renderAll()` now calls `syncStore()` at the top of every render cycle, keeping the store current for any Alpine templates introduced in subsequent phases (v2.1+)

### Notes
- **Zero visible changes** — app behaviour identical to v1.7.0; this phase is purely architectural plumbing
- **Hybrid mode**: `renderAll()` and `innerHTML` rendering continue unchanged; Alpine store is populated but no Alpine templates exist yet
- Backward compatible; no data migration required


All notable changes to the Capacity Planning Tool will be documented in this file.

## [2.2.3] - 2026-03-26

### Documentation
- **IM-03** — `docs/DESIGN_SYSTEM.md` fully rewritten to reflect current codebase
  - All design token groups documented: full color palette (12 semantic groups), typography scale,
    spacing, border widths/radius, shadows (including focus-ring variants), z-index, motion/transitions
  - Correct component class names: legacy (`.btn-prim`, `.btn-sec`) and BEM (`.btn--primary`,
    `.btn--ghost`, `.btn--danger`) systems both documented with migration guidance
  - Complete component inventory added: filter dropdown, toolbar controls, BEM modal system,
    BEM button/form helpers, keyboard help modal, page layout classes, settings page classes
  - Architecture notes: Alpine state rules, `syncStore()` discipline, SharePoint constraints
  - Coexisting-systems callout documents both legacy and BEM systems and migration path
  - Removed stale inaccuracies: "Tailwind-Based" principle replaced with "Token-Based"; references
    to non-existent `CONTRIBUTING.md` removed; wrong class names corrected throughout

---

## [2.2.2] - 2026-03-26

### Fixed
- **KJ-02** — `focusFilters()` (keyboard shortcut `Ctrl+F`) was targeting a native `<select>` selector (`select[onchange*="setISM"]`) that no longer exists since the filter bar was migrated to Alpine custom dropdowns in v2.1. Updated selector to `.filter-dropdown .filter-btn` and updated toast message to "press Space or Enter to open" to match new UX (`js/keyboard.js`).
- **APP-01** — Removed dead `editEPSD()` function from `js/app.js`. The function called `showPromptModal()` which is not defined anywhere, causing a `ReferenceError` if triggered. EPSD is now edited inline via `startRowEdit()`, making `editEPSD()` unreachable dead code.
- **KJ-01** — Migrated keyboard help overlay from forbidden DOM-manipulation patterns to Alpine.js architecture:
  - Eliminated `document.createElement()`, `innerHTML`, inline `element.style.cssText` strings, raw hex colour values, and an injected `<style>` block with `@keyframes` in `js/keyboard.js`
  - Added `showKeyboardHelp: false` boolean to `Alpine.store('plan')` in `js/store.js`
  - Added static Alpine modal template to `index.html` (inside `#modal-root`) using `x-show`, `x-transition.opacity`, `role="dialog"`, `aria-modal`, `aria-labelledby`, `@keydown.escape.window`, and `@click.self` to close on backdrop click — consistent with the existing modal pattern
  - Added `.kbd-help__*`, `.kbd-row*`, and `kbd` component styles to `css/styles.css` using design tokens exclusively (no raw hex values)
  - `showKeyboardHelp()` and `closeKeyboardHelp()` in `js/keyboard.js` now each set `Alpine.store('plan').showKeyboardHelp` (one line each)

## [Unreleased]

## [1.5.0] - 2026-03-26
### Changed
- **Modal system migrated to Alpine.js** (ISSUE-001 resolved):
  - Added `activeModal`, `modalPayload`, `openModal(name, payload)`, and `closeModal()` to `Alpine.store('plan')` in `store.js`
  - Created `Alpine.data('employeeModal', ...)` component in `components.js` — reactive title/submit label, `x-model` bindings for all fields, inline validation with `.form-error` display, focus management via `$watch` + `$nextTick`, Escape-key close
  - Employee modal in `index.html` now uses `x-show`, `x-data`, `x-model`, `@submit.prevent`, `@keydown.escape` — no `onclick` handlers, no `style.display` toggling, no `document.getElementById()` DOM queries
  - `planTable` component now calls `$store.plan.openModal()` instead of imperative vanilla functions
  - Removed all DOM-manipulation employee functions (`openAddEmployeeModal`, `openEditEmployeeModal`, `closeEmployeeModal`, `saveEmployee`) from `modals.js`
- Added `.form-error` CSS class to `styles.css` using `var(--color-error)` token

## [v1.7.0] - 2026-03-25

### Added
- **#1060 Custom Dropdown Components & Filter Overhaul** (`js/components.js`, `js/app.js`)
  - Replaced all four native `<select>` filter controls (ISM, IPM, Location, Type) with custom dropdown components
  - Each dropdown includes a searchable type-ahead input (filters options in real-time as you type)
  - Full keyboard navigation: `↑`/`↓` move through options, `Enter` selects, `Escape` closes and returns focus to trigger button
  - Active filters shown with blue highlighted trigger button (border + background) for instant visual feedback
  - Selected option marked with `✓` checkmark inside the list
  - ARIA-compliant: `role="combobox"`, `role="listbox"`, `role="option"`, `aria-expanded`, `aria-selected` attributes
  - Click-outside detection closes any open panel (single permanent `document` listener)
  - Group By remains a native `<select>` (3 options, no search needed)
- **Hierarchical ISM → IPM filtering**: selecting an ISM automatically narrows the IPM dropdown to only show employees under that manager; switching ISM resets IPM to "All" if the previously selected employee is no longer in scope
- **"Clear filters" button**: appears in the filter bar whenever any filter is active; resets all four filters at once


## [1.6.3] - 2026-03-25

### Fixed
- **Chart re-initialization bug** (#1080)
  - Root cause: `renderAll()` was calling `capacityChart.destroy(); capacityChart = null` then replacing `#app.innerHTML`, which destroyed the canvas element — so `initChart()`'s `updateChart()` guard never fired and a new Chart.js instance was created on every single render
  - Fix: chart canvas now lives in a dedicated `<div id="chart-container">` outside `#app` (added to `index.html`); `renderAll()` seeds this container once on first render and never touches it again
  - `initChart()` → `updateChart()` path now works correctly for all subsequent renders
  - `capacityChart` persists across `renderAll()` calls; no more destroy/recreate cycle

- **Chart tooltip stale field references** — `m.bhFR` / `m.bhPR` fields were removed in v1.5.0 when the data model migrated to `m.holidays[code]`; tooltip now iterates `activeLocations` and reads `vm.holidays[code]` with a `|| 0` fallback; displays flag emoji per active location

- **Chart date range sync** — chart labels, data, and tooltip were always computed from the full `months` array regardless of the active date range window; all three now use `getVisibleMonths()` so the chart matches the table and summary cards when the date range is filtered

### Technical
- `#chart-container` div added to `index.html` as a sibling of `#app`
- `renderAll()` in `app.js` simplified: no destroy logic, no `rChart()` in `#app` innerHTML
- `calculateChartData()` rewritten to map over `getVisibleMonths()` with proper full-array index lookup
- `updateChart()` now also refreshes `capacityChart.data.labels` before calling `.update()`
- `initChart()` uses `getVisibleMonths().map(m => m.short)` for initial labels

## [1.6.2] - 2026-03-25

### Added
- **Settings Page Keyboard Navigation** ([#1040])
  - `←` / `→` arrow keys cycle through settings tabs (Plan Settings → Employees → Fixed Allocation → Calendar → wrap)
  - `ESC` navigates back to the main capacity plan; when focus is inside an input, first ESC blurs it, second navigates back
  - Arrow navigation is suppressed when focus is in any `<input>`, `<textarea>`, or `<select>` so normal text editing is unaffected
  - Keyboard focus moves to the newly active tab button on each arrow-key switch
  - Tab buttons now carry `role="tab"`, `aria-selected`, and `title` tooltip hints showing the shortcut

### Fixed
- **`switchTab()` event dependency** — function previously read the implicit `event` global to update the active tab button; now uses `data-tab` attribute lookup, making it safe to call programmatically

### Technical
- `data-tab` attributes added to all tab buttons in `settings.html`
- `SETTINGS_TAB_ORDER` constant defines canonical tab sequence
- `role="tablist"` / `role="tab"` / `aria-selected` attributes for ARIA compliance

## [1.6.1] - 2026-03-25

### Fixed
- **EPSD date format** — `formatDateShort()` now returns `DD/MM/YY` (was `MM-DD-YY`) for consistent European date display in view mode

## [1.6.0] - 2026-03-25

### Added
- **Hyperlink Support in Project/Activity Field** ([#1050])
  - **🔗 button** in edit mode — always visible next to the project name input; click to reveal the URL input
  - **Ctrl+K shortcut** — while in row-edit mode, press Ctrl+K anywhere to toggle the URL input
  - **URL input** — hidden by default; auto-revealed when editing a row that already has a URL
  - **✕ button** — clears the URL and hides the input row
  - **View mode** — project names with a URL render as clickable `<a>` links with a `↗` superscript indicator; opens in new tab
  - **Backward compatible** — existing entries without URLs are unaffected
  - **Tab navigation aware** — URL input is skipped by Tab when hidden; included in Tab order when revealed
  - **Undo/Redo** — URL changes saved as part of normal row edit; fully undoable

### Technical
- `projectUrl` field added to entry data model (nullable string)
- Storage migration in `storage.js` adds `projectUrl: null` to all existing entries on load
- `toggleProjectUrlInput()` / `clearProjectUrl()` helper functions in `app.js`
- `setupRowTabNav` updated to skip hidden inputs using `offsetParent` check
- `.project-link` and `.link-icon` CSS classes in `styles.css`
- URL auto-prefixed with `https://` if missing scheme (view mode only)

## [1.5.1] - 2026-03-25

### Fixed
- **Keyboard Handler De-duplication** - Removed redundant Enter/ESC/Shift+Enter handlers from `setupRowTabNav`
  - Previously, both `setupRowTabNav` (per-input listeners) and `globalEditKeyHandler` (document listener) handled Enter/ESC
  - While safe due to DOM spec ordering, the duplication was fragile and harder to maintain
  - `setupRowTabNav` now owns **Tab navigation only**
  - `globalEditKeyHandler` is the single authoritative handler for Enter (save), Shift+Enter (save + add), ESC (cancel)
  - Also removed the redundant row-level ESC listener that was previously attached to the row container

## [1.5.0] - 2026-03-25

### Added - Feature #1030: RAG Status + EPSD Fields
- **RAG Status Column**: Visual project health tracking with color-coded indicators
  - Click to cycle through: None (⚪) → Green (🟢) → Amber (🟡) → Red (🔴) → None
  - Only visible for Project type rows
  - Minimal width column for quick visual scanning
  - Hover effect for better interactivity
- **EPSD Column**: Estimated Production Site Date tracking
  - Date picker modal for easy date entry
  - Format: MM-DD-YY (prepares for future user preferences feature #1240)
  - Click to edit, clear button to remove date
  - Only visible for Project type rows
- **Smart Allocation Logic**: Intelligent prompts when EPSD changes
  - **Moving EPSD earlier**: Prompts to clear allocations after new EPSD (helps transition to hypercare)
  - **Moving EPSD later**: Prompts to extend allocations through new EPSD at previous rate
  - **User control**: All prompts have "Keep As Is" option to preserve manual allocations
- **Updated Table Layout**: `Type | Project | RAG | EPSD | Notes | Months...`
- **Undo/Redo Support**: All RAG and EPSD changes are undo-able with Ctrl+Z

### Changed
- **Data Version**: Bumped to v4 (automatic migration adds ragStatus and epsd fields)
- **Column Positioning**: Adjusted sticky column positions to accommodate new fields
- **All Colspans**: Updated group headers, employee headers, and overhead rows for new layout

### Technical
- Added `formatDateShort()` helper function in data.js for date display
- Added `getMonthKeyFromDate()` helper for EPSD month calculations
- Added `cycleRAG()` function for RAG status cycling
- Added `editEPSD()` function for EPSD editing with modal
- Added `checkEPSDAllocationPrompt()` for smart allocation logic
- Automatic backward compatibility migration in storage.js
- CSS styling for `.col-rag` and `.col-epsd` with proper sticky positioning

### Migration Notes
- Existing data automatically migrates on load (adds null values for new fields)
- No user action required - fully backward compatible
- Users with v1.4.x data will seamlessly upgrade to v1.5.0 structure

## [1.4.1] - March 25, 2026

### Changed
- **Terminology Consistency** - Renamed `projectSettings` to `planSettings` throughout codebase
  - Better semantic alignment with "Plan Settings" UI terminology
  - Affects: js/data.js, js/app.js, js/components.js, js/settings.js, js/storage.js
  - Total: 28 occurrences updated across 5 files
  - Function renamed: `updateProjectSetting()` → `updatePlanSetting()`
  
### Technical
- **Backward Compatibility** - Automatic data migration for existing users
  - `loadFromStorage()` checks for both `planSettings` and legacy `projectSettings`
  - Seamless migration: `planSettings = stored.projectSettings`
  - No data loss or manual intervention required
  
- **Code Quality** - Improved semantic clarity and maintainability
  - Internal variable names now match UI/documentation terminology
  - Cleaner codebase for future development

## [1.4.0] - March 25, 2026

### Added
- **Keyboard Shortcuts** - Streamlined keyboard navigation system
  - **Ctrl+F** - Focus filter dropdown
  - **Ctrl+,** - Open settings page
  - **Ctrl+Z** - Undo last change (up to 50 steps)
  - **Ctrl+Shift+Z** or **Ctrl+Y** - Redo last undone change
  - **Shift+?** - Show keyboard shortcuts help overlay
  - Smart context detection (doesn't trigger when typing in inputs)
  - Visual feedback via toast notifications
  - Removed Ctrl+N and Ctrl+D to avoid browser conflicts

- **Undo/Redo System** - In-memory history management
  - Captures state snapshots before all data modifications
  - Supports up to 50 undo steps (configurable)
  - Works for all operations: add, edit, delete (entries, employees, calendar)
  - Toast notifications show undo/redo actions
  - Preserves data integrity with automatic ID management
  - Foundation for future persistent audit trail
  - Code structured for easy audit logging addition

- **Help Overlay** - Interactive keyboard shortcuts reference
  - Triggered by Shift+? shortcut
  - Clean, organized layout with categories (Navigation, Editing, History, Help)
  - Keyboard key visualization with proper styling
  - Close with ESC or click outside
  - Responsive modal design

- **Custom Confirmation Modals** - Replaced browser confirm() dialogs
  - Modern, accessible confirmation UI
  - Keyboard navigation (Enter to confirm, ESC to cancel)
  - Consistent styling with rest of application
  - Better UX than browser-native confirm dialogs
  - Used for delete operations (rows and employees)

- **Toast Notifications** - Non-intrusive feedback system
  - Slide-in animation from bottom-right
  - Auto-dismiss after configurable duration
  - Used for undo/redo confirmations and shortcut feedback
  - Stacks properly when multiple toasts shown

### Changed
- **Delete Confirmations** - Enhanced with custom modals
  - "This action can be undone with Ctrl+Z" instead of "cannot be undone"
  - Custom modal UI instead of browser confirm() dialogs
  - Better visual hierarchy and clearer messaging
  - Keyboard accessible (Enter/ESC)

- **Script Loading Order** - Added new modules to index.html
  - `js/history.js` - Undo/redo management (loaded before app.js)
  - `js/keyboard.js` - Keyboard shortcuts (loaded before app.js)
  - Proper initialization order maintained

### Technical
- **New Files**
  - `js/history.js` - Undo/redo stack management and toast notifications
  - `js/keyboard.js` - Global keyboard event handling and help modal
  
- **Architecture Improvements**
  - Added `captureUndoSnapshot()` calls before all data modifications
  - Added `saveToStorage()` synchronous save function for undo/redo
  - Proper prevention of recursive undo captures during undo/redo operations
  - ID management to prevent conflicts when restoring state
  - Custom confirmation modal system in modals.js
  - Removed browser-conflicting shortcuts (Ctrl+N, Ctrl+D)

### Documentation
- **ROADMAP.md** - Updated to reflect in-progress features
  - Marked Keyboard Shortcuts and Undo/Redo as "In Progress"
  - Added comprehensive Audit Trail & Version History section to Medium-term
  - Clarified that current undo/redo is foundation for future audit system

## [1.3.0] - March 24, 2026

### Added
- **Input Validation** - Comprehensive validation for all user inputs
  - Day allocations validated (min: 0, max: 31)
  - Negative value prevention with visual feedback
  - Real-time validation during inline editing
  - Alert messages show which fields were corrected
  - Prevents data corruption from invalid inputs

- **Edge Case Handling** - Robust error handling throughout application
  - Division by zero protection in percentage calculations
  - Graceful handling of missing employee/entry references
  - Safe percentage displays when working days = 0
  - Empty data state handling with informative messages
  - Console warnings for debugging unexpected conditions

- **Data Integrity Guards** - Protection against data corruption
  - Confirmation dialogs for destructive operations
  - Delete employee with existing entries shows count and requires confirmation
  - Prevents orphaned entries when deleting employees
  - Availability effective date validation (YYYY-MM format)
  - Storage quota exceeded error handling
  - Cross-field validation (e.g., future availability requires effective date)

### Fixed
- **Type Dropdown Consistency** - Completed Admin→Other rename
  - Inline edit dropdown now shows "Other" instead of "Admin"
  - Consistent with data model and rest of application
  - Clarifies distinction between "Admin Time" (fixed allocation) and "Other" (entry type)

### Documentation
- **COMPLETED_FEATURES.md** - New comprehensive archive of all implemented features
  - Complete version history from v1.0 through v1.3.0
  - Detailed feature descriptions organized by category
  - Browser compatibility notes
  - Known limitations documented
  - Migration notes for terminology changes

- **ROADMAP.md** - Cleaned and reorganized
  - Removed completed items (moved to COMPLETED_FEATURES.md)
  - Clear prioritization: Near-term, Medium-term, Long-term
  - Removed effort estimates for cleaner presentation
  - Focus on user-facing features and benefits
  - Ideas under consideration section for future research

- **IMPROVEMENTS_SUMMARY.md** - Session-specific documentation
  - Detailed technical changes for v1.3.0
  - Code examples and implementation details
  - Testing recommendations

## [1.2.0] - March 2026
## [1.2.0] - March 2026

### Changed - March 2026
- **Terminology Update**: Renamed "FTE" to "Availability" throughout the application for better clarity
  - `fte` → `availability` 
  - `futurefte` → `futureAvailability`
  - `fteEffectiveDate` → `availabilityEffectiveDate`
- **Settings Page UX Overhaul**: Complete redesign of the settings page with improved user experience
  - New tab-based interface: Employees, Fixed Allocation, Calendar
  - Inline editing for employee details on the Employees tab
  - Expandable panel for availability planning (current % → future %)
  - Dedicated Fixed Allocation tab for cleaner organization
  - All numeric inputs now use proper `type="number"` with min/max validation
- **Data Migration**: Automatic migration of old field names to new names when loading data
  - Existing data with `fte`, `futurefte`, `fteEffectiveDate` will be automatically converted
  - No data loss during migration

### Added - March 2026
- Number input fields with decimal support (0.01-1.0) for availability values
- Visual feedback for availability planning (shows current → future when configured)
- Improved validation messages for availability and effective date fields

## [1.0.0] - January 2026

### Added
- **Core Capacity Planning Features**
  - Multi-employee capacity tracking across 14 months (Dec 2025 - Jan 2027)
  - Project, Other work, and Absence entry types
  - Inline editing for quick updates
  - Monthly availability cards with color-coded status
  - Capacity breakdown chart using Chart.js
  
- **Employee Management**
  - Employee profiles with ISM (manager) assignment
  - Location support (🇫🇷 France, 🇨🇿 Prague)
  - FTE/Availability tracking with future planning capability
  - Fixed allocation configuration:
    - Admin Time
    - Training
    - Internal Initiatives
    - CIP Support
    - E&C Activity
  
- **Calendar Management**
  - Working days configuration per month
  - Location-specific bank holidays (France & Prague)
  - Automatic bank holiday deduction in calculations
  
- **Data Management**
  - Auto-save functionality with 500ms debounce
  - LocalStorage persistence
  - Export/Import capability (JSON format)
  - Storage abstraction layer for future SharePoint integration
  
- **User Interface**
  - Responsive design with Tailwind CSS
  - Filter by ISM, IPM, Type, Location
  - Sortable columns (Type, Project, Status)
  - Collapsible fixed allocation details
  - Color-coded availability indicators:
    - 🟢 Green: ≥20% free capacity
    - 🟡 Yellow: 1-19% free capacity
    - 🔴 Red: Overallocated
  
- **Advanced Features**
  - Row copying for quick entry duplication
  - Inline add/edit functionality
  - Percentage calculations relative to working days
  - FTE-adjusted working days display
  - Team aggregation view

### Technical
- Vanilla JavaScript (no framework dependencies)
- Chart.js for visualizations
- Tailwind CSS for styling
- Modular code structure:
  - `js/data.js` - Data model and state management
  - `js/app.js` - Main application logic
  - `js/components.js` - UI rendering functions
  - `js/modals.js` - Modal dialogs
  - `js/storage.js` - Persistence layer
  - `js/settings.js` - Settings page logic

## Documentation
- Comprehensive README with setup instructions
- ROADMAP outlining future enhancements
- Inline code comments for maintainability

---

**Note**: This tool is designed for team capacity planning in SAP EMEA North, but can be adapted for other teams or organizations.