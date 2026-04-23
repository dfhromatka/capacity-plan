# Capacity Planning Tool — Code Review & Improvement Opportunities

> **Last updated:** 2026-04-23 (v3.19.0)
> **Purpose:** Open architectural debt and known issues. Resolved items are in git history.

> **New to the codebase?** Read `docs/ARCHITECTURE.md` first.

---

## Severity

- 🔴 **Critical** — Actively violates architecture rules or will cause bugs
- 🟡 **Important** — Technical debt that degrades maintainability or design consistency
- 🟢 **Enhancement** — Quality improvements beyond the baseline

---

## Open Issues

---

### ARCH-05 — `deleteEntry` bypasses `mutate()` 🔴

**File:** `src/js/store.js` (`deleteEntry` method, ~line 432)

**Symptom:** `deleteEntry` writes directly to `s.entries` without calling `mutate()`. `invalidateEmpStatsCache()` is never called, so `empStats` can serve stale cached values for the deleted entry until the next unrelated mutation. No undo snapshot is taken and no audit entry is created.

```js
deleteEntry(id) {
  const s = Alpine.store('plan');
  s.entries = s.entries.filter(e => e.id !== id);  // bypasses mutate()
  Storage.deleteRecord('entry', id);
}
```

**Fix direction:** Wrap the mutation in `mutate('deleteEntry', () => { s.entries = s.entries.filter(e => e.id !== id); }, { entryId: id }, { type: 'entry', action: 'delete', id })`.

---

### ARCH-06 — In-place `months[idx]` mutation in `updateMonthWorkingDays` / `updateMonthHoliday` 🔴

**File:** `src/js/settings-page.js` (`updateMonthWorkingDays` ~line 319, `updateMonthHoliday` ~line 329)

**Symptom:** Both methods mutate properties directly on the array element (`s.months[idx].workingDays = wd`, `s.months[idx].holidays[code] = hols`). Alpine v3 does not detect nested property mutation — only a reference replacement triggers reactivity. More critically, `state.months` in `data.js` is a **separate reference** from `s.months` (they share elements, not the array). After this mutation, `state.months` is out of sync with the store, so `empStats`, `bh()`, and any function using `state.months` will compute with stale working-day / holiday values until the page is reloaded.

**Fix direction:** Replace both mutations with an immutable map:
```js
s.months = s.months.map((m, i) => i !== idx ? m : { ...m, workingDays: wd });
state.months = s.months;
rebuildMonthIdxMap();
```
Apply the same pattern for the holidays mutation.

---

### ARCH-07 — Duplicate empty `ismOptions` getter 🔴

**File:** `src/js/store.js` (~line 289)

```js
get ismOptions() {
},          // empty first definition — silently overridden by the second below
get ismOptions() {
  const isms = ...
```

Two `get ismOptions()` definitions on the same object literal. The first is empty and the second contains the real implementation. This is dead code and a bundler strictness trap.

**Fix direction:** Delete the empty first `get ismOptions() {}` block (lines 289–291).

---

### ARCH-08 — `tableData` touches non-existent store properties as reactive deps 🟡

**File:** `src/js/store.js` (`tableData` getter, ~line 375)

```js
void this.filterISM; void this.filterIPM; void this.filterLocation; void this.filterType;
```

None of these properties exist on `Alpine.store('plan')`. Alpine v3 cannot proxy non-existent properties — these `void` reads evaluate to `undefined` and register no reactive dependency. The intent was presumably to force `tableData` to re-run on filter change, but `activeFilters` already provides this dependency through `visibleEmployees`. These are misleading dead code.

**Fix direction:** Remove the four nonexistent `void` reads. Add `void this.activeFilters;` explicitly if you want the dependency to be visible at the getter level.

---

### ARCH-09 — `keyboard.js` Escape path bypasses `mutate()` when cancelling a temp entry 🟡

**File:** `src/js/keyboard.js` (~line 25)

```js
Alpine.store('plan').entries = Alpine.store('plan').entries.filter(en => en.id !== editingRowId);
Alpine.store('ui').editingRowId = null;
```

The `entries` write is a data mutation without `mutate()`, so `invalidateEmpStatsCache()` is never called and no audit entry is created. This also duplicates the `cancel()` logic in `tableRow`.

