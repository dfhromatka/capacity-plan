# Local Development — Azure Backend

This guide covers running the full Azure backend stack locally: Azure Functions API, Azure Table Storage, and SWA auth emulation. No deployment required.

## Prerequisites

| Tool | Install |
|------|---------|
| Azure Functions Core Tools v4 | `npm install -g azure-functions-core-tools@4 --unsafe-perm true` |
| SWA CLI | `npm install -g @azure/static-web-apps-cli` |
| Azure CLI | [Install guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |

Verify:
```bash
func --version       # should be 4.x
swa --version
az --version
```

---

## One-time setup

### 1. Create the Azure Storage Account

```bash
az login

az storage account create \
  --name <storageAccountName> \
  --resource-group <yourResourceGroup> \
  --sku Standard_LRS \
  --kind StorageV2
```

### 2. Get the connection string

```bash
az storage account show-connection-string \
  --name <storageAccountName> \
  --resource-group <yourResourceGroup> \
  --query connectionString \
  --output tsv
```

### 3. Paste it into `api/local.settings.json`

Replace the placeholder value for `STORAGE_CONNECTION_STRING`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "STORAGE_CONNECTION_STRING": "<paste connection string here>",
    "TABLE_NAME": "capacityplan"
  }
}
```

> `api/local.settings.json` is gitignored — never commit it.

### 4. Install API dependencies

```bash
cd api && npm install
```

---

## Running locally

Open two terminals:

**Terminal 1 — Azure Function API**
```bash
cd api && func start
```
The API runs at `http://localhost:7071`. You should see the three registered routes:
```
records-get    [GET]    http://localhost:7071/api/records
records-put    [PUT]    http://localhost:7071/api/records/{type}/{id}
records-delete [DELETE] http://localhost:7071/api/records/{type}/{id}
```

**Terminal 2 — SWA dev server with auth emulation**
```bash
swa start http://localhost:5173 \
  --run "npm run dev" \
  --api-location http://localhost:7071
```

Open `http://localhost:4280` (SWA CLI port, not Vite's 5173). The SWA CLI proxies:
- `/.auth/me` → fake login identity
- `/api/*` → your local Azure Function

---

## Switching the storage adapter

In [src/js/storage.js](../src/js/storage.js) line 9, change the adapter to test each mode:

```js
adapter: 'azure',        // reads/writes Azure Table Storage via the Function API
adapter: 'localStorage', // reads/writes browser localStorage (default)
```

Keep `adapter: 'localStorage'` as the committed default until the Azure backend is ready for production use.

---

## Verifying it works

1. Open `http://localhost:4280` with `adapter: 'azure'`
2. The SWA CLI login UI appears — sign in with any test identity
3. Open browser DevTools → Network tab
4. Add an employee → confirm a `PUT /api/records/employee/...` request returns `204`
5. Refresh the page → confirm data reloads (a `GET /api/records` request returns all rows)
6. Delete an entry → confirm a `DELETE /api/records/entry/...` request returns `204`
7. Check Azure Portal → your Storage Account → **Tables** → `capacityplan` to see rows directly

To verify undo still works: make a change, undo it, and confirm a corrected `PUT` fires for the affected record.

---

## Inspecting Table Storage

**Azure Portal:** Storage Account → Data storage → Tables → `capacityplan`

**Azure CLI:**
```bash
az storage entity query \
  --table-name capacityplan \
  --account-name <storageAccountName> \
  --filter "PartitionKey eq 'main'"
```

Row structure:

| Column | Example |
|--------|---------|
| `PartitionKey` | `main` |
| `RowKey` | `entry:42`, `employee:7`, `settings:singleton` |
| `data` | JSON-serialized record |
| `updatedAt` | `2026-04-23T10:00:00.000Z` |
| `updatedBy` | user identity from `/.auth/me` |

---

## Seeding from existing localStorage data

The Azure table starts empty and is separate from localStorage. To migrate existing data:

1. With `adapter: 'localStorage'`, open the app and use **Settings → Export Backup** to download a JSON file
2. Switch to `adapter: 'azure'` and start both servers
3. Use **Settings → Import Backup** to load the JSON — each record will be written to Table Storage via the API

---

## Troubleshooting

**`func start` fails with "No functions found"**
Make sure you're running from the `api/` directory and `api/package.json` exists.

**`STORAGE_CONNECTION_STRING` not found at runtime**
Confirm `api/local.settings.json` has the value and you started `func start` from the `api/` directory.

**SWA CLI can't reach the Function API**
Confirm `func start` is running before `swa start`, and that the `--api-location` flag points to `http://localhost:7071`.

**GET /api/records returns an empty array on first run**
Expected — the table is empty until data is saved. Add an employee or change a setting to create the first rows, or seed from a backup (see above).

**App loads with no data after switching to `adapter: 'azure'`**
See the seeding section above.

**Save failed toast appears after a write**
Check the `func start` terminal for the error. Common causes: connection string wrong or expired, Table Storage quota exceeded, network issue.
