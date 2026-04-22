# Capacity Planning Tool — Code Review & Improvement Opportunities

> **Last updated:** 2026-04-22 (v3.14.2)
> **Purpose:** Open architectural debt and known issues. Resolved items are in git history.

> **New to the codebase?** Read `docs/ARCHITECTURE.md` first.

---

## Severity

- 🔴 **Critical** — Actively violates architecture rules or will cause bugs
- 🟡 **Important** — Technical debt that degrades maintainability or design consistency
- 🟢 **Enhancement** — Quality improvements beyond the baseline

---

## Open Issues

### PERF-10 — Filter and group-by lag on production-scale datasets 🟡

**Files:** `src/js/store.js` (`visibleEmployees` getter, `buildTableData`)

Noticeable UI lag on filter change and group-by toggle with 27 employees / 154 entries.

**Suspected causes (unverified — profile before fixing):**
- `visibleEmployees` runs multiple `.filter()` chains in sequence
- `buildTableData` iterates all rows including entries for hidden employees
- No memoisation of filter results — every keypress reruns from scratch

**Do not fix without profiling first.** Open Chrome DevTools → Performance → record a filter interaction. The flame graph identifies the actual bottleneck.

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

### TOKEN-01 — Design token system has duplicate aliases and dead tokens 🟡

**Files:** `src/css/design-tokens.css`, `src/css/styles.css`

Audit (2026-04-22). Three undefined tokens added as immediate fix; remaining debt:

**True byte-for-byte duplicates (safe to consolidate):**

| Alias family | Resolves to | Alias uses | Primary uses |
|---|---|---|---|
| `--spacing-xs/sm/md/lg` | `--space-1/2/3/4` | 58 | 161 |
| `--font-weight-medium/semibold` | `--font-medium/semibold` | 7 | 63 |
| `--color-accent`, `--color-accent-hover`, `--color-accent-subtle` | `--color-primary`, `-hover`, `-light` | 28 | 18 |

**Dead tokens (0 uses in `styles.css`):**
- `--color-bg-page` (#f3f4f6) — superseded by `--color-gray-neutral-100`
- `--color-bg-card` (#ffffff) — superseded by `--color-white` / `--color-surface`
- `--color-background` (var(--color-gray-100)) — resolves to #f1f5f9, different from `--color-bg-page`

**Two-gray-scale system — justified but undocumented:**
`--color-gray-*` (Slate, 81 uses) and `--color-gray-neutral-*` (Neutral, 83 uses) are genuinely
different hex values. Semantic split: Neutral for text/input UI; Slate for structural chrome.

**Remediation order:**
1. ~~Define `--color-surface-raised`, `--font-size-base`, `--color-text-secondary`~~ ✅ Done
2. Remove `--color-bg-page`, `--color-bg-card`, `--color-background` (dead code)
3. Migrate `--spacing-*` → `--space-*` (~58 replacements)
4. Migrate `--font-weight-*` → `--font-*` (~7 replacements)
5. Pick `--color-accent` or `--color-primary` as canonical; migrate the other (~46 replacements)
6. Add gray-scale usage guidance to `docs/DESIGN_SYSTEM.md`

**Guiding principle:** one token per distinct design decision — no redundant aliases.

---

### CSS-02 — `.settings-card` uses wrapper divs for spacing instead of layout gap 🟢

**Files:** `src/css/styles.css`, `src/settings.html`

`.settings-card` is a plain block container. Field groups inside need vertical spacing via
`.settings-field-group` wrapper divs — an extra DOM element whose only job is spacing.

The right fix:
```css
.settings-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```
Then remove `.settings-field-group` and any `margin-bottom` overrides.

Wider change — affects every `.settings-card` usage and needs visual verification on all tabs.
Treat as a standalone CSS pass.

---

## Summary Table

| ID | Severity | File(s) | Status |
|----|----------|---------|--------|
| PERF-10 | ✅ Fixed v3.14.2 | `src/index.html` | x-if rowType gate — DOM nodes ~200k → ~26k |
| ARCH-04 | 🟡 Important | any `x-for` with multi-type templates | Watch for; no other instances found v3.14.2 |
| TOKEN-01 | 🟡 Important | `src/css/design-tokens.css`, `styles.css` | Duplicate aliases + dead tokens — consolidate |
| CSS-02 | 🟢 Enhancement | `src/css/styles.css`, `src/settings.html` | `.settings-card` → flex+gap |
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
