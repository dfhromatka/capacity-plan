# Capacity Planning Tool — Architecture Guide

> **Audience:** Developers (human and AI) working on this codebase.
> **Purpose:** Understand how the app works, what the rules are, and why, before touching any file.
> For the living list of open issues and known debt, see `docs/CODE_REVIEW.md`.
> For design token and component class reference, see `docs/DESIGN_SYSTEM.md`.

---

## 1. Project Overview

An Alpine.js single-page application for capacity planning. The active codebase lives in `src/`
and builds via Vite. The root-level JS/HTML files are legacy and no longer maintained.

**Deployment target:** Azure Static Web Apps (SWA).

**Tech stack:**
- **Vite v5** — build tool, dev server (`npm run dev`)
- **Alpine.js v3** — reactivity, components, store (installed via npm)
- **ES modules** — `import`/`export` throughout `src/`
- **Browser `localStorage`** — persistence, abstracted via `src/js/storage.js`
- **Plain HTML5 / CSS3** — no framework, no Tailwind

---

## 2. File Responsibilities

Every file has exactly one responsibility. Never add logic that belongs in another file.

| File | Responsibility |
|------|----------------|
| `src/js/storage.js` | `localStorage` read/write abstraction. No Alpine, no DOM. Exposes per-row API (`saveRecord`, `deleteRecord`) as well as bulk `save`/`load`. |
| `src/js/data.js` | Static calendar config (`state.months`) and pure helper functions (`empStats`, `empEntries`, `bh`, etc.). No mutable globals. |
| `src/js/store.js` | `Alpine.store('plan')` — the **single source of truth** for all mutable state. Reactive getters auto-update templates. |
| `src/js/history.js` | `mutate()` dispatcher only. Runs the mutation fn, dispatches per-row save specs to `Storage`, and appends an audit entry. Undo/redo have been removed. |
| `src/js/chart.js` | Stub module — Chart.js was removed in v3.5.0 and replaced with an Alpine CSS bar chart. Exports no-op `initChart`/`updateChart`/`resetChart` for backward-compat. |
| `src/js/keyboard.js` | Global keyboard shortcuts **only**. Documented exception to the no-`addEventListener` rule. |
| `src/js/components.js` | All `Alpine.data()` component registrations. |
| `src/js/modals.js` | Modal open/close call-site wrappers (thin layer). All modal rendering is in Alpine templates. |
| `src/js/settings-page.js` | Settings page Alpine data and logic. |
| `src/js/settings-main.js` | Settings page entry point — wires Alpine for settings.html. |
| `src/js/toast.js` | Toast notification logic. |
| `src/js/main.js` | App entry point — imports and wires all modules for index.html. |
| `src/js/app.js` | App initialisation — wires storage, data, store, and components together on page load. |
| `src/css/design-tokens.css` | **Single source of truth** for all design tokens. |
| `src/css/styles.css` | Component styles only. Must reference design tokens. No raw hex, no inline values. |
| `src/index.html` | Main app page. |
| `src/settings.html` | Settings page. |

---

## 3. State Management — How Data Flows

`Alpine.store('plan')` is the **single source of truth**. All mutable data (`employees`,
`entries`, `activeLocations`, `planSettings`, UI filters, etc.) lives exclusively in the store.
Alpine's `reactive()` proxy tracks property accesses during getter evaluation and re-renders
templates automatically when those properties change.

### State flow

```
mutate() in history.js  →  fn() writes to Alpine.store('plan')
                         ↓
                 Alpine reactive proxy detects change
                         ↓
  get tableData() / get cardData() / get chartData() re-evaluate
                         ↓
              Templates update — no syncStore() needed
```

### Rules

- **All data mutations go through `mutate()`** — do not call `captureUndoSnapshot()` directly.
- **Mutation fn() must write to `Alpine.store('plan')`** — never mutate plain JS objects that live
  outside the store.
- **Array mutations must replace the array ref** — `s.entries = [...s.entries, newEntry]` triggers
  Alpine; `s.entries.push(x)` does NOT.
- **UI state** (active modal, open filters) — write directly to the store; no `mutate()` needed.
- **New features** — add properties directly to `Alpine.store('plan')`; never add to `data.js`.

### `mutate()` signature

```js
// op:   string label — written to the audit log (audit.js)
// fn:   the mutation — writes to Alpine.store('plan') synchronously
// meta: optional context { empId, field, from, to, … } — also written to audit log
// save: per-row save spec — null falls back to triggerAutoSave()
mutate('updateEmployee', () => {
  const s = Alpine.store('plan');
  s.employees = s.employees.map(e => e.id !== empId ? e : { ...e, name: newName });
}, { empId: emp.id, field: 'name', from: emp.name, to: newName },
  { type: 'employee', record: emp });
```

### Reactive getters and dep registration

Store getters delegate computation to module-level functions (`buildCardData`, `buildTableData`)
to avoid Alpine proxy `this`-binding issues. The `void this.x` pattern explicitly registers
reactive deps so Alpine tracks changes even though the actual work happens outside the store:

