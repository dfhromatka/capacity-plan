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

  // Legacy bulk API — used for initial load
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
- `op` + `meta` + `saveSpec` + `currentUser` are all available inside `mutate()` — audit trail is live in `audit.js`

### Per-Row Record Taxonomy

| Type | Key field | Description |
|------|-----------|-------------|
| `'entry'` | `entry.id` | One project/other/absence allocation row |
| `'employee'` | `emp.id` | One person record |
| `'month'` | `month.key` | One month configuration |
| `'settings'` | singleton | `planSettings` object |
| `'locations'` | singleton | `activeLocations` array |
| `'appState'` | singleton | `nextId`, filters, groupBy |
| `'auditLog'` | uuid per event | Append-only audit entry (live in `audit.js`) |

---

## Deploying to Azure Static Web Apps

### Prerequisites

- **Resource Group** — must exist before creating the SWA resource (requires IT provisioning if you lack subscription-level permissions)
- **App Registration** — already created by IT; you have admin access to configure redirect URIs and secrets
- **Tier decision** — **Free tier** is sufficient. Free tier supports managed AAD authentication via the built-in `/.auth/me` endpoint. Standard tier ($9/month) is only needed for private endpoints or fully custom auth config — not required here.
- **Estimated cost** — Free tier SWA ($0) + Azure Table Storage (< $1/month at this usage scale)

### Step 1 — Create the SWA resource

1. In the [Azure portal](https://portal.azure.com), open your Resource Group → **Create** → search "Static Web App"
2. Select **Free** plan
3. Choose "Other" for deployment source (manual deploy via SWA CLI)
4. Note the **deployment token** from the SWA resource overview once created — needed for Step 4

### Step 2 — Configure routing

`staticwebapp.config.json` is already configured for SPA routing — no changes needed:

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

### Step 3 — Deploy (M1)

```bash
npm run build
npx @azure/static-web-apps-cli deploy dist/ --deployment-token <token>
```

Note the live URL (e.g. `https://your-app.azurestaticapps.net`) — needed for Step 4.

### Step 4 — Configure App Registration redirect URI

In the Azure portal, open the App Registration IT created:
1. **Authentication** → **Add a platform** → **Web**
2. Add redirect URI: `https://<your-swa-url>/.auth/login/aad/callback`
3. Note the **Application (client) ID** and **Directory (tenant) ID** from the Overview page
4. **Certificates & secrets** — create a new client secret; copy the value immediately (shown once only)

### Step 5 — Enable authentication (M2)

In the SWA resource → **Authentication** → add identity provider → **Azure Active Directory** → provide the client ID and secret from Step 4.

Once enabled, `/.auth/me` is available automatically. Resolve user identity at app init in `src/js/app.js`:

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

---

## Implementing the Azure Storage Adapter (M3)

**Decision:** Azure Table Storage via Azure Function wrapper (connection strings stay server-side).

**Data model:**
- Partition key: `"main"` (one shared plan)
- Row key: `{type}_{id}` — e.g. `entry_42`, `employee_3`, `settings`, `locations`
- Value: JSON-serialised record

**Function endpoints (3 total):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/data` | Load all records for partition `"main"` |
| PUT | `/api/records` | Upsert one record |
| DELETE | `/api/records/{type}/{id}` | Delete one record |

**Auth gating:** SWA automatically injects the authenticated user's identity into every `/api/*` request via the `x-ms-client-principal` header. The Function reads this header to verify the caller is authenticated and to attribute saves.

**Conflict detection:** Azure Table Storage returns an `ETag` per row. Send it back on PUT; if another user saved first, Azure returns 412 — show "Someone else saved this, reload?" prompt.

**Implement these methods in `src/js/storage.js`:**

```javascript
async _saveRecordToAzure(type, record) {
  const res = await fetch('/api/records', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, record })
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
},

async _deleteRecordFromAzure(type, id) {
  const res = await fetch(`/api/records/${type}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
},
```

Then change `adapter: 'localStorage'` to `adapter: 'azure'` in `Storage`.

---

## Data Structure (Full-Blob Reference)

Used by the bulk `load()` API (initial load). Built by `_buildSavePayload()` in `src/js/storage.js`:

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

### M1 — Deploy (localStorage, no auth)
- [ ] IT creates Resource Group with Contributor access
- [ ] Create SWA resource (Free tier) inside the Resource Group
- [ ] `npm run build` → `npx @azure/static-web-apps-cli deploy dist/ --deployment-token <token>`
- [ ] Verify app loads at the SWA URL
- [ ] Note the SWA URL for Steps M2/M3

### M2+M3 — Auth + Azure Storage (do together)
- [ ] Add redirect URI to App Registration: `https://<swa-url>/.auth/login/aad/callback`
- [ ] Note client ID, tenant ID, and new client secret from App Registration
- [ ] Enable AAD auth in SWA resource → Authentication
- [ ] Implement `resolveCurrentUser()` in `src/js/app.js`
- [ ] Create Azure Function App with Table Storage connection string
- [ ] Implement `/api/data`, `/api/records` (PUT), `/api/records/{type}/{id}` (DELETE) Function endpoints
- [ ] Implement `_saveRecordToAzure()` and `_deleteRecordFromAzure()` in `src/js/storage.js`
- [ ] Change `adapter: 'azure'` in `src/js/storage.js`
- [ ] Export localStorage backup before switching adapters
- [ ] Test save, load, and conflict detection end-to-end with real AAD identities

---

## Resources

- [Azure Static Web Apps documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [SWA Authentication & Authorization](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [SWA CLI](https://azure.github.io/static-web-apps-cli/)
- [Azure Table Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/table-service-rest-api)
- [Azure Functions HTTP triggers](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook)
