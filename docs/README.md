# Documentation Index

This directory contains all project documentation. Each file has a single, defined purpose.
This index tells you what each file is for, who reads it, and when to update it.

For AI coding rules and architectural constraints, see `CLAUDE.md` at the project root.

---

## File-by-file reference

### ARCHITECTURE.md
**Purpose:** Human and AI developer onboarding guide. Explains how the app works — state flow,
file responsibilities, Alpine patterns, CSS token rules, script loading order, accessibility
requirements, and deployment context.  
**Audience:** Anyone touching the codebase for the first time; AI sessions starting a new task.  
**Update when:** The app's state management model changes; new files are added or responsibilities
shift; deployment target changes; Alpine patterns or CSS rules are amended.  
**Do not use for:** Tracking bugs or debt — that's `CODE_REVIEW.md`.

---

### CODE_REVIEW.md
**Purpose:** Live tracker of open architectural debt, known bugs, and improvement opportunities.
Severity-rated (Critical / Important / Enhancement). The AI reads this before every task to avoid
re-introducing known issues and to pick up the highest-priority open work.  
**Audience:** AI (mandatory read before each task); developers picking up the codebase.  
**Update when:** Any task that touches architecture or fixes a known issue. Specifically:
- Mark an issue resolved (with date + version) when it is fully fixed
- Add a new issue when one is discovered during a task
- Update the description of a partially-addressed issue
**Do not use for:** Feature requests or roadmap items — that's `ROADMAP.md`.

---

### DESIGN_SYSTEM.md
**Purpose:** Reference for all design tokens and component CSS classes — a mirror of what is
currently in `css/design-tokens.css` and `css/styles.css`. Not a spec; the CSS files are the
source of truth.  
**Audience:** Anyone writing CSS or building/modifying UI components.  
**Update when:** A design token is added, changed, or removed; a component class is added,
changed, or removed. Always updated in the same task as the CSS change — never ahead of or
behind it.  
**Do not use for:** Architectural or Alpine patterns — that's `ARCHITECTURE.md`.

---

### ROADMAP.md
**Purpose:** Planned features with priorities, IDs, and scope. Also contains the v2.x Alpine
migration phase plans and the v3.0 SWA rewrite phases.  
**Audience:** Developers deciding what to work on next; product planning.  
**Update when:**
- A planned feature is completed → mark `✅ COMPLETED` with date and version
- An unplanned feature is added → add it under the appropriate priority section
- On a new MINOR version release → move all `✅ COMPLETED` items to `COMPLETED_FEATURES.md`
  and remove them from this file
**Do not use for:** Tracking bugs — that's `CODE_REVIEW.md`.

---

### CHANGELOG.md
**Purpose:** Chronological record of every released version — what changed, why, and technical
details. The permanent public history of the project.  
**Audience:** Developers reviewing what changed between versions; anyone debugging a regression.  
**Update when:** Any feature, fix, or refactor is completed. Add an entry under the current
version section. Follow semantic versioning (see `CLAUDE.md` for bump rules).  
**Do not use for:** Future plans — that's `ROADMAP.md`.

---

### COMPLETED_FEATURES.md
**Purpose:** Archive of shipped features from previous minor version cycles. Keeps `ROADMAP.md`
focused on future work while preserving the full feature history.  
**Audience:** Anyone wanting a summary of what the app can do; product history reference.  
**Update when:** A new MINOR version is released — move all `✅ COMPLETED` items from
`ROADMAP.md` into this file under the appropriate version heading.  
**Do not edit otherwise.** This is an append-only archive.

---

### SWA_DEPLOYMENT.md
**Purpose:** Step-by-step guide for deploying the app to Azure Static Web Apps, enabling
authentication, and implementing the Azure storage adapter when ready for a remote back-end.  
**Audience:** Developers setting up the production deployment; anyone implementing the Azure
adapter in `js/storage.js`.  
**Update when:** The deployment process changes; the Azure adapter is implemented; authentication
steps are refined; a new hosting option is added.

---

## Archive

`docs/archive/` contains files that are no longer relevant to the current codebase but are kept
for reference:

| File | Why archived |
|------|-------------|
| `.clinerules` | Replaced by `CLAUDE.md` at project root (March 2026) |
| `SP_POC_DEPLOYMENT.md` | SharePoint POC guide — deployment target changed to Azure SWA |
| `docs_README_v1.4.md` | v1.4-era documentation overview — superseded by current docs structure |
| `UI_AUDIT_CHECKLIST.md` | One-time audit checklist — completed and no longer actionable |
| `IMPROVEMENTS_SUMMARY.md` | v1.x improvement summary — history now in `CHANGELOG.md` |
| `v1.4.0_FIXES.md` | v1.4.0 fix notes — history now in `CHANGELOG.md` |

Do not edit archived files. If something archived becomes relevant again, move it out of
`archive/` and update it rather than editing the archived copy.
