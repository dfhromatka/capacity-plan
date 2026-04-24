# Capacity Planning Tool — Code Review & Improvement Opportunities

> **Last updated:** 2026-04-24 (v3.19.3)
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

### PERF-05 — Per-bar `.filter(type)` inside `chartData` getter ✅ Fixed v3.19.4

**File:** `src/js/store.js` (`chartData` getter)

Two `.filter()` passes per employee per month bar (once for `'Project'`, once for `!== 'Project'`). With 20 employees × 13 bars that is 520 filter passes per chart render.

**Fix:** Pre-builds a `byEmpSplit` map once at the top of `chartData` in a single O(n) pass through `byEmp`.

---

### PERF-06 — `empStats` O(n) fallback triggered in `getGroupStats` ✅ Fixed v3.19.4

**File:** `src/js/data.js` (`empStats` line 304, `getGroupStats` line 421)

`getGroupStats` called `empStats(emp, firstMonthIndex)` without passing a pre-built map, hitting the O(n) filter fallback for each employee in the group.

**Fix:** Added `byEmp` as third parameter to `getGroupStats`; `buildTableData` now passes its existing `byEmp` map through.

---

### PERF-07 — Redundant `void` dep-touches in `cardData` and `chartData` ✅ Fixed v3.19.4

**File:** `src/js/store.js`

`void this.employees; void this.entries; void this.months; void this.activeFilters;` lines removed from both getters. `visibleEmployees` already registers all four deps.

---

---

### CSS-09 — `.table-card` missing `overflow: hidden`; inner content bleeds rounded corners ✅ Fixed v3.19.7

**File:** `src/css/styles.css` (`.table-card`, line 31)

`.table-card` has `border-radius: var(--radius-xl)` but no `overflow: hidden`. The table's sticky `<thead>` and the chart's `<div>` bars render with square corners that visibly protrude past the card's rounded border in the corners.

**Fix:** `overflow: hidden` added to `.table-card`.

---

### CSS-10 — Table CSS split across two distant blocks in `styles.css` ✅ Fixed v3.19.9

**File:** `src/css/styles.css`

~88 lines of table/editing CSS that had accumulated at the end of the file (`.row-editing`, `.cell-inactive`, `.row-group`, employee header, fixed-alloc rows, entry editing inputs, legend) consolidated into a single contiguous `TABLE: ROW EDITING & INLINE CONTROLS` section immediately following the main table block. `--border-medium` token substituted for `1.5px solid`. `--space-half: 2px` token added to `design-tokens.css`; all 6 `padding: 2px ...` rules in the block updated to use it. Remaining 3px/6px/10px values kept as-is (no clean token match; spacing micro-values are a judgment call per CSS-06).

---

### CSS-11 — `stylelint` not configured; raw hex/px values reach production silently ✅ Fixed v3.19.9

**File:** `package.json` / `.stylelintrc.json`

`stylelint` + `stylelint-declaration-strict-value` added as devDependencies. `.stylelintrc.json` configured to enforce `var(--...)` for `color`, `background-color`, `border-color`, `outline-color`, `font-size`, and `font-weight`. Pre-existing rem-based font sizes in icon classes (`1.25rem`, `1rem`, `1.1rem`, `0.8rem`) migrated to nearest `--text-*` tokens. Undefined `--color-accent` token replaced with `var(--color-primary)`. `drop-shadow(rgba())` false positives suppressed with inline `stylelint-disable-line`. `npm run lint:css` script added to `package.json`.

---

### CSS-12 — Duplicate and unused tokens in `design-tokens.css` ✅ Fixed v3.19.8

**File:** `src/css/design-tokens.css`

8 tokens removed: `--color-bg-hover` (= `--color-gray-bg`), `--color-row-emp` (= `--color-primary-bg`), `--color-row-emp-border` (= `--color-primary-light`), `--color-row-absence` (= `--color-warning-pale`), `--shadow-focus-primary` (unused), `--color-text-secondary` (= `--color-text-muted`), `--font-size-base` (= `--font-size-sm`), `--transition-slow` (unused). 16 references in `styles.css` updated to canonical equivalents. `--shadow-focus-danger` raw hex → `var(--color-danger-light)`. Transition shorthands reference `--transition-base` instead of hardcoded `0.2s`. CLAUDE.md spacing prefix corrected (`--spacing-*` → `--space-*`).