```js
get tableData() {
  void this.employees; void this.entries; void this.filterISM; // register deps
  return buildTableData(this);  // module-level fn receives store as arg
}
```

### `data.js` role after migration

`data.js` retains only:
- `DATA_VERSION` — schema version constant
- `state.months` — static calendar config array (mutated by settings page for working days/holidays)
- Pure helper functions: `empStats()`, `empEntries()`, `bh()`, `getGroupedEmployees()`,
  `getGroupStats()`, `formatDateShort()`, `getMonthKeyFromDate()`

`loadFromStorage()` in `data.js` writes to `Alpine.store('plan')` and must be called **after**
`Alpine.start()` (via `queueMicrotask()` in entry points).

### Storage granularity — per-row save API (v2.2.7+)

Every `mutate()` call carries a **save spec** as the 4th argument. This spec describes the exact
record(s) to persist, allowing remote adapters to upsert or delete a single row rather than
rewriting the whole dataset.

**Save spec forms:**

| Form | When to use |
|------|-------------|
| `{ type, record }` | Upsert one record after the mutation |
| `{ type, action: 'delete', id }` | Delete one record by its id |
| `[spec1, spec2, ...]` | Multi-record mutations (e.g. delete employee + all their entries) |
| `() => spec` (thunk) | Record is created inside `fn()` and its reference isn't available until after `fn()` runs |
| `null` | No spec — falls back to `triggerAutoSave()` (full-blob save). Used for temp entries. |

**Record type taxonomy** (defined in `storage.js`):

