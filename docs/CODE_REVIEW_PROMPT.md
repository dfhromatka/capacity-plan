# Code Review Prompt — Capacity Planning Tool

Use this prompt with an LLM (Claude, GPT-4, etc.) to get a thorough code review. Feed it the full contents of each file listed, then send the prompt below.

---

## Files to include

Paste the full contents of each file:

**JavaScript**
- `src/js/storage.js`
- `src/js/data.js`
- `src/js/store.js`
- `src/js/history.js`
- `src/js/app.js`
- `src/js/main.js`
- `src/js/components.js`
- `src/js/modals.js`
- `src/js/chart.js`
- `src/js/keyboard.js`
- `src/js/toast.js`
- `src/js/audit.js`
- `src/js/csv.js`
- `src/js/countries.js`
- `src/js/settings-page.js`
- `src/js/settings-main.js`

**CSS**
- `src/css/design-tokens.css`
- `src/css/styles.css`

**HTML**
- `src/index.html`
- `src/settings.html`

---

## The Prompt

You are reviewing a near-production single-page web application. It is a capacity planning tool built with:
- **Alpine.js v3** (reactivity, components, stores)
- **Chart.js v4** (charts)
- **Vite v5** (build, ES modules)
- **Vanilla CSS with design tokens** (no Tailwind, no framework)
- **Browser `localStorage`** for persistence (about to be replaced with Azure Table Storage)

The app is about to receive a backend integration rewrite targeting **Azure Static Web Apps** with Entra ID authentication and Azure Table Storage. Any issues you find will be fixed before that work begins, so please be as thorough and specific as possible — find everything.

---

### Architecture overview

**State model:**
- `Alpine.store('plan')` is the single source of truth for all mutable data and filter state
- `Alpine.store('ui')` holds transient UI-only state (e.g. `editingRowId`, `showKeyboardHelp`) — writing to `$store.ui` does NOT trigger the expensive `tableData`/`cardData`/`chartData` getters
- `Alpine.store('modal')` manages modal visibility
- All data mutations must go through `mutate(op, fn, meta, saveSpec)` in `history.js`, which runs: `captureUndoSnapshot()` → `fn()` → `triggerAutoSave()`
- Direct store writes (without `mutate()`) are only legal for UI state

**Key computed getters** (expensive — re-run on every `$store.plan` property write):
- `tableData` — builds the full table row set
- `cardData` — builds the availability card data
- `chartData` — builds Chart.js datasets

**File responsibilities** (each file has one job — violations are architectural debt):

| File | Responsibility |
|------|----------------|
| `storage.js` | `localStorage` read/write abstraction. No Alpine, no DOM. |
| `data.js` | Static config + pure helper functions. No mutable globals. |
| `store.js` | `Alpine.store` definitions. Single source of truth. |
| `history.js` | Undo/redo + `mutate()` dispatcher. |
| `chart.js` | Chart.js wrapper only. |
| `keyboard.js` | Global keyboard shortcuts only. |
| `components.js` | All `Alpine.data()` registrations. |
| `modals.js` | Thin modal call-site wrappers. No `innerHTML`. |
| `settings-page.js` | Settings page Alpine data and logic. |
| `toast.js` | Toast notification logic. |
| `audit.js` | Audit log logic. |
| `app.js` | App init — wires storage, data, store, components. |
| `main.js` | Entry point for `index.html`. |
| `settings-main.js` | Entry point for `settings.html`. |

---

### What to look for

Review every file against every category below. For each issue, give:
1. **ID** — short code (e.g. `ARCH-05`, `PERF-11`, `CSS-03`)
2. **Severity** — 🔴 Critical / 🟡 Important / 🟢 Enhancement
3. **File + line/area** — as precise as possible
4. **What is wrong** — be specific; quote the offending code if useful
5. **Why it matters** — what breaks, degrades, or becomes inconsistent
6. **Fix direction** — concrete enough to act on

---

#### 1. Architecture violations