---

### STOR-05 — `saveRecord` / `deleteRecord` azure branch does not return its Promise 🔴

**File:** `src/js/storage.js` (`saveRecord` ~line 62, `deleteRecord` ~line 80)

The `.then().catch()` chain is fire-and-forget — the Promise is not returned. Any caller that `await`s `saveRecord()` resolves immediately with `undefined` rather than waiting for the network round-trip. When the Azure adapter is live this is a silent race condition on every mutation.

**Fix direction:** Return the Promise from both methods:
```js
return this._saveRecordToAzure(type, record).then(...).catch(...);
```

---

### STOR-08 — Keyboard help advertised Ctrl+Z / Ctrl+Y but undo/redo was not implemented ✅ Fixed v3.19.0

Removed both shortcuts from the keyboard help overlay. No handler existed in `keyboard.js` and no undo stack in `history.js`. Deferred undo/redo is tracked separately as #1150.

---

### STOR-09 — Write queue `flushWriteQueue` TOCTOU race 🟢

**File:** `src/js/storage.js` (`_enqueue` / `flushWriteQueue`, ~line 318)

If `flushWriteQueue` is processing (`_writeQueue.splice(0)`) and a new `_enqueue()` call fires during the flush, the new item gets added to `_writeQueue`. If the flush then fails and re-adds failed items, the newly-enqueued item is duplicated. `_writeQueue` is a module-level array mutated in-place.

**Fix direction:** In `flushWriteQueue`, snapshot the queue atomically: `const batch = [..._writeQueue]; _writeQueue.splice(0, batch.length);`. Re-append only the failed items from `batch`, never touching items that arrived after the snapshot.

---

### A11Y-05 — Toggle icons use `<span role="button">` instead of `<button>` ✅ Fixed v3.19.5

Both ∑/≡ and 📦 toggles replaced with `<button class="filter-icon btn-icon">`. Redundant `@keydown.enter/space` handlers removed (native button handles these). `aria-pressed` retained. `.btn-icon` reset rule added to `styles.css`.

---

### A11Y-06 — Sortable `<th>` elements not keyboard accessible ✅ Fixed v3.19.5

Added `tabindex="0"` and `@keydown.enter.prevent` to all four sortable `<th>` elements (empName, project, status, epsd).

---

### A11Y-07 — RAG icon is not keyboard accessible ✅ Fixed v3.19.5

`<div>` replaced with `<button class="rag-icon btn-icon">`. `:aria-label` bound to current RAG state.

---

### A11Y-08 — Settings tabs missing `aria-controls` / `role="tabpanel"` ✅ Fixed v3.19.5

All 6 tab buttons now have `id="tab-{name}"` and `aria-controls="panel-{name}"`. All 6 panel divs now have matching `id`, `role="tabpanel"`, `tabindex="0"`, and `aria-labelledby`.

---

### CSS-06 — Hardcoded pixel values in `styles.css` 🟡

**File:** `src/css/styles.css`

Remaining after CSS-10 pass (v3.19.9):
- `.col-del > div`: `gap: 2px` (~line 168)
- `.month-nav__btn`: `padding: 1px 3px` (~line 186)
- `.mth-bar`: `height: 3px` (~line 364)
- `.oh-desc-input`: `padding: var(--space-1) 6px`
- `.addrow-sticky-cell`: `padding: 6px var(--space-2)`
- `.btn-add-entry`: `padding: 3px var(--space-3)`
- `.entry-proj-edit-row`: `gap: 3px`; `.entry-url-row`: `gap: 3px`, `margin-top: 3px`
- `.row-group__cell`: `padding: 10px var(--space-3)` — no clean `--space-*` token for 10px
- `.legend-avail-swatch`: `width: 10px; height: 10px; margin-right: 3px`

