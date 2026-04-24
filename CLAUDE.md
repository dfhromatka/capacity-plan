# Capacity Planning Tool — Claude Instructions

## Git Workflow

- **Never commit unless explicitly asked.** The user decides when work is done.
- **Never create or switch branches unless explicitly asked.**
- When asked to commit, write a meaningful present-tense message describing the change.
- When a task is experimental or risky, suggest a feature branch proactively — but don't create it without approval.
- When asked to commit and push, do both in sequence.
- **At the end of every task, output the exact `git add` command and a suggested `git commit` message** listing all files changed during that task and all issus addressed. Example:
  ```
  git add src/js/store.js src/js/data.js docs/CHANGELOG.md

  git commit -m "code review critical issues: ARCH-05, ARCH-06, ARCH-07, CSS-05"
  ```
  Do not include files that were already modified before the task started (e.g. pre-existing uncommitted changes).

---

## Design Philosophy

Every architectural rule exists in service of one goal:
**clean architecture delivers consistent, unified appearance and behaviour across the app.**

Shortcuts are not free:
- An inline style means a colour that can't be themed from one place
- A raw hex value means a colour that doesn't update when the token changes
- A direct DOM mutation means a UI state Alpine doesn't know about
- A Tailwind utility class means a style outside the design token system

When in doubt: *does this decision make the app more or less consistent?*

---

## Project State

**`src/` is the active codebase. The root JS/HTML files are legacy and no longer maintained.**

| Structure | Status |
|-----------|--------|
| `src/` + `vite.config.js` + `package.json` | **Active** — develop here, serve with `npm run dev` |
| Root JS/HTML files (`js/`, `index.html`, etc.) | **Legacy** — do not edit; kept for reference only |

All new work goes in `src/`. The root files exist only as a historical reference and will be removed once the `src/` rewrite is fully validated.

**Deployment target:** Azure Static Web Apps (SWA). SharePoint is no longer the target.

**Current version:** see `README.md` and `docs/CHANGELOG.md`.

---

## Known Issues & Improvement Backlog

Before starting any work, read **`docs/CODE_REVIEW.md`** for the current list of known issues, severity, and recommended execution order. Do not introduce new instances of patterns already identified as debt.

### CODE_REVIEW.md Maintenance

`docs/CODE_REVIEW.md` is the **live record of architectural debt and known issues**. Keep it current.

- **Fixing** an issue listed there → mark resolved (with date and version) or remove it
- **Discovering** a new issue → add it before completing the task
- **Partially addressing** an issue → update the description, note remaining work, do not mark resolved
- Do not complete a task touching architecture without reading CODE_REVIEW.md first

**Scoped task workflow:**
1. Read `docs/CODE_REVIEW.md` — understand current debt and priorities
2. Read `CLAUDE.md` — review architectural rules
3. Select the highest-priority open issue (or the one requested)
4. Read only the files relevant to that concern
5. Fix, verify, update CODE_REVIEW.md, complete

---

## Tech Stack

- **Vite v5** — build tool, dev server (`npm run dev`)
- **Alpine.js v3** — reactivity, components, store (installed via npm)
- **Chart.js v4** — charts (installed via npm)
- **ES modules** — `import`/`export` throughout `src/`
- **Browser `localStorage`** — persistence via `src/js/storage.js`
- **Plain HTML5 / CSS3** — no framework, no Tailwind

---

## File Architecture Map

Every file has **one** responsibility. Never blur these lines.

