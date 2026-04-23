# Capacity Planning Tool — Code Review & Improvement Opportunities

> **Last updated:** 2026-04-22 (v3.16.0)
> **Purpose:** Open architectural debt and known issues. Resolved items are in git history.

> **New to the codebase?** Read `docs/ARCHITECTURE.md` first.

---

## Severity

- 🔴 **Critical** — Actively violates architecture rules or will cause bugs
- 🟡 **Important** — Technical debt that degrades maintainability or design consistency
- 🟢 **Enhancement** — Quality improvements beyond the baseline

---

## Open Issues

### FIX-02 — Tab order skips EPSD/budget inputs in inline edit mode ✅ Fixed v3.16.0

**File:** `src/index.html`

**Cause:** EPSD date and budget hours inputs were wrapped in `<template x-if="row.type === 'Project' && isEditing">`.
All other edit-mode inputs use `x-show="isEditing"` (element stays in DOM, toggled via display).
The `x-if` approach removes and re-inserts the DOM element each time editing starts — this can
cause tab order to be undefined/skipped because the element isn't present when the browser
builds its tab sequence at focus time.

**Fix:** Replaced `x-if` wrapper with `x-show="isEditing"` on each input directly, matching
the pattern every other edit-mode field uses. Read-mode display wrapped in `<template x-if="!isEditing && row.type === 'Project'">` to avoid showing the epsd-display for non-Project rows.

---

### EPSD-01 — `checkEPSDAllocationPrompt` called with stale entry on new rows 🟡

**File:** `src/js/components.js` (tableRow `save()`, line ~441)

**Symptom:** When saving a newly-added Project row (i.e. one whose temp ID was replaced by
`nextId` during the `mutate()` call), the post-save find uses `e.project === newProject && e.empId`
as the lookup key. If multiple rows share the same project name, or the entry was just created,
the lookup may return the wrong entry — and the `|| entry` fallback passes the **pre-save**
entry object with the **old** `days` array to `checkEPSDAllocationPrompt`. The function then
evaluates allocation changes against stale data.

**Fix direction:** Replace the post-save lookup with `e.id === entryId` (the ID captured before
`mutate()` returns, which is the permanent ID for existing rows). For new rows where the temp
ID is replaced inside `mutate()`, find by the highest ID in the plan or carry the new ID out
of the mutation closure.

---

### SORT-01 — Project/activity sort ignores row-type grouping 🟡

**File:** `src/js/store.js` (sort logic in `tableData` getter or sort handler)

**Symptom:** Sorting by the project/activity column reorders all rows globally, mixing
Project, Admin, and Absence rows together instead of sorting within type groups.

**Expected behaviour:** Row-type order must be preserved (Project → Admin → Absence).
Sorting by project/activity should only reorder rows within each type group.

**Fix direction:** In the sort comparator, add a primary sort key on `row.type` using
the canonical order (`Project=0, Admin=1, Absence=2`), then secondary sort on the
project/activity field. Apply this two-key comparator whenever any column sort is active.

---

### FIX-01 — Fixed allocations expand button broken ✅ Fixed v3.16.0

**Root cause (2 bugs):**
1. `x-show` on the OH row used `!$store.plan.collapseAllEntries && expandedOH[empId]`. Since
   `collapseAllEntries` defaults to `true`, the first operand was always `false` — no OH row
   could ever show. Fixed by mirroring the entry-row pattern:
   `expandedOH[empId] && (!collapseAllEntries || expandedInSummary[empId])`.
2. `toggleOH()` and `toggleGroup()` mutated object properties in-place — Alpine v3 does not
   detect new key additions on a plain reactive object. Both now replace the object reference:
   `this.expandedOH = { ...this.expandedOH, [empId]: !this.expandedOH[empId] }`

---

### KB-01 — Keyboard shortcuts blocked in inline edit mode ✅ Fixed v3.17.0

**File:** `src/js/keyboard.js`

**Fix:** Two-part fix:
1. Escape is handled in the global `document` keydown listener before the `isInInput` guard —
   needed because date picker inputs consume Escape at the browser level before it bubbles.
2. `@keydown="handleKeydown($event)"` added directly to all non-month edit inputs (type select,
   project name, URL, notes textarea, EPSD date, budget hours) — event bubbling from these
   inputs to the `<tr>` was unreliable. Month cell inputs were unaffected.
   Notes textarea preserves natural Enter (newline) via the existing `inNotesTextarea` guard;
   Shift+Enter still saves.

---

### ARCH-04 — `x-show` used for permanent row-type selection inside `x-for` loops 🟡

**Watch for:** any `x-for` loop that renders multiple different templates per iteration and uses
`x-show="item.type === 'X'"` to select between them. This is the pattern that caused PERF-10.

**Why it matters:** every iteration renders ALL templates and hides all-but-one with `x-show`.
For a complex template (e.g. an entry row with 13 month cells), this multiplies DOM nodes by the
number of template variants even though only one is ever visible per row.

**Rule:** if the property tested in `x-show` is *permanent* for a given item (i.e. an item's type
never changes while it is in the DOM), use `x-if` instead so that only the matching template is
created. Reserve `x-show` for conditions that toggle on an existing element (group expand, edit
mode, visibility filters).

**Fixed instance:** `src/index.html` `tableData.rows` loop — v3.14.2 (2026-04-22).
**Other locations to check:** none found as of v3.14.2 (`settings.html` clear; all other `x-for`
loops in `index.html` iterate uniform item types).

---

### TOKEN-01 — Design token system has duplicate aliases and dead tokens ✅ Fixed v3.14.3

**Files:** `src/css/design-tokens.css`, `src/css/styles.css`

Fixed 2026-04-22: 12 alias/dead tokens removed from `design-tokens.css`; ~87 replacement
references updated in `styles.css`. Legacy names (`--sap-blue`, `--gray-*`, `--color-bg` bare,
`--space-2`/`--space-3` shorthands) eliminated. All rules now reference canonical `--color-*`,
`--spacing-*`, and `--space-*` tokens. No legacy token names remain in either file.

---

### CSS-02 — `.settings-card` uses wrapper divs for spacing instead of layout gap ✅ Fixed v3.15.0

**Files:** `src/css/styles.css`, `src/settings.html`

Fixed 2026-04-22: `.settings-card` now uses `display: flex; flex-direction: column; gap: var(--space-4)`.
`.settings-field-group` class and its only rule removed. All wrapper divs removed from `settings.html`.
Full audit of all settings tabs confirmed — no other spacing-wrapper patterns found.

---

## Summary Table

| ID | Severity | File(s) | Status |
|----|----------|---------|--------|
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