**Note:** 3px/6px/10px micro-values have no clean token match on the 4px scale. `gap: 2px` etc. are layout constraints. Fixing these requires either accepting approximate tokens or extending the spacing scale. Low priority given stylelint does not enforce spacing properties.

---

### CSS-07 — `--shadow-focus-blue` / `--shadow-focus-input` use raw hex instead of palette tokens ✅ Fixed v3.19.5

Both tokens now reference `var(--color-primary-border)` and `var(--color-primary-bg-active)` respectively — the identical hex values, now sourced from the token system.

---

### CSS-08 — Inline `style="resize:vertical"` on settings textarea ✅ Fixed v3.19.5

`.form-input--resizable { resize: vertical; }` added to `styles.css`. Class applied to the textarea; inline style removed.

---

### JS-05 — `document.querySelectorAll` for animation reset inside Alpine ✅ Fixed v3.19.6

`filterAnimKey: 0` counter added to `Alpine.store('plan')`. `selectCond` increments it instead of querying the DOM. `buildTableData` stamps matched rows' keys with the counter (`entry-{id}-{animKey}`), causing Alpine to destroy and recreate those elements and naturally restart the CSS animation.

---

### JS-06 — `$el.querySelectorAll` in dropdown keyboard nav 🟢

**File:** `src/js/components.js` (`toolbarDropdown.keyNav`, `filterRow.keyNavField`, `filterRow.keyNavCond`)

`$el.querySelectorAll('[data-field-opt]')` used for arrow-key focus management. Less severe than `document.querySelector` but still outside Alpine patterns.

**Fix direction (acceptable exception):** Document as a permitted exception for dropdown keyboard navigation with dynamic item counts, similar to the `keyboard.js` exception. Add an inline comment.

---

### JS-07 — `setTimeout` used instead of `$nextTick` for post-save prompts ✅ Fixed v3.19.6

All three `setTimeout(fn, N)` calls in `tableRow.save()` replaced with a single `this.$nextTick()` block. `mutate()` is synchronous so the store is already updated; `$nextTick` ensures Alpine has flushed before the prompt reads from the store.

---

### JS-08 — `project_pct: 'under'` condition label copy error ✅ Fixed v3.19.5

Label changed from `Under allocated (>${pct}%)` to `Under allocated (<${pct}%)`.

---

### JS-09 — Audit `updateFixedAllocationDesc` reads non-existent meta field ✅ Fixed v3.19.5

Changed from `m => m.descField` to `m => m.catId`.

---

### SEC-01 — `resolveCurrentUser()` does not check `resp.ok` before parsing ✅ Fixed v3.19.5

