# Capacity Planning Tool — Code Review & Improvement Opportunities

> **Last updated:** 2026-04-22 (v3.15.0)
> **Purpose:** Open architectural debt and known issues. Resolved items are in git history.

> **New to the codebase?** Read `docs/ARCHITECTURE.md` first.

---

## Severity

- 🔴 **Critical** — Actively violates architecture rules or will cause bugs
- 🟡 **Important** — Technical debt that degrades maintainability or design consistency
- 🟢 **Enhancement** — Quality improvements beyond the baseline

---

## Open Issues

### KB-01 — Keyboard shortcuts blocked in inline edit mode 🟡

**File:** `src/js/keyboard.js`, `src/js/components.js`

**Symptom:** Global keyboard shortcuts (e.g. Escape to cancel, Ctrl+Z undo) do not fire when
the user is in inline row edit mode and focus is on a non-cell element — e.g. the project
name input, the notes textarea, or the EPSD date picker. Shortcuts only work when a month
cell input is focused.

**Likely cause:** `keyboard.js` guards against firing shortcuts when focus is inside an
`<input>`, `<textarea>`, or `<select>` to avoid interfering with text entry — but this
over-suppresses shortcuts like Escape (cancel edit) and Ctrl+Z (undo) that should always
be available regardless of which field has focus within the edit row.

**Fix direction:** In the keydown guard in `keyboard.js`, allow specific shortcuts
(at minimum: Escape, Ctrl+Z, Ctrl+Shift+Z) to pass through even when an input is focused.
The `tableRow` component in `components.js` already has `cancel()` and `save()` methods
that can be called directly.

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
| KB-01 | 🟡 Important | `src/js/keyboard.js`, `src/js/components.js` | Shortcuts suppressed in inline edit mode when non-cell input focused |
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