- Any `mutate()` bypasses: direct writes to `$store.plan` that should go through `mutate()` (i.e. writes to data properties, not UI properties)
- Any `captureUndoSnapshot()` called outside of `mutate()`
- Any state that belongs in `Alpine.store('ui')` but lives in `Alpine.store('plan')` — specifically: anything that does not need to invalidate `tableData`/`cardData`/`chartData` when it changes
- Any mutable globals added to `data.js` (it should contain only static config and pure functions)
- Any file that has drifted outside its single responsibility (e.g. `storage.js` doing DOM work, `chart.js` mutating store state)
- Any `window.xyz = ...` global exports
- Any `Alpine.store` properties that are missing from the initial store definition (added dynamically with `store.newProp = ...` outside the store definition — Alpine v3 does not react to new property additions)

#### 2. Reactivity bugs

- Alpine v3 **object mutation**: any `obj.key = val` or `obj[key] = val` on a store-owned plain object that should be `store.obj = { ...store.obj, [key]: val }` — Alpine does not detect in-place key addition
- Alpine v3 **array mutation**: any `.push()`, `.splice()`, `.sort()` on a store-owned array that should replace the array reference
- Any `x-data` property that reads from `$store.plan` but does not react to changes (stale snapshot at component init)
- Any `x-effect` or `$watch` that fires unnecessarily on unrelated store writes

#### 3. Performance

- Any `array.filter()`, `array.find()`, `array.findIndex()`, or loop inside `tableData`, `cardData`, or `chartData` that runs per-row without using a pre-built `Map` index
- Any template expression (`x-text`, `x-bind`, `:class`, etc.) that calls a function, does a filter, or computes anything non-trivial instead of reading a pre-computed property
- Any two sequential store property writes in the same handler that could be combined into one (each write schedules a full reactive flush)
- Any `JSON.parse` / `JSON.stringify` / `Storage.load()` called in a hot path (filter change, row click, tab switch, keydown handler)
- Any `x-show` used where `x-if` is correct: permanent structural conditions (item.type never changes while in DOM) should use `x-if` so the DOM branch is never created for non-matching items
- Any `x-if` used where `x-show` is correct: frequently toggled visibility (edit mode, expand, panel open) destroys/recreates DOM on every toggle — should use `x-show`
- Any pure function called in a loop (per-employee, per-month, per-row) that is not memoised and could produce identical results for the same inputs

#### 4. Storage / persistence

- Any store property that is serialised by `_buildSavePayload()` but is session-only state (should not be persisted)
- Any expensive or frequently-written data in the main `localStorage` blob that could be stored separately to reduce serialisation cost
- Any call to `Storage.load()` outside of app init (it does a full JSON parse — must not be in hot paths)
- Any `saveRecord()` call that passes the wrong `type` string (mismatched against the taxonomy: `'entry'`, `'employee'`, `'month'`, `'settings'`, `'locations'`, `'appState'`)
- Any mutation that writes to the store but never calls `triggerAutoSave()` — unsaved data that survives a reload only because of a later unrelated save
- The `adapter: 'localStorage'` switch block in `saveRecord()` and `deleteRecord()` — check it is complete and will cleanly support a future `'azure'` branch without requiring call-site changes

#### 5. HTML / accessibility

- Any `<div>` or `<span>` with `@click` that should be a `<button>` or `<a>`
- Any `<button>` missing an accessible label (icon-only buttons need `aria-label`)
- Any `<input>` not associated with a `<label>` (via `for`/`id` or `aria-label`)
- Any modal missing `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`
- Any `<tbody>` nested inside another `<tbody>` (invalid HTML — breaks column alignment with `<thead>`)
- Any `x-for` that produces multiple `<tr>` per iteration inside an outer `<tbody>` instead of using multiple `<tbody>` as direct `<table>` children
- Any missing `aria-expanded` on collapsible triggers
- Any toast/status update area missing `aria-live="polite"` or `role="status"`
- Any use of `tabindex` that creates a non-natural tab order
- Any interactive element missing `:focus-visible` styling (outline removal without alternative)

#### 6. CSS

