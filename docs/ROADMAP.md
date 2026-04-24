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

**Scoped decisions (April 2026):**
- **Tier:** SWA Free tier (managed AAD auth via `/.auth/me` is sufficient)
- **Storage:** Azure Table Storage via Azure Function wrapper (per-record, not full-blob)
- **Data model:** One shared plan (`partitionKey: "main"`); row key = `{type}_{id}`
- **Auth:** Entra ID via existing App Registration (admin access confirmed; redirect URI added post-M1)
- **Cost:** ~$0/month (SWA Free) + < $1/month (Table Storage at this scale)
- **Deployment:** Manual via SWA CLI; see `docs/SWA_DEPLOYMENT.md` for step-by-step

**Milestones:**
- **M1** — Deploy existing app to SWA (localStorage, no auth). Blocked on IT creating Resource Group.
- **M2+M3** — Auth + Azure storage adapter, done together (auth provides identity for storage)

**Remaining sub-features (unscoped):**
- **Conflict Detection** — ETag-based per-record conflict detection; "Someone else saved this, reload?" prompt
- **Real-time Updates** — Polling every 30–60s; visual notification when data changes
- **Version History** — Change diff viewer; point-in-time restore (audit log foundation already exists in `audit.js`)

### [#1190] Mobile Responsive View
Tablet and phone optimization:
- Responsive grid layout
- Touch-friendly controls
- Swipe gestures for navigation
- Simplified mobile UI
- Progressive Web App (PWA) support

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

*Last Updated: April 23, 2026*  
*For completed features, see [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)*

**Next Available Feature ID: #1370** *(#1370–#1990 reserved for v1.x features; #2000–#2060 reserved for v2.x Alpine migration — all completed)*