**Fix direction:** Extract a `cancelTempEntry(id)` method on the plan store that calls `mutate()`, and call it from both `keyboard.js` and `tableRow.cancel()`.

---

### REACT-02 — `expandedOH` belongs in `$store.ui`, not `$store.plan` 🟡

**File:** `src/js/store.js` (store definition and `toggleOH`)

`expandedOH` is a display-only toggle that controls whether fixed allocation rows are visible. It lives in `$store.plan`, meaning every OH row toggle triggers a full re-evaluation of `tableData`, `cardData`, and `chartData`. No data changes — only row visibility changes.

**Fix direction:** Move `expandedOH` to `Alpine.store('ui')`. Update `toggleOH()` and all template references from `$store.plan.expandedOH` to `$store.ui.expandedOH`.

---

### REACT-03 — `collapseAllEntries`, `expandedInSummary`, `showArchived` belong in `$store.ui` 🟡

**File:** `src/js/store.js`, `src/index.html`

All three are display-only toggles in `$store.plan`. Every expansion or summary-mode toggle triggers `tableData`/`cardData`/`chartData`. Note: `showArchived` does affect which rows appear in `tableData`, so moving it to `$store.ui` requires `tableData` to explicitly read `Alpine.store('ui').showArchived` — this is the correct solution.

**Fix direction:** Move all three to `Alpine.store('ui')`. In `tableData` / `empEntries`, read `showArchived` from `Alpine.store('ui')` rather than `this`. Update all template references.

---

### REACT-04 — `editDays[cell.i] = ...` is not reactive in Alpine v3 🟡

**File:** `src/js/components.js` (`tableRow` month cell input, ~line 577)

```js
@input="editDays[cell.i] = parseFloat($event.target.value) || 0"
```

`editDays` is a plain `{}` in `x-data`. In-place key assignment on a plain object is not detected by Alpine v3's reactive proxy. Any template expression that reads `editDays[cell.i]` will not re-render. The value is read correctly in `save()` via direct property access, but the pattern should be corrected.

**Fix direction:** Replace with `editDays = { ...editDays, [cell.i]: parseFloat($event.target.value) || 0 }`.

---

### PERF-05 — Per-bar `.filter(type)` inside `chartData` getter 🟡

**File:** `src/js/store.js` (`chartData` getter, ~line 356)

```js
const proj = vis.reduce((sum, emp) => {
  const empList = byEmp.get(emp.id) ?? [];
  return sum + empList.filter(e => e.type === 'Project').reduce(...);
}, 0);
```

Two `.filter()` passes per employee per month bar (once for `'Project'`, once for `!== 'Project'`). With 20 employees × 13 bars that is 520 filter passes per chart render.

**Fix direction:** Pre-build a `Map<empId, {proj: entry[], other: entry[]}>` once at the top of `chartData`, splitting by type in a single O(n) pass through `byEmp`.

---

### PERF-06 — `empStats` O(n) fallback triggered in `getGroupStats` 🟡

**File:** `src/js/data.js` (`empStats` line 304, `getGroupStats` line 421)

```js
const empList = entriesByEmp ? ... : s.entries.filter(e => e.empId === emp.id);
```

`getGroupStats` calls `empStats(emp, firstMonthIndex)` without passing a pre-built map, hitting the O(n) filter fallback for each employee in the group.

**Fix direction:** Thread the `byEmp` map through to `getGroupStats`. `buildTableData` already builds it and is the only caller of `getGroupStats` — pass it as a third argument.

---

### PERF-07 — Redundant `void` dep-touches in `cardData` and `chartData` 🟢

**File:** `src/js/store.js` (~line 327, ~line 347)

```js
void this.employees; void this.entries; void this.months; void this.activeFilters;
```

`visibleEmployees` (called inside both getters) already reads all four, registering the dependencies. The explicit `void` lines cause Alpine to register each dependency twice — each store write schedules two reactive flushes.

**Fix direction:** Remove the explicit `void` lines from `cardData` and `chartData`.

---

### STOR-05 — `saveRecord` / `deleteRecord` azure branch does not return its Promise 🔴