- Any raw hex, `rgb()`, or `rgba()` colour value that should be a `var(--color-*)` token
- Any raw `px` spacing value that should be a `var(--spacing-*)` token
- Any hardcoded z-index integer that should be a `var(--z-*)` token
- Any duplicate CSS rule or selector block
- Any class defined in `styles.css` but never referenced in any HTML file
- Any inline `style="..."` attribute in HTML that should be a CSS class
- Any `:root` variable defined in `styles.css` (should only be in `design-tokens.css`)
- Any token defined in `design-tokens.css` that is never referenced
- Any interactive element (button, link, input, clickable) missing one of: `:hover`, `:focus-visible`, `:active`, `:disabled` states
- Any `appearance: none` or CSS hack trying to style a native `<select>` in a toolbar/filter context (should be replaced with a custom Alpine dropdown)

#### 7. JavaScript quality

- Any `var` declaration (should be `const` or `let`)
- Any implicit global (variable assigned without `const`/`let`/`var`)
- Any `==` / `!=` instead of `===` / `!==`
- Any unhandled promise (`.then()` without `.catch()`, `await` without try/catch in a context where failure matters)
- Any `console.log` / `console.warn` / `console.error` left in production code
- Any function longer than ~60 lines that has multiple distinct responsibilities and should be split
- Any deeply nested callback or promise chain that should be async/await
- Any magic number or magic string used directly in logic (should be a named constant)
- Any event listener added with `addEventListener` outside of `keyboard.js` on an Alpine-managed element (should use `@event` binding)
- Any `innerHTML =` assignment (XSS risk — all rendering must go through Alpine templates)
- Any `document.querySelector` / `getElementById` used for UI state (should use Alpine bindings)

#### 8. Security (pre-backend)

- Any place where user-supplied string values are concatenated into HTML without escaping (XSS)
- Any `eval()` or `Function()` constructor
- Any sensitive value (token, key, connection string) that could end up in the client bundle
- Any `fetch()` call that does not validate the response status before using the body
- Any CORS assumption baked into client code that will break when the Azure Function API is introduced
- Look ahead: given that `storage.js` will soon call `fetch()` to an Azure Function API, are there any structural problems that will make that transition unsafe or error-prone?

#### 9. Azure SWA readiness (look ahead)

The app is about to gain:
- `resolveCurrentUser()` via `fetch('/.auth/me')` called in `app.js` before data load
- `_saveRecordToAzure(type, record)` and `_deleteRecordFromAzure(type, id)` in `storage.js`
- `adapter: 'azure'` switch

Review the existing code for anything that will make this transition harder:
- Any assumption that storage operations are synchronous (they will become async)
- Any place that calls `saveRecord()` or `deleteRecord()` and ignores or cannot handle a returned Promise
- Any data shape that is fine in a JSON blob but problematic as individual Table Storage rows (e.g. arrays stored as sub-objects, large text fields, key naming)
- Any missing `currentUser` attribution on mutations that will need an audit trail
- Any init sequence ordering issue: if `resolveCurrentUser()` is async, does the rest of `app.js` init correctly handle awaiting it?
- Any place where the undo/redo stack snapshots data that will become stale or incorrect when remote storage is the source of truth

#### 10. `storage.js` deep-dive

This file is the critical seam for the backend transition. Give it extra scrutiny:
- Is `_buildSavePayload()` accurate — does it include everything needed and nothing that shouldn't be persisted?
- Does `load()` / `loadAll()` correctly reconstruct all store state, including derived/computed fields?
- Is the `saveRecord()` / `deleteRecord()` per-row API complete — are there mutation types that still use the bulk `save()` instead of the per-row API?
- Are there any race conditions in the debounced `triggerAutoSave()`?
- Is error handling sufficient for `localStorage` quota errors?

---

### Output format

Group findings by category. Within each category, order by severity (🔴 first). Use the ID format suggested above, continuing from where the existing log leaves off (last known IDs: `ARCH-04`, `SORT-01`, `EPSD-01`).

At the end, provide a **priority order** — the sequence in which issues should be fixed before the Azure backend work begins, considering dependencies between fixes.

Do not summarise the codebase or restate what it does. Only report issues. If a category is clean, write "No issues found." and move on.
