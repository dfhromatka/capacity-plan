# Capacity Planning Tool - Future Roadmap

This document outlines planned enhancements for the Capacity Planning Tool. For completed features, see [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md).

Feature IDs use increments of 10 (e.g., #1000, #1010, #1020) to allow for future expansion. IDs are permanent and stay with features regardless of priority changes.

---

## 🔴 High Priority

*All high-priority features completed. See [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md).*

---

## 🟡 Medium Priority

### [#1280] Move Filters to Left Panel ✅ *Completed 2026-04-21 (v3.7.0) — moved to COMPLETED_FEATURES.md*

### [#1270] Collapse All Employee Detail Rows ✅ *Completed 2026-04-21 (v3.8.0) — moved to COMPLETED_FEATURES.md*

### [#1290] Per-Employee Expand in Summary Mode ✅ *Completed 2026-04-21 (v3.9.0) — moved to COMPLETED_FEATURES.md*

### [#1300] Delete vs. Archive Choice Modal ✅ *Completed 2026-04-21 (v3.10.0)*

Replace the current archive-only icon on allocation rows with a red × button that opens a modal
giving the user a clear choice between two actions:

**On a normal (unarchived) row:**
- **Archive** — soft-hide the row; allocations are preserved and continue to affect past and
  future availability calculations; row reappears when "Show archived" is toggled on
- **Delete** — permanently removes the row and all its allocation data; no recovery path until
  #1150 (Audit Trail) is implemented

**On an archived row (when "Show archived" is active):**
- **Restore** — un-archives the row; it reappears in the default view
- **Delete** — same permanent deletion as above

The modal wording should make the irreversibility of Delete explicit. Undo (Ctrl+Z) works for
Archive and Restore; Delete is not undoable.

**Implementation notes:**
- Replace `📦` span with a `×` button (`.row-action-btn--delete`) in the entry `<tr>`
- Wire `@click.stop` to a new `$store.plan.promptDeleteOrArchive(row.id)` method that opens a
  dedicated modal (`'deleteOrArchive'`) via `$store.modal.open()`
- Add `deleteOrArchiveModal` Alpine.data component in `components.js`
- `archiveEntry()` and `deleteEntry()` already exist (or need to be added) in `store.js`; the
  modal calls whichever the user picks

**Dependency:** None. Can be implemented independently of #1150.
**Note:** "Permanent for now" — restore capability deferred to #1150 (Audit Trail).

### [#1320] Drag & Drop Row Reordering *(unscoped — Low Priority)*

Drag & drop functionality for better organization:
- Drag handle on each row
- Visual feedback during drag
- Reorder within employee section
- Persists order preference
- Works with filtered/sorted views

### [#1110] Hide/Archive Rows ✅ *Completed 2026-04-21 (v3.9.0) — moved to COMPLETED_FEATURES.md*

### [#1120] Utilization Filtering ✅ *Completed 2026-04-21 (v3.8.0) — moved to COMPLETED_FEATURES.md*

### [#1130] Rolling/Dynamic Date Range ✅ *Completed 2026-04-20 (v3.4.0) — moved to COMPLETED_FEATURES.md*

### [#1160] Import/Export ✅ *Completed 2026-04-20 (v3.4.2) — moved to COMPLETED_FEATURES.md*

### [#1330] Bank Holiday Auto-Fetch *(unscoped — Low Priority)*

Automatic bank holiday fetching with smart working day calculation:
- **API integration** - Fetch holidays from public APIs (e.g., Calendarific, Nager.Date)
- **Multi-country support** - Different holiday calendars per location (France, Czech Republic, etc.)
- **Working days auto-calculation** - Automatically calculate: Working Days = Weekdays - Bank Holidays
  - Eliminates manual entry in "Working Days & Bank Holidays" settings panel
  - Updates automatically when months are added/removed or holidays change
  - Per-location calculation based on each country's holiday calendar
- **Override capability** - Manual adjustments when API data is incorrect or for company-specific holidays
- **Annual refresh** - Auto-update holidays for new year
- **Fallback mode** - Uses simple weekday count if API unavailable
- **Cache strategy** - Store fetched holidays locally to minimize API calls
- Reduces manual calendar configuration significantly

### [#1150] Audit Trail & Version History ✅ COMPLETED v3.11.0 (2026-04-21)
Implemented localStorage-based audit trail with History tab in Settings:
- Append-only audit log (capped 50 entries), persisted in localStorage
- History tab: reverse-chronological list with label, detail, timestamp
- Point-in-time restore with confirm modal; current state becomes new undo point
- Export audit log as JSON; Clear history with confirm
- IM-01 resolved: undo/redo stacks migrated to Alpine store; reactive toolbar buttons added
- Future: Azure back-end integration for multi-user persistence (deferred)

### [#1160] Import/Export ✅ *Completed 2026-04-20 (v3.4.2)*
JSON backup export and import wired to `Storage.exportToFile` / `importFromFile`. UI panel added
to Plan Settings tab in settings.html. Clear All Data button also added. Excel/CSV/Print deferred.

---

## 🟢 Low Priority

### [#1170] ~~Framework Migration~~ — *Superseded by v2.0 plan below*
See the **v2.0 Alpine.js Migration** section at the bottom of this file. React remains a long-term option if a full SPFx build toolchain becomes available.

### [#1180] Azure Back-End Integration & Multi-User
Production deployment with collaboration features:

- **Azure Storage Back-End** - Replace localStorage with Azure Table Storage or Cosmos DB
  - REST API integration for CRUD operations (via Azure Function or direct)
  - Authentication via Azure AD (SWA built-in `/.auth/me` endpoint)
  - Enables multi-user deployment
  
- **Conflict Detection** - Concurrent editing protection
  - Detect when multiple users edit same data
  - Timestamp-based change tracking
  - Conflict resolution UI
  - "Last saved by" indicator
  
- **Real-time Updates** - Live data synchronization
  - Polling mechanism to fetch updates (every 30–60s)
  - Visual notification when data changes
  - Auto-refresh with user consent
  
- **Entra ID Authentication** - Enterprise SSO
  - Azure AD identity provider configured in SWA settings
  - User identity via `/.auth/me` → `clientPrincipal.userDetails`
  - Audit trail with user attribution
  
- **Version History & Audit Trail** - Track changes over time
  - Log all modifications with timestamps
  - User attribution for changes
  - Rollback capability
  - Change diff viewer

### [#1190] Mobile Responsive View
Tablet and phone optimization:
- Responsive grid layout
- Touch-friendly controls
- Swipe gestures for navigation
- Simplified mobile UI
- Progressive Web App (PWA) support

### [#1200] Advanced Reporting
Analytics and forecasting:
- **Custom Charts** - Create custom visualizations
- **Forecasting** - Predict future capacity needs
- **Burndown Charts** - Track project progress
- **Resource Leveling** - Smart allocation suggestions
- **Export Reports** - PDF/PowerPoint generation
- **Dashboard View** - Executive summary page

### [#1210] Custom Themes
Personalization options:
- **Dark Mode** - Reduce eye strain
- **Color Schemes** - Brand customization
- **Accessibility** - High contrast modes
- **Font Size** - User preference
- **Compact/Comfortable Views** - Density options

### [#1220] Notifications
Proactive alerts and reminders:
- **Email Alerts** - Overallocation warnings
- **Deadline Reminders** - Project milestones
- **Capacity Warnings** - Team utilization thresholds
- **Browser Notifications** - Real-time updates
- **Daily Digest** - Summary emails

### ✅ [#1310] Configurable Fixed Allocation Categories — Completed v3.15.0 (2026-04-22)

Categories are now plan-configurable. `planSettings.fixedCategories` holds definitions; `employee.ohAllocations` holds per-employee values keyed by ID. Settings → Fixed Allocation tab has a category management card. Employee edit modal dynamically renders category inputs. Legacy flat fields migrated on first load.

### [#1230] Multiple E&C Rows Support
Enhanced ethics & compliance tracking:
- Support for multiple E&C activity rows per employee
- Editable 'Project / Activity' column for each E&C row
- Separate tracking for different compliance initiatives
- Aggregated E&C totals in summary view

### [#1240] User Preferences & Personalization
Configurable user-level settings for personalized experience:
- **Date Format Preferences** - Choose format: MM-DD-YY, DD-MM-YY, YYYY-MM-DD, etc.
- **Theme Preferences** - Light/Dark mode, color schemes
- **Display Preferences** - Compact/comfortable view, font size
- **Locale Settings** - Currency format, number separators, first day of week
- **Stored per user** - Settings persist across sessions in localStorage
- **Import/Export** - Backup and transfer preferences
- **Smart defaults** - Intelligent defaults based on browser locale
- Foundation for future personalization features

---

## 💡 Future/Research

These features require further research and user feedback:

- **AI-Powered Suggestions** - Smart resource allocation recommendations
- **Resource Pools** - Manage shared/fungible resources
- **Skills Matrix Integration** - Match allocations with skills
- **Plan Templates** - Quick setup for common plan types
- **Gantt Chart View** - Timeline visualization
- **Budget Tracking** - Cost projections alongside capacity
- **Integration with Jira/Azure DevOps** - Auto-sync work items
- **Slack/Teams Notifications** - Real-time collaboration alerts

---

## Contributing Ideas

Have a feature suggestion? Consider:
1. **User Impact** - How many users would benefit?
2. **Implementation Complexity** - Quick win or major undertaking?
3. **Alternative Solutions** - Can existing features be combined?
4. **Alignment** - Does it fit the tool's core purpose?

---

*Last Updated: April 22, 2026*  
*For completed features, see [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)*

**Next Available Feature ID: #2070** *(#1340–#1990 reserved for v1.x features; #2000–#2060 reserved for v2.x Alpine migration)*


> **v2.2.4 — Local vendor fallbacks for CDN libraries (IM-05) ✅ COMPLETED 2026-03-26**
> Alpine.js v3.14.8 and Chart.js v4.4.0 vendored locally to `js/vendor/`. `onerror` fallback
> handlers added to both CDN `<script>` tags in `index.html` and the Alpine CDN tag in
> `settings.html`. `js/vendor/README.md` documents the vendored files, versions, and update
> procedure. `js/vendor/README.md` documents the vendored files, versions, and update
> procedure. Resolves IM-05 from CODE_REVIEW.md (CDN resilience rule).

> **v2.2.3 — Design System Documentation (IM-03) ✅ COMPLETED 2026-03-26**
> `docs/DESIGN_SYSTEM.md` fully rewritten. All design token groups, component class names
> (both legacy and BEM systems), architecture notes, coexisting-systems guide, accessibility
> requirements, and do's/don'ts documented. Resolves IM-03 from CODE_REVIEW.md.

**Goal:** Zero visible UI changes. Wire Alpine into the app and establish the reactive store.

**Scope:**
- Add `<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js">` to `index.html` and `settings.html`
- Create `js/store.js` — defines `Alpine.store('plan', {...})` containing all current `data.js` globals as reactive properties (`employees`, `entries`, `months`, `planSettings`, `activeLocations`, all filter state, `groupBy`, `expandedOH`, `expandedGroups`, `sortColumn`, `sortDirection`, `nextId`, `nextEmpId`)
- All existing setters in `app.js` (`setISM`, `setIPM`, `setType`, `setLocation`, `setGroupBy`, `clearAllFilters`) write to the store (store is live but no Alpine templates yet)
- `renderAll()` continues to run unchanged — hybrid mode
- App works identically to v1.7.0

**Files created:** `js/store.js`  
**Files modified:** `index.html`, `settings.html`, `app.js`  
**Regression risk:** Very low (no rendering changes)

---

### [#2010] v2.1.0 — Header Region: Filter Bar + Summary Cards *(MINOR)* ✅ COMPLETED 2026-03-25

> **v2.1.5 — Tailwind CDN removed ✅ COMPLETED 2026-03-25**
> `css/utilities.css` (27 hand-written rules) created then immediately superseded by 8 semantic
> layout classes added to `css/styles.css` (`.app-page`, `.page-header`, `.page-title`,
> `.page-subtitle`, `.controls-row`, `.summary-section`, `.summary-empty`, `.summary-label`).
> Tailwind CDN `<script>` and dead `tailwind.config` block removed from both HTML files.
> Zero external CSS dependencies remain.
>
> **v2.1.6 — Inline styles eliminated ✅ COMPLETED 2026-03-25**
> All remaining static `style=` attributes extracted to semantic CSS classes in `css/styles.css`.
> `index.html`: 3 attributes → `.card-strip`, `.card-month-label`, `.card-bottom-text`.
> `settings.html`: page-scoped `<style>` block (12 rules) + 2 inline attributes migrated to a
> new `SETTINGS PAGE` section in `styles.css`; `<body>` now uses `class="settings-page"`.
> Zero `style=` attributes remain in either HTML file.

**Goal:** Convert the `#app-top` DOM region to Alpine. `renderAll()` stops touching this region.

**Scope — filter bar:**
- All four filter dropdowns become a single `x-data="filterBar()"` Alpine component
- Replaces `buildFilterDropdown`, `toggleDropdown`, `_closeAllDropdowns`, `filterDropdownSearch`, `dropdownKeyNav`, `selectDropdown` in `components.js`
- Consistent styling with settings page location dropdown (fixes visual inconsistency)
- Arrow-key navigation properly scrolls the option list (browser handles it natively)
- Group By `<select>` restyled to match filter dropdown trigger buttons (fixes font mismatch)
- Hierarchical ISM → IPM cascading and Location filter cascading both work correctly (fixes current bugs)

**Scope — summary cards:**
- `rCards()` replaced with `x-for` loop over `getVisibleMonths()`
- Plan title, employee count: `x-text` bindings
- Date range button, Settings button: `@click` bindings

**Removes:** `buildFilterDropdown`, `toggleDropdown`, `_closeAllDropdowns`, `filterDropdownSearch`, `dropdownKeyNav`, `selectDropdown`, `rHeader()`, `rCards()` from `components.js`  
**Files modified:** `index.html`, `js/components.js`, `js/app.js`  
**Regression risk:** Low-medium (isolated `#app-top` region; all other regions unchanged)

---

### [#2020-phase4] v3.1 — Table Alpinification *(MINOR — Phase 4)* ✅ COMPLETED 2026-04-20

**Goal:** Convert the `#app-table` DOM region to Alpine. Eliminated all `window.*` transitional exports from `src/js/app.js`.

All done. See `CHANGELOG.md` v3.1.0 for details.

---

### [#2030] v2.3.0 — Modals *(MINOR)* ✅ COMPLETED in v3.0.0 (SWA rewrite)

All modal types in `src/index.html` and `src/settings.html` use Alpine `x-show` components in `#modal-root`. `src/js/modals.js` contains zero `innerHTML` — thin call-site wrappers only.

---

### [#2040] v2.4.0 — Settings Page *(MINOR)* ✅ COMPLETED in v3.0.0 (SWA rewrite)

`src/settings.html` is a full Alpine app with `<body x-data="settingsPage">`. All 4 tabs are `x-show` panels. All mutations go through `mutate()`. Location dropdown, employee table, fixed commitments, and calendar all use `x-for`/`x-model`. No `innerHTML`, no `renderTab()`.

---

### [#2060] v3.3 — Full State Migration ✅ COMPLETED 2026-04-20

**Goal:** Eliminate the dual-state anti-pattern (`data.js` globals + `Alpine.store` manual copies
+ `sync()`). `Alpine.store('plan')` is now the single source of truth. Alpine's reactive getters
auto-update; no `syncStore()` needed.

**Delivered:**
- `data.js` stripped to static config (`months` only) — mutable globals eliminated
- Reactive getters in `store.js` with `void this.x` dep registration
- All `mutate()` fn() closures write directly to `Alpine.store('plan')`
- `history.js` snapshots/restores from store; `setSyncFn` removed
- `storage.js` save payload reads from store
- `loadFromStorage()` writes to store; runs after `Alpine.start()`
- Settings page reads/writes store directly
- `sync()` and `syncStore()` deleted
- Build verified: `npm run build` passes cleanly

See `CHANGELOG.md` v3.3.0 for full file-by-file details.

---

### [#2050] v3.2 — Final Cleanup & Integration ✅ COMPLETED 2026-04-20

**Delivered:**
- `rChart()` string-builder deleted; chart HTML moved to `src/index.html` as static markup with design token CSS classes
- `renderAll()` simplified — no more `innerHTML` injection
- All `_render` callback injection patterns removed from `components.js`, `store.js`, `modals.js`, `main.js`, `settings-main.js`
- Legacy root files deleted: `/js/`, `/css/`, `/index.html`, `/settings.html`, `/capacity_plan.html`, `/debug_check.cjs`
- Build verified: `npm run build` passes cleanly

---

### Version transition note

Per the `CLAUDE.md` protocol, **v2.0.0 is a MAJOR version bump**. Before beginning v2.0.0 work:
1. All ✅ COMPLETED items from the v1.7.x cycle move to `COMPLETED_FEATURES.md`
2. `ROADMAP.md` is cleared of those items
3. Version badge in `README.md` updated to `2.0.0`

Feature IDs #2000–#2050 are reserved for the v2.x Alpine migration phases.  
**Next available ID after v2.x series: #2060**

---

*Last Updated: April 22, 2026*  
*For completed features, see [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)*

**Next Available Feature ID: #2070** *(#1340–#1990 reserved for v1.x features; #2000–#2060 reserved for v2.x Alpine migration)*
