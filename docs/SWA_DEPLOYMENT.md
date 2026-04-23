# Azure Static Web Apps — Deployment Guide

## Overview

The capacity planning app targets **Azure Static Web Apps (SWA)** for hosting. The app lives in `src/` and builds via Vite to `dist/`. The storage layer uses a pluggable adapter pattern — switching from `localStorage` to a remote backend (Azure Table Storage, Cosmos DB, or an Azure Function API) requires only implementing the adapter methods in `src/js/storage.js`, with no changes to app logic.

---

## Current Architecture

### Storage Layer (`src/js/storage.js`)

```javascript
const Storage = {
  adapter: 'localStorage',   // Switch to 'azure' when ready
  currentUser: null,         // Set via Storage.setCurrentUser(name) at init

  // Legacy bulk API — used by undo/redo and initial load
  save(data) { ... },
  load() { ... },
  loadAll() { ... },         // Alias for load(); signals remote-adapter intent at call sites

  // Per-row API — used by all mutate() call sites since v2.2.7
  saveRecord(type, record) { ... },   // Upsert one typed record (localStorage: full-blob; azure: per-record)
  deleteRecord(type, id) { ... },     // Delete one record by id (localStorage: full-blob; azure: per-record)
  setCurrentUser(name) { ... },
}
```

**Benefits:**
- No code changes in app logic when switching adapters
- Per-row API means remote adapters only touch the affected row
- `op` + `meta` + `saveSpec` + `currentUser` are pre-wired in `mutate()` — audit trail (#1150) requires one new line, zero call-site changes

### Per-Row Record Taxonomy

| Type | Key field | Description |
|------|-----------|-------------|
| `'entry'` | `entry.id` | One project/other/absence allocation row |
| `'employee'` | `emp.id` | One person record |
| `'month'` | `month.key` | One month configuration |
| `'settings'` | singleton | `planSettings` object |
| `'locations'` | singleton | `activeLocations` array |
| `'appState'` | singleton | `nextId`, filters, groupBy |
| `'auditLog'` | uuid per event | Append-only audit entry (reserved, #1150) |

---

## Deploying to Azure Static Web Apps

### Step 1 — Create the SWA resource

1. In the [Azure portal](https://portal.azure.com), create a new **Static Web App** (free tier)
2. Connect to your GitHub repository (enables GitHub Actions CI/CD) or choose "Other" for manual deployment
3. Set build details:
   - **App location:** `/` (repository root — Vite config is at root)
   - **Output location:** `dist` (Vite build output)
4. Note the deployment token from the SWA resource overview

### Step 2 — Configure routing

`staticwebapp.config.json` is already configured for SPA routing:

```json
{
  "routes": [
    { "route": "/settings", "rewrite": "/settings.html" }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/settings.html", "/*.{css,js,ico,png,svg,woff2}"]
  }
}
```

### Step 3 — Enable authentication (optional)

In the SWA resource → **Authentication** → add identity provider → **Azure Active Directory**.

Once enabled, the `/.auth/me` endpoint is available automatically. Resolve user identity at app init:

```javascript
async function resolveCurrentUser() {
  try {
    const resp = await fetch('/.auth/me');
    const { clientPrincipal } = await resp.json();
    if (clientPrincipal) {
      Storage.setCurrentUser(clientPrincipal.userDetails);
    }
  } catch { /* unauthenticated or local dev — identity unavailable */ }
}
```

Call `resolveCurrentUser()` before `loadFromStorage()` in `src/js/app.js`.

### Step 4 — Deploy

**Via GitHub Actions (automated):**
Push to the connected branch — GitHub Actions runs the workflow automatically.

**Via Azure CLI (manual):**
```bash
npm run build
az staticwebapp deploy --name <app-name> --resource-group <rg> --source dist/
```

**Via SWA CLI (local dev + deploy):**
```bash
npm install -g @azure/static-web-apps-cli
swa start http://localhost:5173 --run "npm run dev"   # local dev with auth emulation
swa deploy dist/ --deployment-token <token>           # manual deploy
```

---

## Implementing the Azure Storage Adapter

When ready to replace `localStorage` with a persistent remote backend, implement these two methods in `js/storage.js`:

```javascript
async _saveRecordToAzure(type, record) {
  // POST/PUT to your Azure Function or Table Storage REST endpoint
  // e.g. POST /api/records with { type, record }
},

async _deleteRecordFromAzure(type, id) {
  // DELETE to your Azure Function or Table Storage REST endpoint
  // e.g. DELETE /api/records/${type}/${id}
},
```

Then change `adapter: 'localStorage'` to `adapter: 'azure'` in `Storage`.

For **Azure Table Storage** directly, or for **Cosmos DB**, consider wrapping the calls behind an **Azure Function** (HTTP trigger) to avoid exposing connection strings in client-side code.

---

## Data Structure (Full-Blob Reference)

Used by the bulk `save()` / `load()` API (undo/redo, initial load). Built by `_buildSavePayload()` in `src/js/storage.js`:

```javascript
{
  dataVersion,
  planSettings:    { planName, planDescription, yellowThreshold, greenThreshold, redThreshold,
                     fixedCategories, budgetTolerancePct },
  activeLocations: [...],     // ISO country codes
  employees:       [...],
  monthConfig:     {},        // working days / bank holidays keyed by month key
  entries: [...],             // days serialised as { [monthKey]: days } objects
  state: {
    nextId, nextEmpId,
    activeFilters,            // [{ field, condition }, ...] — 3 slots
    filterRowsShown,
    groupBy,
    expandedOH, expandedGroups,
    sortColumn, sortDirection,
    viewStartIndex,
    showAvailCards,
    collapseAllEntries,
    expandedInSummary,
    showArchived,
  },
  auditLog: [...],            // append-only audit entries (capped 50)
}
```

---

## Local Development

No Azure account needed for local dev — the app runs entirely on `localStorage`:

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
```

To test SWA authentication locally, use the SWA CLI which emulates `/.auth/me`:
```bash
swa start http://localhost:5173 --run "npm run dev"
```

---

## Deployment Checklist

### Full SWA deployment (with auth + remote storage)
- [ ] Create SWA resource and connect GitHub repo
- [ ] Enable AAD authentication in SWA settings
- [ ] Implement `resolveCurrentUser()` using `/.auth/me`
- [ ] Implement `_saveRecordToAzure()` and `_deleteRecordFromAzure()` in `storage.js`
- [ ] Change `adapter: 'azure'` in `storage.js`
- [ ] Export localStorage backup before switching adapters
- [ ] Test save, load, and undo/redo end-to-end with real AAD identities
- [ ] Configure CORS on the Azure Function / storage backend

---

## Resources

- [Azure Static Web Apps documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [SWA Authentication & Authorization](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [SWA CLI](https://azure.github.io/static-web-apps-cli/)
- [Azure Table Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/table-service-rest-api)
- [Azure Functions HTTP triggers](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook)