Added `if (!resp.ok) return;` before `resp.json()`.

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
| ARCH-05 | ✅ Fixed v3.19.1 | `src/js/store.js` | `deleteEntry` now goes through `mutate()` |
| ARCH-06 | ✅ Fixed v3.19.1 | `src/js/settings-page.js` | `months[idx]` mutations replaced with array reference replacements |
| ARCH-07 | ✅ Fixed v3.19.1 | `src/js/store.js` | Duplicate empty `ismOptions` getter removed |
| ARCH-08 | ✅ Fixed v3.19.2 | `src/js/store.js` | Phantom void deps removed; `activeFilters` + `ui.showArchived` added |
| ARCH-09 | ✅ Fixed v3.19.2 | `src/js/store.js`, `src/js/keyboard.js` | `cancelTempEntry()` extracted; keyboard.js + cancel() delegate to it |
| REACT-02 | ✅ Fixed v3.19.2 | `src/js/store.js`, `src/index.html` | `expandedOH` moved to `$store.ui` |
| REACT-03 | ✅ Fixed v3.19.2 | `src/js/store.js`, `src/js/data.js`, `src/js/storage.js`, `src/index.html` | `collapseAllEntries`, `expandedInSummary`, `showArchived` moved to `$store.ui` |
| REACT-04 | ✅ Fixed v3.19.2 | `src/index.html` | `editDays[cell.i]=` → reference replacement pattern |
| PERF-05 | ✅ Fixed v3.19.4 | `src/js/store.js` | Pre-split byEmpSplit map in chartData; `.filter(type)` eliminated |
| PERF-06 | ✅ Fixed v3.19.4 | `src/js/data.js`, `src/js/store.js` | `byEmp` threaded through getGroupStats; O(n) fallback eliminated |
| PERF-07 | ✅ Fixed v3.19.4 | `src/js/store.js` | Redundant void dep-touches removed from cardData and chartData |
| STOR-05 | 🔴 Critical | `src/js/storage.js` | `saveRecord`/`deleteRecord` azure branch not returning Promise |
| STOR-06 | ✅ Fixed v3.19.3 | `src/js/storage.js`, `src/js/data.js` | `activeFilters` + `filterRowsShown` removed from persisted payload and restore |
| STOR-07 | ✅ Fixed v3.19.3 | `src/js/storage.js`, `src/js/settings-page.js` | `exportData` now calls `buildSavePayload()` directly; `Storage.load()` round-trip eliminated |
| STOR-08 | ✅ Fixed v3.19.0 | `src/index.html` | Ctrl+Z/Y removed from keyboard overlay |
| STOR-09 | 🟢 Enhancement | `src/js/storage.js` | Write queue flush TOCTOU race |
| STORAGE-01 | ✅ Fixed v3.19.3 | `src/js/storage.js` | `buildSavePayload` now guards `i < e.days.length` before writing keyed days |
| A11Y-05 | ✅ Fixed v3.19.5 | `src/index.html`, `src/css/styles.css` | span→button; .btn-icon reset added |
| A11Y-06 | ✅ Fixed v3.19.5 | `src/index.html` | tabindex + keydown.enter on sortable th |
| A11Y-07 | ✅ Fixed v3.19.5 | `src/index.html` | RAG div→button with aria-label |
| A11Y-08 | ✅ Fixed v3.19.5 | `src/settings.html` | aria-controls + role=tabpanel wired for all 6 tabs |
| CSS-05 | ✅ Fixed v3.19.1 | `src/js/store.js` | `utilColor` now uses `var(--color-danger/warning/success)` |
| CSS-06 | 🟡 Important | `src/css/styles.css` | Hardcoded pixel values — 2px fixes done v3.19.9; 3px/6px/10px remain (no clean token) |
| CSS-09 | ✅ Fixed v3.19.7 | `src/css/styles.css` | `overflow: hidden` added to `.table-card`; corner bleed fixed |
| CSS-10 | ✅ Fixed v3.19.9 | `src/css/styles.css` | Scattered table block consolidated; `--space-half` + `--border-medium` applied |
| CSS-11 | ✅ Fixed v3.19.9 | `package.json`, `.stylelintrc.json` | stylelint + declaration-strict-value configured; `npm run lint:css` passes clean |
| CSS-12 | ✅ Fixed v3.19.8 | `src/css/design-tokens.css` | 8 duplicate/unused tokens removed; raw hex and hardcoded transitions fixed |
| CSS-07 | ✅ Fixed v3.19.5 | `src/css/design-tokens.css` | focus shadow tokens now use palette token refs |
| CSS-08 | ✅ Fixed v3.19.5 | `src/settings.html`, `src/css/styles.css` | inline resize → .form-input--resizable class |
| JS-05 | ✅ Fixed v3.19.6 | `src/js/store.js`, `src/js/components.js` | filterAnimKey counter; key churn on matched rows restarts animation |
| JS-06 | 🟢 Enhancement | `src/js/components.js` | `$el.querySelectorAll` in keyboard nav |
| JS-07 | ✅ Fixed v3.19.6 | `src/js/components.js` | setTimeout → $nextTick in tableRow.save() |
| JS-08 | ✅ Fixed v3.19.5 | `src/js/components.js` | Under allocated label now shows `<` not `>` |
| JS-09 | ✅ Fixed v3.19.5 | `src/js/audit.js` | updateFixedAllocationDesc now reads m.catId |
| SEC-01 | ✅ Fixed v3.19.5 | `src/js/main.js` | resp.ok guard added before resp.json() |
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