| File | Responsibility |
|------|----------------|
| `src/js/storage.js` | `localStorage` read/write abstraction. No Alpine, no DOM. |
| `src/js/data.js` | Static calendar config (`state.months`) and pure helper functions (`empStats`, `empEntries`, `bh`, etc.). No mutable globals. |
| `src/js/store.js` | `Alpine.store('plan')` + `Alpine.store('modal')`. **Single source of truth** for all mutable state. |
| `src/js/history.js` | Undo/redo stack + `mutate()` dispatcher. All data mutations must go through `mutate()`. |
| `src/js/chart.js` | Chart.js wrapper. Permitted to use `$refs` for canvas access. |
| `src/js/keyboard.js` | Global keyboard shortcuts **only**. Documented exception to the no-`addEventListener` rule. |
| `src/js/components.js` | All `Alpine.data()` component registrations. |
| `src/js/modals.js` | Thin call-site wrappers for modal store mutations. Zero `innerHTML`. |
| `src/js/settings-page.js` | Settings page Alpine data and logic. |
| `src/js/settings-main.js` | Settings page entry point — wires Alpine for settings.html. |
| `src/js/toast.js` | Toast notification logic. |
| `src/js/main.js` | App entry point — imports and wires all modules for index.html. |
| `src/js/app.js` | App initialisation — wires storage, data, store, and components together. |
| `src/css/design-tokens.css` | **Single source of truth** for all design tokens. |
| `src/css/styles.css` | Component styles only. Must reference design tokens. |
| `src/index.html` | Main app page. |
| `src/settings.html` | Settings page. |
| `docs/ARCHITECTURE.md` | Human dev onboarding guide. Read before touching any file. |
| `docs/CODE_REVIEW.md` | Live issue tracker — open debt, severity, status. |
| `docs/DESIGN_SYSTEM.md` | Design token reference (color, typography, spacing, borders, shadows, z-index, motion). Component classes are in `src/css/styles.css` — grep that file directly. |

---

## Current Architecture State

`Alpine.store('plan')` is the **single source of truth**. The vanilla JS → Alpine.js migration
is complete for all mutable data. No hybrid mode, no `sync()`, no `syncStore()`.

### State flow

```
mutate() fn() writes to Alpine.store('plan')
  ↓
Alpine reactive proxy detects change
  ↓
get tableData() / get cardData() re-evaluate automatically
  ↓
Templates update — no syncStore() needed
```

- `Alpine.store('plan')` holds all mutable state: `employees`, `entries`, `months`, `activeLocations`, `planSettings`, all UI filters
- `data.js` retains only static config (`state.months`) and pure helper functions
- `mutate(op, fn, meta, saveSpec)` is the **single entry point** for all data mutations — it handles `captureUndoSnapshot()` → `fn()` → `triggerAutoSave()`

### Rules

- **All data mutations go through `mutate()`** — never call `captureUndoSnapshot()` directly
- **Mutation fn() must write to `Alpine.store('plan')`** — never mutate plain JS objects outside the store
- **Array mutations must replace the array ref**: `s.entries = [...s.entries, e]` triggers Alpine; `.push()` does NOT
- **Do not add properties to `data.js`** — all state goes directly into `Alpine.store('plan')`
- **UI state** (filters, modal state) — write directly to store; no `mutate()` needed

### `mutate()` signature

```js
mutate('updateEmployee', () => {
  const s = Alpine.store('plan');
  s.employees = s.employees.map(e => e.id !== empId ? e : { ...e, name: newName });
}, { empId: emp.id, field: 'name', from: emp.name, to: newName },
  { type: 'employee', record: emp });
```

### Known migration targets

| Target | Current State | Desired End State |
|--------|--------------|-------------------|
| `src/js/history.js` undo/redo stacks | Plain `let` globals | `Alpine.store('plan')` properties — deferred to #1150 |
| `src/css/styles.css` `:root` block | Legacy token names (`--sap-blue`, etc.) | Removed; all rules use canonical tokens |

---

## Performance Rules

These rules exist because violations were found and measured to cause visible UI lag. Each maps to a PERF-* issue in `docs/CODE_REVIEW.md`.

### Measure before optimising

**Never guess at a bottleneck. Profile first.**

Open Chrome DevTools → Performance tab → record the slow interaction. The flame graph will show exactly what is expensive. A code-level audit without profiling data is educated guessing and will often fix the wrong thing.

