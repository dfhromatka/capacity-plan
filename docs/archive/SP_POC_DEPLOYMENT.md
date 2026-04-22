# SharePoint POC — Deployment Guide

> **File:** `sp-poc.html`  
> **Purpose:** Validate that Alpine.js apps can read/write data via the SharePoint REST API
> when hosted as a static file in a Document Library.

---

## What the POC proves

| Question | How it's tested |
|----------|----------------|
| Static HTML files serve from SP Document Library | Open `sp-poc.html` via its SP URL |
| Alpine.js runs on SharePoint | Counter renders; button is reactive |
| SP REST API reads work (same-tenant auth) | Counter + "last clicked by" load on page open |
| SP REST API writes work (form digest) | Click increments counter and persists across refreshes |
| Current user identity is readable | "Last clicked by: **Martin**" shows your first name |

---

## Step 1 — Create the SharePoint list

1. Go to your SharePoint site → **Site contents** → **New → List**
2. Choose **Blank list**, name it exactly: `SPPocData`
3. Add a column:
   - **Name:** `DataJSON`
   - **Type:** Multiple lines of text
   - **Specify the type of text:** Plain text
4. Create one list item:
   - **Title:** `poc-data`
   - Leave `DataJSON` empty for now
5. Note the item's ID (it's almost always `1` — visible in the URL when you click the item)

---

## Step 2 — Configure and upload the file

1. Open `sp-poc.html` in a text editor
2. Find the CONFIG block near the bottom of `<body>` and edit the 3 values:

```js
const SP_SITE_URL  = 'https://TENANT.sharepoint.com/sites/YOURSITE';
const SP_LIST_NAME = 'SPPocData';
const SP_ITEM_ID   = 1;
```

3. Upload **`sp-poc.html`** to any Document Library on that site
   - If the CDN might be blocked, also upload **`js/vendor/alpinejs.min.js`** to a `js/vendor/`
     folder in the same library (the `onerror` fallback will find it automatically)

---

## Step 3 — Test it

1. Navigate to the uploaded `sp-poc.html` in the Document Library
2. Click **"Open"** or copy the direct file URL and open it in a new tab
3. You should see:
   - `0` (counter)
   - `Click me!` button
   - `No clicks yet`
   - **🟢 SharePoint** badge (if SP adapter connected successfully)
4. Click the button — you should see:
   - Counter increments to `1`
   - `Last clicked by: **YourFirstName**` appears
   - `✅ Saved` flashes briefly
5. **Refresh the page** — counter and name should persist (loaded from SP list)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Badge shows 🔴 or 🟡 instead of 🟢 | `SP_SITE_URL` wrong or list not found | Check the URL and list name match exactly |
| `❌ Save failed` after click | Wrong list item type name | See note below on list item type |
| 403 on load | User lacks Read on `SPPocData` list | Grant site member access to the list |
| 403 on save | User lacks Edit on `SPPocData` list | Grant Contribute/Edit access |
| Counter loads as 0 every time | `DataJSON` column not saving | Open the list item in SP and verify DataJSON has content |
| Alpine doesn't load | CDN blocked by corporate firewall | Upload `js/vendor/alpinejs.min.js` alongside `sp-poc.html` |
| Page shows raw HTML source | File opened in edit mode | Use the direct URL, not the SP editor |

### Note on list item type name

The `__metadata.type` in the save request is constructed as `SP.Data.{ListName}ListItem`.  
For `SPPocData` → `SP.Data.SPPocDataListItem`.

If your list was renamed or has a different internal name, run this in the browser console
(while on the SP site) to find the exact type:

```js
fetch("/_api/web/lists/getbytitle('SPPocData')/ListItemEntityTypeFullName", {
  headers: { 'Accept': 'application/json;odata=verbose' },
  credentials: 'include'
}).then(r => r.json()).then(d => console.log(d.d.ListItemEntityTypeFullName));
```

Then update the `__metadata.type` value in `sp-poc.html`.

---

## What success looks like

Open browser DevTools → Network tab:

| Request | Expected response |
|---------|------------------|
| `GET /_api/web/lists/getbytitle('SPPocData')/items(1)` | `200 OK` with JSON containing `DataJSON` field |
| `POST /_api/contextinfo` | `200 OK` with `FormDigestValue` in response |
| `POST /_api/web/lists/getbytitle('SPPocData')/items(1)` | `204 No Content` (MERGE success) |
| `GET /_api/web/currentuser` | `200 OK` with `Title` = your display name |

All four passing = the full SP read/write/auth stack is confirmed working.