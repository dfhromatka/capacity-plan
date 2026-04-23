# Capacity Planning Tool

A resource allocation and capacity planning application for managing team availability across projects, admin tasks, and absences.

![Version](https://img.shields.io/badge/version-3.16.0-blue)
![License](https://img.shields.io/badge/license-Internal-green)

---

## Quick Start

**Development (Vite):**
```bash
npm install
npm run dev
```

---

## Documentation

- [Documentation Index](docs/README.md) — what each doc is for and when to update it
- [Architecture Guide](docs/ARCHITECTURE.md) — state flow, file responsibilities, Alpine patterns, CSS rules
- [Design System](docs/DESIGN_SYSTEM.md) — design token and component class reference
- [Code Review](docs/CODE_REVIEW.md) — open debt and known issues
- [Roadmap](docs/ROADMAP.md) — planned features and SWA rewrite phases
- [Changelog](docs/CHANGELOG.md) — version history
- [SWA Deployment](docs/SWA_DEPLOYMENT.md) — Azure Static Web Apps deployment guide

---

## Key Features

- **Resource Planning** — track capacity across a rolling, auto-extended
- month range
- **Employee Management** — teams, locations, fixed allocations
- **Configurable Fixed Allocation Types** — user defined
- **Auto-Save** — localStorage persistence with 500ms debounce
- **Undo/Redo** — full history management (up to 50 steps)
- **Multi-Location** — Configurable ISO countries 
- **Visual Analytics** — monthly availability cards and capacity chart

---

## Project Structure

```
capacity_plan_SWA/
├── CLAUDE.md                    # AI coding rules and architectural constraints
├── staticwebapp.config.json     # Azure SWA routing config
├── vite.config.js               # Vite build config (src/ → dist/)
├── package.json
├── src/                         # Active codebase (Vite + ES modules)
│   ├── index.html               # Main app page
│   ├── settings.html            # Settings page
│   ├── css/
│   │   ├── design-tokens.css    # Single source of truth for all design tokens
│   │   └── styles.css           # Component styles
│   └── js/
│       ├── main.js              # Entry point for index.html
│       ├── settings-main.js     # Entry point for settings.html
│       ├── app.js               # App initialisation
│       ├── store.js             # Alpine.store('plan') + Alpine.store('modal')
│       ├── history.js           # Undo/redo + mutate() dispatcher
│       ├── components.js        # Alpine.data() component registrations
│       ├── modals.js            # Modal call-site wrappers
│       ├── chart.js             # Chart.js wrapper
│       ├── keyboard.js          # Global keyboard shortcuts
│       ├── storage.js           # localStorage abstraction + pluggable adapter pattern
│       ├── data.js              # Legacy mutable globals (migration target)
│       ├── settings-page.js     # Settings page Alpine data
│       ├── toast.js             # Toast notifications
│       └── countries.js         # Country/location lookup data
├── dist/                        # Vite build output (gitignored)
└── docs/
    ├── README.md                # Documentation index
    ├── ARCHITECTURE.md
    ├── DESIGN_SYSTEM.md
    ├── CODE_REVIEW.md
    ├── ROADMAP.md
    ├── CHANGELOG.md
    ├── COMPLETED_FEATURES.md
    └── SWA_DEPLOYMENT.md
```

---

## Deployment

**Target: Azure Static Web Apps (free tier)**

```bash
npm run build        # outputs to dist/
# deploy dist/ to Azure SWA via GitHub Actions or az CLI
```

See [docs/SWA_DEPLOYMENT.md](docs/SWA_DEPLOYMENT.md) for the full deployment guide.

---

## Development Protocol

When implementing features, follow the protocol in `CLAUDE.md`:
1. Read `docs/CODE_REVIEW.md` before starting
2. Update `docs/CHANGELOG.md` with changes
3. Mark completed items in `docs/ROADMAP.md`
4. Update `docs/DESIGN_SYSTEM.md` if CSS changed

---

## License

Internal use only — EMEA North Team