### Understand what triggers a re-render

In Alpine.js v3, every store property write schedules a reactive flush. That flush re-evaluates every expression that read the changed property. For this app:

- Writing to `$store.plan.entries` or `$store.plan.employees` re-runs `tableData`, `cardData`, and `chartData` — the three most expensive getters
- Writing to `$store.ui` never touches those getters
- Writing to a plain module-level variable touches nothing

Before writing to any store property, ask: **which getters does this invalidate, and are they cheap?**

### Store property segregation

**UI-only state must live in `Alpine.store('ui')`, not `Alpine.store('plan')`.**

`$store.plan` has three expensive computed getters (`tableData`, `cardData`, `chartData`) that re-evaluate whenever any `$store.plan` property changes. Putting transient UI state (edit mode, modal state, help overlay) into `$store.plan` causes a full table rebuild on every click.

- `editingRowId`, `showKeyboardHelp`, and similar flags → `Alpine.store('ui')`
- Data and filter state → `Alpine.store('plan')`
- Audit log and other append-only write-rarely/read-rarely data → plain module-level variables outside Alpine entirely

**Two-store rule check:** Before adding a property to `Alpine.store('plan')`, ask: does changing this property need to re-render the table? If no → `Alpine.store('ui')` or a plain variable.

### Batch store mutations

**Never make two separate store writes where one mutation can do both.**

Each store write schedules a reactive flush. Two writes in the same handler produce two full re-renders. Always combine into a single `mutate()` call or a single synchronous block so Alpine batches them into one flush.

### Keep template expressions cheap

**Template expressions run on every render cycle. They must be reads, never computations.**

- ❌ `x-text="entries.filter(e => e.empId === emp.id).length"` — filter runs per row per render
- ✅ `x-text="row.entryCount"` — precomputed in the store getter, read-only in the template

If you find yourself writing a function call, a `.filter()`, a `.map()`, or any loop inside an Alpine binding, move it into the store getter instead.

### `x-if` vs `x-show`

**`x-if` destroys and recreates DOM on every toggle. `x-show` only toggles `display`.**

Use `x-show` for anything that toggles frequently (edit mode, expanded rows, filter panels). Use `x-if` only when the DOM must not exist at all (e.g. a chart canvas that must be destroyed before re-initialisation).

### No per-render O(n) scans

**Never call `array.filter()`, `array.find()`, or `array.findIndex()` inside a computed getter or template expression that runs per row.**

Build an index once at the top of the getter (e.g. `buildEntriesByEmp(store.entries)` returns a `Map`) and pass it through. O(n²) access patterns become invisible at small scale and catastrophic at realistic scale.

The existing helpers to use:
- `buildEntriesByEmp(entries)` → `Map<empId, entry[]>` — use instead of `entries.filter()`
- `empStats(emp, i, byEmp)` — pass the pre-built map as the third argument
- `empEntries(empId, byEmp)` — same

### Cache expensive pure functions

**Any pure function called more than once per render with the same inputs must be memoised.**

`empStats` is the canonical example: called once per employee × per visible month × per render cycle = 300–1800 calls on a typical dataset. The cache lives in `data.js` (`_empStatsCache`), is keyed by `${emp.id}:${monthIndex}`, and is invalidated at the top of every `mutate()` via `invalidateEmpStatsCache()`.

Follow the same pattern for any function that: takes only data-derived inputs, returns a deterministic result, and is called in a loop.

### Keep event handlers synchronous and cheap

**Expensive work in a click handler delays the visual response.**

- Defer non-critical work with `setTimeout(..., 0)` or `$nextTick`
- Never call `JSON.parse` / `JSON.stringify` synchronously in a click handler — use the debounced `triggerAutoSave()` instead
- `Storage.load()` is a full JSON parse of the entire dataset; never call it in a hot path (filter change, row click, tab switch)

