# Capacity Planning Tool - Future Roadmap

This document outlines planned enhancements for the Capacity Planning Tool. For completed features, see [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md).

Feature IDs use increments of 10 (e.g., #1000, #1010, #1020) to allow for future expansion. IDs are permanent and stay with features regardless of priority changes.

---

## 🔴 High Priority

*All high-priority features completed. See [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md).*

---

## 🟡 Medium Priority

*All medium-priority features completed. See [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md).*

---

## 🟢 Low Priority

### [#1170] ~~Framework Migration~~ — *Superseded by v2.0 Alpine.js migration (completed v3.0.0)*

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

### [#1200] Allocation Solver — Budget vs. EPSD Validation
Extends the existing EPSD allocation prompt (`checkEPSDAllocationPrompt` in `src/js/app.js`)
to also validate project budget hours against committed allocations.

New field: `entry.budgetHours` (nullable number, entered in hours, stored as hours, divided
by 8 when comparing against day-based allocations). Appears in the inline row edit panel
only — no new visible column.

Validation modes:
- **Budget + EPSD set, allocations exist** — compare total committed days up to EPSD against
  `budgetHours / 8`; show delta and flag if over/under by >10%
- **Budget + allocations, no EPSD** — compute implied completion month; flag if it extends
  beyond the plan horizon

Implementation notes:
- Extend `checkEPSDAllocationPrompt()` — do not replace it
- Reuse `showConfirmModal()` for the validation prompt
- All allocation mutations via `mutate()` for undo/redo
- Tab sequence unchanged: Project → URL → Notes → EPSD → budget hours → month cells

### [#1210] ~~Custom Themes~~ — *Merged into #1240*

### [#1220] Notifications
Proactive alerts and reminders:
- **Email Alerts** - Overallocation warnings
- **Deadline Reminders** - Project milestones
- **Capacity Warnings** - Team utilization thresholds
- **Browser Notifications** - Real-time updates
- **Daily Digest** - Summary emails

### [#1230] ~~Multiple E&C Rows Support~~ — *Superseded by configurable fixed categories (#1310, v3.15.0)*

### [#1240] User Preferences, Personalization & Themes
Configurable user-level settings and visual customisation:
- **Theme Preferences** — Dark mode, colour schemes, brand customisation, high contrast
- **Display Preferences** — Compact/comfortable view, font size
- **Date Format Preferences** — MM-DD-YY, DD-MM-YY, YYYY-MM-DD, etc.
- **Locale Settings** — Number separators, first day of week
- **Custom chart config** — Axis metric (days vs. %), grouping, visible series (cosmetic polish)
- Stored per user in localStorage; smart defaults from browser locale

### [#1320] Drag & Drop Row Reordering *(unscoped)*
- Drag handle on each row
- Visual feedback during drag
- Reorder within employee section
- Persists order preference
- Works with filtered/sorted views

### [#1330] Bank Holiday Auto-Fetch *(unscoped)*
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

### [#1340] Allocation Guardrails *(unscoped — deferred)*
Per-month allocation warnings: flag months where a project row's allocation exceeds working
days, or falls suspiciously low for an active project. Thresholds would likely be
configurable. May prove unnecessary in practice — defer until user feedback confirms value.

### [#1350] Auto-Fill Allocations from Budget + EPSD ✅ Completed v3.17.0
When a new Project row is saved with both `budgetHours` and `epsd` set, offer to auto-fill
the month allocation cells evenly across the period from the current month through EPSD:

- `budgetDays = budgetHours / 8`
- `months = visibleMonths.slice(currentMonthIdx, epsdIdx + 1)`
- `daysPerMonth = round(budgetDays / months.length, 0.25)` — rounded to nearest quarter-day
- Prompt: *"Distribute X budget days evenly as Yd/month through EPSD? (rounded to ¼ day)"*
- Confirm → fills month cells; Cancel → leaves cells empty
- Only fires when ALL month cells in the range are zero (don't overwrite existing allocations)
- Runs after EPSD prompt (if any) — chain at 200ms after save

---

## 💡 Future/Research

These features require further research and user feedback:

- **AI-Powered Suggestions** - Smart resource allocation recommendations
- **Resource Pools** - Manage shared/fungible resources
- **Skills Matrix Integration** - Match allocations with skills
- **Plan Templates** - Quick setup for common plan types
- **Gantt Chart View** - Timeline visualization
- **Budget Tracking** - Cost projections alongside capacity
- **Advanced Reporting** - Forecasting, burndown charts, resource leveling, PDF/PowerPoint export, dashboard view
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

**Next Available Feature ID: #1350** *(#1350–#1990 reserved for v1.x features; #2000–#2060 reserved for v2.x Alpine migration — all completed)*