| Type | Key | Examples |
|------|-----|----------|
| `'entry'` | `entry.id` | `cycleRag`, `saveEntry`, `copyEntry` |
| `'employee'` | `emp.id` | `updateEmployee`, `deleteEmployee` |
| `'month'` | `month.key` | `updateMonth` |
| `'settings'` | singleton | `updatePlanSettings` |
| `'locations'` | singleton | `updateLocations` |
| `'appState'` | singleton | `nextId`, filters, groupBy |
| `'auditLog'` | uuid | Reserved — append-only, not yet implemented (#1150) |

**How `Storage.saveRecord()` dispatches:**

```
Storage.saveRecord('entry', entry)
  → localStorage adapter:   triggerAutoSave()              (full blob — no behaviour change)
  → sharepoint adapter:     _saveRecordToSharePoint(...)   (upsert one list item)
  → azure adapter:          _saveRecordToAzure(...)        (future)
```

For the localStorage adapter, `saveRecord` and `deleteRecord` always fall back to
`triggerAutoSave()`, so existing behaviour is **unchanged**. The per-row path only activates
when a remote adapter is configured (see `docs/SWA_DEPLOYMENT.md`).

**Audit trail pre-wiring:**  
`op`, `meta`, `saveSpec`, and `Storage.currentUser` are all available inside `mutate()`.
Adding a persistent audit log (#1150) requires one new line inside `mutate()` — no call-site
changes anywhere in `app.js`.

### New state vs. migrated state

| State type | Where it lives | How to modify |
|------------|---------------|---------------|
| Shared data (`employees`, `entries`, etc.) | `Alpine.store('plan')` | `mutate()` |
| UI state (active modal, open filters, etc.) | `Alpine.store('plan')` directly | Direct store assignment, no `mutate()` needed |
| New features | `Alpine.store('plan')` directly | Direct store assignment |

---

## 4. Alpine.js Patterns

### Component registration

All reusable components are registered via `Alpine.data()` in `src/js/components.js`:

```js
Alpine.data('myComponent', () => ({
  // local state
  isOpen: false,
  // methods
  toggle() { this.isOpen = !this.isOpen; }
}));
```

### Modal pattern (current implementation)

Modals use a dedicated `Alpine.store('modal')` with `open(name, payload)` / `close()` methods.
Templates are static HTML in `index.html` — Alpine shows/hides them reactively.

```html
<!-- Trigger -->
<button @click="$store.modal.open('empEdit', { empId: emp.id })">Edit</button>

<!-- Template (in index.html #modal-root) -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title-emp-edit"
     x-show="$store.modal.active === 'empEdit'"
     x-data="empEditModal"
     @keydown.escape.window="$store.modal.close()">
  ...
</div>
```

### FORBIDDEN patterns — never use these

| Pattern | Use instead |
|---------|-------------|
| `document.querySelector()` / `getElementById()` for UI | `:class`, `:style`, `x-show` bindings |
| `element.classList.add/remove/toggle()` | `:class="{ 'is-active': condition }"` |
| `element.style.x = value` | `:style="{ color: someVar }"` |
| `addEventListener()` for UI events on Alpine elements | `@click`, `@keydown`, `x-on:` directives |
| `window.xyz = function()` | `Alpine.store()` or `Alpine.data()` |
| `document.createElement()` / `innerHTML =` for rendering | Alpine template with `x-for` / `x-show` |
| New mutable globals in `data.js` | `Alpine.store('plan').newProp = value` |

### Permitted exceptions (comment the reason in code)

- `addEventListener('keydown', ...)` in `keyboard.js` — global shortcuts have no Alpine element to attach to
- `$nextTick` — for operations that must occur after Alpine's DOM update cycle

---

## 5. CSS Architecture

### The token system

All visual values must use tokens from `src/css/design-tokens.css`. Never write raw hex, `rgb()`,
`rgba()`, or raw `px` spacing values in component CSS.

```css
/* ✅ Correct */
.btn--primary { background: var(--color-accent); padding: var(--spacing-sm) var(--spacing-md); }

/* ❌ Wrong */
.btn--primary { background: #0070f3; padding: 6px 12px; }
```

**Token prefixes:**

| Prefix | What it covers |
|--------|----------------|
| `--color-*` | All colours (text, backgrounds, borders, semantic states) |
| `--spacing-*` | Padding, margin, gap — `xs / sm / md / lg / xl / 2xl` |
| `--font-*` | Font sizes, weights, line heights |
| `--radius-*` | Border radii — `sm / md / lg / full` |
| `--shadow-*` | Box shadows, focus rings |
| `--z-*` | Z-index values — `dropdown / modal / toast / tooltip` |
| `--duration-*` | Transition durations — `fast / normal / slow` |
| `--easing-*` | Transition easing curves |

### Legacy token debt in `styles.css`

`styles.css` still has a legacy `:root` block with old variable names (`--sap-blue`, `--gray-*`,
`--space-1`, etc.). These are migration targets — do not use them in new rules, and migrate any
rule you touch to the canonical tokens. Common mappings:

```
--sap-blue      →  --color-accent
--gray-200      →  --color-border
--gray-800      →  --color-text-primary
--color-bg      →  --color-background
--space-2       →  --spacing-sm
--space-3       →  --spacing-md
```

### CSS class naming

```
.component-name            Block  (e.g. .modal, .btn, .data-table)
.component-name__element   Element  (e.g. .modal__header, .btn__icon)
.component-name--modifier  Modifier  (e.g. .btn--primary, .btn--sm)
.is-active / .has-error    State classes
```

### Interactive states — required for every interactive element

Every button, link, input, select, and clickable element must have explicit CSS for all four:
- `:hover` — visual feedback on mouse over
- `:focus-visible` — keyboard navigation ring (do NOT remove, style it)
- `:active` — press feedback
- `:disabled` — muted appearance + `cursor: not-allowed`

### DESIGN_SYSTEM.md workflow

Before editing any CSS:
1. Read `docs/DESIGN_SYSTEM.md` to check if a token or component class already exists for what you need.
2. Prefer reusing an existing token over adding a new one.

After editing any CSS, update `docs/DESIGN_SYSTEM.md` in the same task:
- New/changed token → update the relevant token table.
- New/changed component → update the Component Reference section.
- Removed token or component → remove it from the doc.

---

## 6. Script Loading

Vite handles module bundling via ES imports. `src/js/main.js` is the entry point for
`src/index.html`; `src/js/settings-main.js` is the entry point for `src/settings.html`.
Import order is managed by ES module dependencies — do not use manual `<script>` tags for app code.

**Cross-page rule:** The `<head>` section (meta tags, CSS links) must be consistent across
`src/index.html` and `src/settings.html`.

---

## 7. HTML & Accessibility Standards

**Semantic structure:**
- `<main>` — one per page, wraps primary content
- `<header>`, `<nav>`, `<footer>` — structural regions
- `<section aria-labelledby="...">` — major content regions
- `<button>` for interactive controls, `<a>` for navigation — never `<div>` or `<span>` with click handlers
- `<table>` + `<th scope="col/row">` + `<caption>` for tabular data

**Accessibility requirements:**
- Every `<input>` must have an associated `<label>` (via `for`/`id` or `aria-label`)
- Icon-only buttons must have `aria-label`
- Modals must have `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title
- Focus must move to the first interactive element inside a modal when it opens
- Toast/status messages must use `aria-live="polite"` (or `role="status"`)
- Collapsible sections must have `aria-expanded` on the trigger

---

## 8. Known Migration Targets

All previously tracked migration targets are complete:

| Target | Resolution |
|--------|------------|
| `src/js/history.js` undo/redo stacks | Removed — `history.js` is now only a mutation dispatcher |
| `src/css/styles.css` legacy `:root` token names | Resolved — TOKEN-01 fixed v3.14.3; no legacy names remain |

---

## 9. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/CODE_REVIEW.md` | Live tracker of open architectural issues and known debt, with severity and status |
| `docs/DESIGN_SYSTEM.md` | Full reference for all design tokens and component CSS classes |
| `docs/CHANGELOG.md` | History of all changes by version |
| `docs/ROADMAP.md` | Planned features and migration phases |
| `docs/COMPLETED_FEATURES.md` | Archive of shipped features from previous minor versions |
| `CLAUDE.md` | AI coding rules, documentation protocols, and architectural constraints |