### localStorage payload size

**Every `triggerAutoSave()` call serialises the entire store to JSON. Keep the payload lean.**

- Don't persist session-only state (undo stacks, expanded UI state that resets naturally)
- Don't persist data that can be derived at load time
- Data that is written frequently but rarely read (e.g. audit log) should be stored outside the main Alpine store so writes don't trigger reactive overhead

---

### Version review protocol

**At every MINOR version increment, run this checklist before merging:**

1. Read `docs/CODE_REVIEW.md` — are any 🔴 Critical issues open? Block the release if so.
2. Search for new instances of forbidden patterns: `array.filter()` inside getters, raw store writes outside `mutate()`, properties added to `$store.plan` that belong in `$store.ui`
3. Check `_buildSavePayload()` — has anything large been added to the persisted payload?
4. Check that every new store property has a clear owner (plan data, UI state, or module variable)
5. If the table row count or employee count has grown, re-profile the three main interactions: entering edit mode, saving a row, switching cards/chart

**At every MAJOR version increment**, also:
6. Profile a full render cycle with a realistic dataset (20+ employees, 50+ entries)
7. Run `npm run build` and check bundle size — flag any unexpected growth
8. Review `docs/ARCHITECTURE.md` for drift against the actual code

---

## Alpine.js Coding Standards

### Alpine-first rule

**Alpine is the default answer for every UI concern.** Before reaching for a native HTML element, a DOM API, or a CSS workaround, ask: *can Alpine solve this?* In almost every case it can — and the Alpine solution is the right one because it stays within the reactive system, stays testable, and stays consistent with the rest of the app.

This applies explicitly to form controls. A native `<select>` looks and behaves differently across browsers and OSes; a custom `Alpine.data()` dropdown styled with design tokens is consistent everywhere. Whenever a native control visually diverges from adjacent Alpine-rendered controls, replace it with a custom Alpine component — do not attempt to paper over the mismatch with `appearance: none` or extra CSS.

**If you are tempted to use a native HTML element for interactivity, write down why Alpine cannot do it first. If you cannot, use Alpine.**

### FORBIDDEN patterns

| Pattern | Use instead |
|---------|-------------|
| `document.querySelector()` / `getElementById()` for UI | `:class`, `:style`, `x-show` bindings |
| `element.classList.add/remove/toggle()` | `:class="{ 'is-active': condition }"` |
| `element.style.x = value` | `:style="{ color: someVar }"` |
| `addEventListener()` for UI events on Alpine elements | `@click`, `@keydown`, `x-on:` |
| `window.xyz = function()` | `Alpine.store()` or `Alpine.data()` |
| `document.createElement()` / `innerHTML =` for rendering | Alpine template with `x-for` / `x-show` |
| New mutable globals in `data.js` | `Alpine.store('plan').newProp = value` |
| Native `<select>` for toolbar/filter controls | Custom `Alpine.data()` dropdown (see `customDropdown`) |

### Permitted exceptions (comment the reason)

- `addEventListener('keydown', ...)` in `src/js/keyboard.js` — global shortcuts have no Alpine element
- Canvas/chart init — use `x-ref` to retrieve the DOM element
- `$nextTick` — for operations after Alpine's DOM update cycle
- Native `<select>` inside modals/forms (e.g. employee location, month pickers) — these are data-entry fields where native browser UX (scroll, keyboard, autofill) is appropriate; toolbar/filter controls are not data-entry and must use custom dropdowns

### State rules

- Shared app data → `Alpine.store('plan')` via `mutate()`
- UI state (active modal, open filters) → `Alpine.store('plan')` directly, no `mutate()`
- New features → `Alpine.store('plan')` directly
- Component-local state → `x-data` on the component's root element

### Modal pattern