**File:** `src/js/storage.js` (`saveRecord` ~line 62, `deleteRecord` ~line 80)

The `.then().catch()` chain is fire-and-forget — the Promise is not returned. Any caller that `await`s `saveRecord()` resolves immediately with `undefined` rather than waiting for the network round-trip. When the Azure adapter is live this is a silent race condition on every mutation.

**Fix direction:** Return the Promise from both methods:
```js
return this._saveRecordToAzure(type, record).then(...).catch(...);
```

---

### STOR-06 — `_buildSavePayload` persists transient UI state 🟡

**File:** `src/js/storage.js` (`_buildSavePayload`, ~line 382)

`activeFilters`, `filterRowsShown`, `expandedGroups`, `collapseAllEntries`, `expandedInSummary`, and `showArchived` are all persisted in the `state` blob. These are session-only UI preferences. On Azure each filter change will trigger a `saveRecord('appState', ...)` write, adding unnecessary API traffic and noise to the audit trail.

**Fix direction:** Persist only structurally meaningful state: `nextId`, `nextEmpId`, `viewStartIndex`, `sortColumn`, `sortDirection`, `showAvailCards`. Remove the filter and expand state from `_buildSavePayload` and from `loadFromStorage`'s restore block.

---

### STOR-07 — `exportData()` calls `Storage.load()` outside of app init 🟡

**File:** `src/js/settings-page.js` (`exportData`, ~line 354)

```js
async exportData() {
  saveToStorage();
  const data = await Storage.load();
  if (data) Storage.exportToFile(data);
}
```

`Storage.load()` triggers a full `JSON.parse` of the entire dataset (or a full API round-trip on Azure). The intent is to export the freshest data, but `_buildSavePayload()` already builds exactly that shape — no extra round-trip needed.

**Fix direction:** Export `_buildSavePayload` (or add a `Storage.buildPayload()` wrapper) and call `Storage.exportToFile(_buildSavePayload())` directly.

---

### STOR-08 — Keyboard help advertised Ctrl+Z / Ctrl+Y but undo/redo was not implemented ✅ Fixed v3.19.0

Removed both shortcuts from the keyboard help overlay. No handler existed in `keyboard.js` and no undo stack in `history.js`. Deferred undo/redo is tracked separately as #1150.

---

### STOR-09 — Write queue `flushWriteQueue` TOCTOU race 🟢

**File:** `src/js/storage.js` (`_enqueue` / `flushWriteQueue`, ~line 318)

If `flushWriteQueue` is processing (`_writeQueue.splice(0)`) and a new `_enqueue()` call fires during the flush, the new item gets added to `_writeQueue`. If the flush then fails and re-adds failed items, the newly-enqueued item is duplicated. `_writeQueue` is a module-level array mutated in-place.

**Fix direction:** In `flushWriteQueue`, snapshot the queue atomically: `const batch = [..._writeQueue]; _writeQueue.splice(0, batch.length);`. Re-append only the failed items from `batch`, never touching items that arrived after the snapshot.

---

### STORAGE-01 — `_buildSavePayload` may overwrite out-of-window allocations with zeros 🟡

**File:** `src/js/storage.js` (`_buildSavePayload`, ~line 376)

```js
s.months.forEach((m, i) => { allDays[m.key] = e.days[i] || 0; });
```

`e.days` is a positional array sized for the *current* 36-month window. If an entry was created on an older code version where the window was shorter, `e.days.length < s.months.length`, and `e.days[i]` returns `undefined` for tail months. `undefined || 0` writes `0`, **overwriting previously stored non-zero allocations** for those months on the first save after a version upgrade. This is a data loss vector.

**Fix direction:** Guard: `if (i < e.days.length) allDays[m.key] = e.days[i] || 0;` — only write months within the current array bounds.

---

### A11Y-05 — Toggle icons use `<span role="button">` instead of `<button>` 🟡

**File:** `src/index.html` (sidebar filter icons, ~line 227)

The ∑/≡ collapse toggle and the 📦 archive toggle use `<span role="button" tabindex="0">`. `.filter-icon` has no `:focus-visible` rule. Native `<button>` is required by the Alpine-first rule for interactive controls.