```html
<!-- Trigger -->
<button @click="$store.modal.open('empEdit', { empId: emp.id })">Edit</button>

<!-- Template (in #modal-root) -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title-emp-edit"
     x-show="$store.modal.active === 'empEdit'"
     x-data="empEditModal"
     @keydown.escape.window="$store.modal.close()">
  ...
</div>
```

---

## CSS Architecture Standards

### Dynamic over hardcoded

**Prefer dynamic, responsive solutions over hardcoded values in all layout decisions.**

- Use `calc()` with existing design tokens rather than computing a number yourself — if a token changes, the layout adapts automatically
- Use `var(--token-a) + var(--token-b)` sums in `calc()` to express derived dimensions (e.g. a spacer that must equal the sum of several column widths)
- Derived values that appear in more than one place → add a new token (`--sticky-cols-width: calc(...)`) so the derivation is defined once
- `min-width`, `flex`, `grid`, and `clamp()` before fixed-pixel widths
- Hardcoded pixel values are only acceptable when they represent a genuine physical constraint (e.g. a border width of `1px`); even then, add it as a token

This rule applies to JS layout decisions too: read dimensions from the DOM or derive them from existing store data rather than duplicating known constants in JS.

### Token rules

- **ALL** colour values → `var(--color-*)` — never write raw hex, `rgb()`, or `rgba()`
- **ALL** spacing → `var(--spacing-*)` — never write raw `px` values
- **ALL** typography → `var(--font-*)` tokens
- Z-index → `var(--z-*)`, transitions → `var(--duration-*)` + `var(--easing-*)`
- Adding a new design decision → **add the token first**, then use it

### Token prefix reference

| Prefix | Examples |
|--------|---------|
| `--color-*` | `--color-accent`, `--color-surface`, `--color-text-primary` |
| `--spacing-*` | `--spacing-xs`, `--spacing-sm`, `--spacing-md` |
| `--font-*` | `--font-size-sm`, `--font-weight-medium` |
| `--radius-*` | `--radius-sm`, `--radius-md` |
| `--shadow-*` | `--shadow-sm`, `--shadow-md` |
| `--z-*` | `--z-modal`, `--z-toast` |
| `--duration-*` | `--duration-fast`, `--duration-normal` |
| `--easing-*` | `--easing-standard` |

### Legacy token debt

`styles.css` has a legacy `:root` block with old variable names. Do not add to it. When editing a rule that uses a legacy variable, migrate it to the canonical token.

```
--sap-blue      →  --color-accent
--gray-200      →  --color-border
--gray-800      →  --color-text-primary
--color-bg      →  --color-background
--space-2       →  --spacing-sm
--space-3       →  --spacing-md
```

### Class naming

```
.component-name            Block
.component-name__element   Element
.component-name--modifier  Modifier
.is-active / .has-error    State
```

### Interactive states — required for every interactive element

Every button, link, input, select, and clickable element must have:
- `:hover`
- `:focus-visible` (do NOT remove outline — style it)
- `:active`
- `:disabled` — muted + `cursor: not-allowed`

### CSS workflow

Before editing CSS: grep `src/css/design-tokens.css` for existing tokens and `src/css/styles.css` for existing classes — do not add a token or class that already exists.  
After adding tokens: update the relevant table in `docs/DESIGN_SYSTEM.md`.  
After adding component classes: no doc update needed — `styles.css` is the source of truth.

---

## HTML & Accessibility Standards

### Semantic structure

- `<main>` — one per page
- `<header>`, `<nav>`, `<footer>` — structural regions
- `<section aria-labelledby="...">` — major content regions
- `<button>` for controls, `<a>` for navigation — never `<div>` with click handlers
- `<table>` + `<th scope="col/row">` + `<caption>` for tabular data

### Alpine template nesting in tables — FORBIDDEN pattern

`<tbody>` inside `<tbody>` is invalid HTML. Browsers silently "fix" it by creating separate table contexts, breaking column alignment with `<thead>`.