**Fix direction:** Replace both `<span role="button">` elements with `<button>` elements. Add `:focus-visible` styling.

---

### A11Y-06 — Sortable `<th>` elements not keyboard accessible 🟡

**File:** `src/index.html` (table header row, ~line 363)

Sortable column headers use `@click` on `<th>` elements with no `tabindex` and no `@keydown.enter` handler. Keyboard users cannot sort.

**Fix direction:** Add `tabindex="0"` and `@keydown.enter.prevent="$store.plan.toggleSort('...')"` to each sortable `<th>`, or wrap the label in a `<button>`.

---

### A11Y-07 — RAG icon is not keyboard accessible 🟡

**File:** `src/index.html` (RAG cell, ~line 559)

```html
<div x-show="row.type === 'Project'" @click.stop="$store.plan.cycleRAG(row.id)" class="rag-icon">
```

Interactive `<div>` with no `role`, no `tabindex`, no keyboard handler, and no `aria-label` describing current state.

**Fix direction:** Replace with `<button>`, add `aria-label` bound to the current RAG value.

---

### A11Y-08 — Settings tabs missing `aria-controls` / `role="tabpanel"` 🟢

**File:** `src/settings.html` (tabs, ~line 20)

Each `<button role="tab">` sets `:aria-selected` but has no `aria-controls` pointing to a panel. No panel has `role="tabpanel"`. Screen readers cannot navigate the tab–panel relationship.

**Fix direction:** Add `id` attributes to each panel's `x-show` div. Add `aria-controls="panel-id"` to each tab button. Add `role="tabpanel"` and `tabindex="0"` to each panel.

---

### CSS-05 — Raw hex colour values used for utilisation bar in JS 🔴

**File:** `src/js/store.js` (`buildTableData`, ~line 63)

```js
const utilColor = util > 0.9 ? '#ef4444' : util > 0.7 ? '#f59e0b' : '#22c55e';
```

Raw hex colours in a JS computed value, bypassing the design token system.

**Fix direction:** Use CSS variable strings: `'var(--color-danger)'`, `'var(--color-warning)'`, `'var(--color-success)'`. These work correctly in Alpine `:style` bindings.

---

### CSS-06 — Hardcoded pixel values in `styles.css` 🟡

**File:** `src/css/styles.css`

- `.col-del > div`: `gap: 2px` (~line 168)
- `.month-nav__btn`: `padding: 1px 3px` (~line 186)
- `.mth-bar`: `height: 3px` (~line 364)

**Fix direction:** Add tokens (`--gap-tight`, etc.) or use the nearest existing spacing token.

---

### CSS-07 — `--shadow-focus-blue` / `--shadow-focus-input` use raw hex instead of palette tokens 🟢

**File:** `src/css/design-tokens.css` (~line 199)

```css
--shadow-focus-blue: 0 0 0 3px #bfdbfe;    /* should be var(--color-primary-border) */
--shadow-focus-input: 0 0 0 3px #dbeafe;   /* should be var(--color-primary-bg-active) */
```

**Fix direction:** Replace raw hex with palette token references. Consider consolidating into a single `--shadow-focus` token.

---

### CSS-08 — Inline `style="resize:vertical"` on settings textarea 🟢

**File:** `src/settings.html` (~line 73)

**Fix direction:** Add `.form-input--resizable { resize: vertical; }` to `styles.css` and apply the class.

---

### JS-05 — `document.querySelectorAll` for animation reset inside Alpine 🟡

**File:** `src/js/components.js` (`selectCond`, ~line 148)

```js
document.querySelectorAll('.row-filter-match > td').forEach(td => {
  td.style.animation = 'none';
  void td.offsetWidth;
  td.style.animation = '';
});
```

Direct DOM queries and `element.style` writes inside an Alpine component — forbidden by architecture rules.

**Fix direction:** Add a `filterAnimKey` counter to `$store.plan`. Increment it when a filter condition is selected. Bind it as a `:key` on filter-match rows via `tableData` so Alpine destroys and recreates those elements, restarting the animation naturally.

---

### JS-06 — `$el.querySelectorAll` in dropdown keyboard nav 🟢

**File:** `src/js/components.js` (`toolbarDropdown.keyNav`, `filterRow.keyNavField`, `filterRow.keyNavCond`)

`$el.querySelectorAll('[data-field-opt]')` used for arrow-key focus management. Less severe than `document.querySelector` but still outside Alpine patterns.

**Fix direction (acceptable exception):** Document as a permitted exception for dropdown keyboard navigation with dynamic item counts, similar to the `keyboard.js` exception. Add an inline comment.

---

### JS-07 — `setTimeout` used instead of `$nextTick` for post-save prompts 🟡

**File:** `src/js/components.js` (`tableRow.save`, ~line 476)

```js
setTimeout(() => checkEPSDAllocationPrompt(...), 100);
setTimeout(() => checkAutoFillPrompt(...), 200);
```

Arbitrary millisecond delays are fragile. The intent is to wait until Alpine has re-rendered.

**Fix direction:** Replace with `this.$nextTick(() => { checkEPSDAllocationPrompt(...); })`. Chain the auto-fill check with a second `$nextTick` call.

---

### JS-08 — `project_pct: 'under'` condition label copy error 🟢

**File:** `src/js/components.js` (`filterRow.condOpts`, ~line 120)

```js
{ value: 'under', label: `Under allocated (>${pct}%)` },
```

Label reads `>` but should read `<` — user-visible display bug. Filter logic is correct.

**Fix direction:** `Under allocated (<${pct}%)`.

---

### JS-09 — Audit `updateFixedAllocationDesc` reads non-existent meta field 🟢

**File:** `src/js/audit.js` (~line 35)

```js
updateFixedAllocationDesc: ['Updated description', m => m.descField],
```

`mutate()` is called with `{ empId, catId, value }` — no `descField` key. Audit entry detail is always `undefined`.

**Fix direction:** Change to `m => m.catId`.

---

### SEC-01 — `resolveCurrentUser()` does not check `resp.ok` before parsing 🟡

**File:** `src/js/main.js` (`resolveCurrentUser`, ~line 16)

```js
const resp = await fetch('/.auth/me');
const { clientPrincipal } = await resp.json();
```

If `/.auth/me` returns a non-200, `resp.json()` may throw on an HTML error body or silently destructure a different shape.

**Fix direction:** Add `if (!resp.ok) return;` before `resp.json()`.

---

### SEC-02 — `type` path segment not encoded in Azure fetch URL 🟡

**File:** `src/js/storage.js` (`_saveRecordToAzure`, ~line 228)

```js
fetch(`/api/records/${type}/${encodeURIComponent(id)}`, ...)
```

`type` is passed directly into the URL without encoding. A malformed type string could alter the request path.

**Fix direction:** `encodeURIComponent(type)` as well, and/or validate `type` against the known taxonomy constant before the fetch.

---

### SEC-03 — `javascript:` URL not blocked in project link `href` 🟢

**File:** `src/index.html` (~line 499)

```js
:href="row.projectUrl.startsWith('http') ? row.projectUrl : 'https://' + row.projectUrl"
```

A URL beginning with `http` (e.g. the literal string `http`) passes the check. `javascript:` URLs can also start with `http` if the user is creative. `rel="noopener noreferrer"` mitigates most risk but doesn't fully block `javascript:` execution in all browsers.

**Fix direction:** On save in `tableRow.save()`, reject or sanitise URLs that don't match `/^https?:\/\//i`. Store only valid URLs; render without the runtime branch.

---

### AZURE-01 — `mutate()` is synchronous; cannot await Azure saves 🔴

**File:** `src/js/history.js`, `src/js/storage.js`

`history.js:mutate()` is fully synchronous and returns nothing. When `adapter === 'azure'`, all `saveRecord` / `deleteRecord` calls are async network operations (fire-and-forget, see STOR-05). There is no mechanism for a mutation caller to know when its data is safely on the server.

**Fix direction:** Decide on the concurrency model before Azure work begins:
- **Option A:** Make `mutate()` return the Promise from `Storage.saveRecord()` — callers can await if they need to. Requires updating all call sites.
- **Option B:** Accept that all writes are background operations; the write queue + `saveStatus` indicator is sufficient for UX. Document this explicitly.