When `x-for` needs to produce multiple rows per iteration (e.g. a main row + a detail row), wrap them in a `<tbody>` as a **direct child of `<table>`** — not inside an outer `<tbody>`:

```html
<!-- ✅ CORRECT: x-for produces <tbody> elements as direct table children -->
<table>
  <thead>...</thead>
  <template x-for="item in items" :key="item.id">
    <tbody>
      <tr><!-- main row --></tr>
      <tr x-show="expanded[item.id]"><!-- detail row --></tr>
    </tbody>
  </template>
</table>

<!-- ❌ WRONG: nested <tbody> — breaks column alignment -->
<table>
  <thead>...</thead>
  <tbody>
    <template x-for="item in items">
      <template x-if="true">
        <tbody>...</tbody>  <!-- invalid: tbody inside tbody -->
      </template>
    </template>
  </tbody>
</table>
```

A table may have multiple `<tbody>` elements as direct children — this is valid HTML and the correct pattern here.

### Accessibility requirements

- Every `<input>` → associated `<label>` (via `for`/`id` or `aria-label`)
- Icon-only buttons → `aria-label`
- Modals → `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title
- Focus must move to the first interactive element when a modal opens
- Toast/status messages → `aria-live="polite"` (or `role="status"`)
- Collapsible sections → `aria-expanded` on the trigger

---

## Script Loading

Vite handles module bundling. `src/js/main.js` is the entry point for `index.html`; `src/js/settings-main.js` is the entry point for `settings.html`. Import order is managed by ES module dependencies — do not use `<script>` tags for app code.

---

## Cross-Page Rules

- When adding a feature, check all pages it affects: `src/index.html`, `src/settings.html`
- The `<head>` (meta, CSS links) must be consistent across both pages

---

## Documentation Update Protocol

When implementing any feature, enhancement, or fix:

1. **`docs/CODE_REVIEW.md`** — mark resolved issues; add new ones discovered
2. **`docs/CHANGELOG.md`** — add entry under the appropriate version
3. **`docs/ROADMAP.md`** — mark completed planned features; add unplanned ones
4. **`docs/DESIGN_SYSTEM.md`** — update if CSS changed (tokens added/removed, components added/removed)
5. **`docs/ARCHITECTURE.md`** — update if tech stack, file responsibilities, state flow, Alpine patterns, or permitted exceptions changed
6. **`README.md`** — update if capabilities, setup, or UI changed

**`docs/SWA_DEPLOYMENT.md`** — update only when the deployment process, authentication setup, or Azure adapter implementation changes. Not required on every feature.

### Versioning

| Bump | When |
|------|------|
| PATCH `1.x.0 → 1.x.1` | Bug fixes, minor polish, docs, refactoring |
| MINOR `1.x → 1.x+1` | New features, new components, new config options |
| MAJOR `1.x → 2.0` | Breaking data model changes, architecture rewrites, framework changes |

When releasing a new MINOR version: move all `✅ COMPLETED` items from `ROADMAP.md` to `COMPLETED_FEATURES.md` and remove them from `ROADMAP.md`.

At every MINOR and MAJOR version increment, run the version review protocol in the Performance Rules section above.

---

## SWA Deployment Notes

The app targets **Azure Static Web Apps** (free tier).

- `npm run build` outputs to `dist/` via Vite
- Auth is handled via SWA's built-in `/.auth/me` endpoint (AAD identity provider)
- No SharePoint-specific constraints apply (CSP, `position: fixed`, `vh` units are all fine)
- `staticwebapp.config.json` handles routing — SPA fallback to `index.html`
- For user identity at init: `fetch('/.auth/me')` → `clientPrincipal.userDetails`

### Storage adapter roadmap

The `Storage` object in `src/js/storage.js` has a pluggable adapter pattern. Current adapter: `'localStorage'`. Future: `'azure'` (Table Storage, Cosmos DB, or an Azure Function API via `_saveRecordToAzure` / `_deleteRecordFromAzure`).