---

### AZURE-02 — Import path calls `Storage.save()` which has no Azure branch 🟡

**File:** `src/js/settings-page.js` (`importData` / `importCapacityPlanCsvHandler`, ~line 373 / ~line 434)

```js
Storage.save(data);
await loadFromStorage();
```

`Storage.save()` only handles `localStorage` and `sharepoint`. On Azure it is a silent no-op.

**Fix direction:** The import flow must be redesigned for Azure: iterate the imported data, call `saveRecord()` for each record type, then call `loadFromStorage()`.

---

### AZURE-03 — `Storage.clear()` has no Azure branch 🟡

**File:** `src/js/storage.js` (`clear`, ~line 33), `src/js/settings-page.js` (`clearAllData`)

`Storage.clear()` removes the `capacityPlanData` localStorage key. On Azure, Table Storage rows remain.

**Fix direction:** Add an Azure branch to `Storage.clear()` that calls a bulk-delete API endpoint, or disable the Clear All Data button when `adapter === 'azure'` until a safe bulk-delete path exists.

---

### AZURE-04 — Per-row JSON.parse in `_reconstructFromRows` aborts on a single bad row 🟡

**File:** `src/js/storage.js` (`_reconstructFromRows`, ~line 213)

```js
const parsed = JSON.parse(row.data);
```

One malformed row from Azure Table Storage causes `JSON.parse` to throw, aborting the entire load and leaving the plan empty.

**Fix direction:** Wrap the per-row parse in `try/catch`, log the offending row, and continue processing the rest.

---

---

### FIX-02 — Tab order skips EPSD/budget inputs in inline edit mode ✅ Fixed v3.16.0

**File:** `src/index.html`

**Cause:** EPSD date and budget hours inputs were wrapped in `<template x-if="row.type === 'Project' && isEditing">`. All other edit-mode inputs use `x-show="isEditing"`. The `x-if` approach removes and re-inserts the DOM element on each edit start, causing undefined tab order.

**Fix:** Replaced `x-if` wrapper with `x-show="isEditing"` on each input directly.

---

### EPSD-01 — `checkEPSDAllocationPrompt` called with stale entry on new rows 🟡

**File:** `src/js/components.js` (tableRow `save()`, ~line 441)

**Symptom:** When saving a newly-added Project row, the post-save lookup may return the wrong entry if multiple rows share the same project name. The `|| entry` fallback passes the pre-save entry object with the old `days` array.

**Fix direction:** Carry the new ID out of the `mutate()` closure and look up `e.id === savedId` directly.

---

### SORT-01 — Project/activity sort ignores row-type grouping 🟡

**File:** `src/js/store.js`

**Symptom:** Sorting by project/activity reorders all rows globally, mixing Project, Admin, and Absence rows.

**Fix direction:** Add a primary sort key on `row.type` using the canonical rank (`Project=0, Other=1, Absence=2`), then secondary sort on the selected column.

---

### FIX-01 — Fixed allocations expand button broken ✅ Fixed v3.16.0

**Root cause (2 bugs):** `x-show` condition always false when `collapseAllEntries` is true; `toggleOH()` and `toggleGroup()` mutated in-place. Both fixed: correct `x-show` condition + object-reference replacement pattern.

---

### KB-01 — Keyboard shortcuts blocked in inline edit mode ✅ Fixed v3.17.0

**File:** `src/js/keyboard.js`

**Fix:** Escape handled globally before `isInInput` guard; `@keydown="handleKeydown"` added directly to all non-month edit inputs.

---

### ARCH-04 — `x-show` used for permanent row-type selection inside `x-for` loops 🟡

**Rule:** If the property tested in `x-show` is permanent for a given item (type never changes while in the DOM), use `x-if` so only the matching template is created.

**Fixed instance:** `src/index.html` `tableData.rows` loop — v3.14.2. No other instances found as of v3.14.2.

---

### TOKEN-01 — Design token system has duplicate aliases and dead tokens ✅ Fixed v3.14.3

Fixed 2026-04-22: 12 alias/dead tokens removed; ~87 replacement references updated. No legacy names remain.

---

### CSS-02 — `.settings-card` uses wrapper divs for spacing ✅ Fixed v3.15.0

Fixed 2026-04-22: `.settings-card` → `flex + gap`; `.settings-field-group` removed.

---

## Summary Table

| ID | Severity | File(s) | Status |
|----|----------|---------|--------|
| ARCH-05 | 🔴 Critical | `src/js/store.js` | `deleteEntry` bypasses `mutate()` |
| ARCH-06 | 🔴 Critical | `src/js/settings-page.js` | In-place `months[idx]` mutation — stale `state.months` |
| ARCH-07 | 🔴 Critical | `src/js/store.js` | Duplicate empty `ismOptions` getter |
| ARCH-08 | 🟡 Important | `src/js/store.js` | `tableData` voids non-existent store props |
| ARCH-09 | 🟡 Important | `src/js/keyboard.js` | Escape cancel-temp-entry bypasses `mutate()` |
| REACT-02 | 🟡 Important | `src/js/store.js` | `expandedOH` should be in `$store.ui` |
| REACT-03 | 🟡 Important | `src/js/store.js`, `src/index.html` | `collapseAllEntries`, `expandedInSummary`, `showArchived` should be in `$store.ui` |
| REACT-04 | 🟡 Important | `src/js/components.js` | `editDays[cell.i] =` not reactive in Alpine v3 |
| PERF-05 | 🟡 Important | `src/js/store.js` | Per-bar `.filter(type)` in `chartData` |
| PERF-06 | 🟡 Important | `src/js/data.js` | `empStats` O(n) fallback in `getGroupStats` |
| PERF-07 | 🟢 Enhancement | `src/js/store.js` | Redundant `void` dep-touches in `cardData`/`chartData` |
| STOR-05 | 🔴 Critical | `src/js/storage.js` | `saveRecord`/`deleteRecord` azure branch not returning Promise |
| STOR-06 | 🟡 Important | `src/js/storage.js` | `_buildSavePayload` persists transient UI state |
| STOR-07 | 🟡 Important | `src/js/settings-page.js` | `exportData()` calls `Storage.load()` in a click handler |
| STOR-08 | ✅ Fixed v3.19.0 | `src/index.html` | Ctrl+Z/Y removed from keyboard overlay |
| STOR-09 | 🟢 Enhancement | `src/js/storage.js` | Write queue flush TOCTOU race |
| STORAGE-01 | 🟡 Important | `src/js/storage.js` | `_buildSavePayload` may zero out-of-window allocations |
| A11Y-05 | 🟡 Important | `src/index.html` | Toggle icons use `<span role="button">` not `<button>` |
| A11Y-06 | 🟡 Important | `src/index.html` | Sortable `<th>` not keyboard accessible |
| A11Y-07 | 🟡 Important | `src/index.html` | RAG icon not keyboard accessible |
| A11Y-08 | 🟢 Enhancement | `src/settings.html` | Tabs missing `aria-controls` / `role="tabpanel"` |
| CSS-05 | 🔴 Critical | `src/js/store.js` | Raw hex colours for utilisation bar |
| CSS-06 | 🟡 Important | `src/css/styles.css` | Hardcoded pixel values (`2px`, `1px 3px`, `3px`) |
| CSS-07 | 🟢 Enhancement | `src/css/design-tokens.css` | Focus shadow tokens use raw hex |
| CSS-08 | 🟢 Enhancement | `src/settings.html` | Inline `style="resize:vertical"` |
| JS-05 | 🟡 Important | `src/js/components.js` | `document.querySelectorAll` for animation reset |
| JS-06 | 🟢 Enhancement | `src/js/components.js` | `$el.querySelectorAll` in keyboard nav |
| JS-07 | 🟡 Important | `src/js/components.js` | `setTimeout` instead of `$nextTick` for post-save prompts |
| JS-08 | 🟢 Enhancement | `src/js/components.js` | `project_pct 'under'` label shows `>` instead of `<` |
| JS-09 | 🟢 Enhancement | `src/js/audit.js` | `updateFixedAllocationDesc` reads non-existent `m.descField` |
| SEC-01 | 🟡 Important | `src/js/main.js` | `resolveCurrentUser` missing `resp.ok` check |
| SEC-02 | 🟡 Important | `src/js/storage.js` | `type` not encoded in Azure fetch URL |
| SEC-03 | 🟢 Enhancement | `src/index.html` | `javascript:` URL not blocked in project link href |
| AZURE-01 | 🔴 Critical | `src/js/history.js`, `src/js/storage.js` | `mutate()` synchronous — cannot await Azure saves |
| AZURE-02 | 🟡 Important | `src/js/settings-page.js` | Import path calls `Storage.save()` — no Azure branch |
| AZURE-03 | 🟡 Important | `src/js/storage.js`, `src/js/settings-page.js` | `Storage.clear()` has no Azure branch |
| AZURE-04 | 🟡 Important | `src/js/storage.js` | Per-row `JSON.parse` aborts entire load on one bad row |
| FIX-01 | ✅ Fixed v3.16.0 | `src/js/store.js`, `src/index.html` | Fixed allocations expand: x-show condition + object-ref reactivity |
| FIX-02 | ✅ Fixed v3.16.0 | `src/index.html` | Tab order: EPSD/budget inputs reverted from x-if to x-show |
| FIX-03 | ✅ Fixed v3.16.0 | `src/js/data.js` | New row (all-zero days) filtered out of empEntries before it can be shown |
| FIX-04 | ✅ Fixed v3.16.0 | `src/js/store.js` | insertEntryAfter: sort cleared + temp ID so cancel() cleans up |
| SORT-01 | ✅ Fixed v3.16.0 | `src/js/data.js` | sortEntries: type-rank primary key preserves Project→Other→Absence grouping |
| EPSD-01 | ✅ Fixed v3.16.0 | `src/js/components.js` | Budget prompt (150ms) overwrote EPSD prompt (100ms); now mutually exclusive per save |
| KB-01 | ✅ Fixed v3.17.0 | `src/js/keyboard.js` | Escape now handled globally before isInInput guard; fires even from date picker |
| PERF-10 | ✅ Fixed v3.14.2 | `src/index.html` | x-if rowType gate — DOM nodes ~200k → ~26k |
| ARCH-04 | 🟡 Important | any `x-for` with multi-type templates | Watch for; no other instances found v3.14.2 |
| TOKEN-01 | ✅ Fixed v3.14.3 | `src/css/design-tokens.css`, `styles.css` | 12 alias/dead tokens removed; ~87 replacements |
| CSS-02 | ✅ Fixed v3.15.0 | `src/css/styles.css`, `src/settings.html` | `.settings-card` → flex+gap; `.settings-field-group` removed |
| PERF-01–09 | ✅ Fixed v3.12–13 | `src/js/` | Performance pass complete |
| HTML-01 | ✅ Fixed 2026-04-22 | `src/settings.html`, `src/index.html` | Nested `<tbody>` pattern fixed |
| ST-01 | ✅ Fixed v3.4.1 | `src/index.html` | 84 inline styles → CSS classes |
| ST-02 | ✅ Fixed 2026-04-22 | `src/settings.html` | ~109 inline styles → CSS classes |
| CR-01–05 | ✅ Fixed | All pages | Script order, raw hex, inline `<style>`, `innerHTML` modals |
| ARCH-01–03 | ✅ Fixed | `src/js/` | Per-row save API, Alpine migration, sticky column tokens |
| IM-01–07 | ✅ Fixed | Various | Undo stacks, changelog, design system, mutate(), vendor fallbacks |
| CSS-01 | ✅ Fixed | `css/design-tokens.css` | 20 BEM semantic token aliases added |
| UI-01–03 | ✅ Fixed | `src/index.html`, `src/css/styles.css` | Toolbar dropdowns, separator bar, textarea Tab key |
| EN-01–07 | ✅ Fixed | Various | Interactive states, aria-live, localStorage errors, roadmap |
| AP-01 | ✅ Fixed | `src/index.html` | `$el.style.*` hover anti-pattern → CSS `:hover` |
| SWA-01 | ✅ Fixed v3.1.0 | `src/js/app.js` | `window.*` exports eliminated |
| KJ-01–02 | ✅ Fixed | `js/keyboard.js` | Keyboard help Alpine migration; `focusFilters` selector |
