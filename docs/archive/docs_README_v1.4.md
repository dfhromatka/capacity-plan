# Capacity Planning Tool - Complete Documentation

## 📁 Project Structure

```
capacity_plan/
├── docs/                            # 📚 All documentation
│   ├── README.md                   # This file - complete guide
│   ├── ROADMAP.md                  # Feature roadmap & future plans
│   ├── CODE_REVIEW.md              # Quality assessment (March 2026)
│   ├── CHANGELOG.md                # Version history
│   └── SHAREPOINT_MIGRATION.md     # SharePoint deployment guide
├── archive/                         # Backup files
│   ├── capacity_plan.html          # Original monolithic version
│   └── capacity_plan_redacted.xlsx # Original Excel file
├── css/
│   └── styles.css                  # All styling (~70 lines)
├── js/
│   ├── data.js                     # State management & computed functions (~95 lines)
│   ├── storage.js                  # localStorage abstraction layer (~45 lines)
│   ├── components.js               # UI render functions (~385 lines)
│   ├── modals.js                   # Modal dialogs (~120 lines)
│   ├── chart.js                    # Chart.js initialization (~65 lines)
│   ├── history.js                  # Undo/redo system & toast notifications (~120 lines)
│   ├── keyboard.js                 # Keyboard shortcuts & help overlay (~140 lines)
│   ├── app.js                      # Main coordinator (~150 lines)
│   └── settings.js                 # Settings page logic (~180 lines)
├── index.html                      # Main page entry point
├── settings.html                   # Settings page
└── README.md                       # Minimal readme (points here)
```

**Total:** 10 JavaScript modules, 2 HTML pages, 1 CSS file, 9 documentation files

## ✅ Modularization Complete

The codebase has been successfully split into logical modules:

### **css/styles.css** (~70 lines)
- All CSS extracted from the original `<style>` block
- Table styles, badges, modals, form inputs
- Responsive utilities

### **js/data.js** (~95 lines)
- `months` array with working days & bank holidays
- `employees` array with location & fixed allocation config
- `entries` array with project allocations
- State variables (filters, expandedOH, IDs)
- Computed functions (empStats, visibleEmps, etc.)

### **js/components.js** (~385 lines)
- `rHeader()` - Header with filters & buttons
- `rCards()` - Monthly availability summary cards
- `rChart()` - Chart container
- `rEmpPanel()` - Employee configuration panel
- `rCfgPanel()` - Working days configuration panel
- `rTable()` - Main capacity table

### **js/modals.js** (~115 lines)
- `showRowModal()` - Add/edit project row
- `confirmRow()` - Submit row data
- `showEmpModal()` - Add/edit employee
- `confirmEmp()` - Submit employee data
- `closeModal()` - Close any modal
- Tab navigation enabled in all modals

### **js/chart.js** (~65 lines)
- `initChart()` - Chart.js initialization
- Stacked bar chart with tooltips
- Aggregate view for multiple employees

### **js/history.js** (~120 lines)
- `captureUndoSnapshot()` - Capture state before modifications
- `undo()` / `redo()` - Navigate history stack
- `showToast()` - Display notifications
- In-memory history management (up to 50 steps)
- Prevents recursive captures during undo/redo

### **js/keyboard.js** (~140 lines)
- Global keyboard event handler
- Shortcuts: Ctrl+F, Ctrl+,, Ctrl+Z, Ctrl+Shift+Z, Shift+?
- Smart context detection (doesn't trigger in inputs)
- `showHelpModal()` - Interactive shortcuts reference
- Toast notifications for shortcut feedback

### **js/app.js** (~150 lines)
- `renderAll()` - Main render coordinator
- Event handlers (setISM, setIPM, toggleOH, etc.)
- Inline editing (startEdit, finishEdit)
- Delete operations (delEntry, delEmp) with custom confirmations
- Update operations (updEmp, updMonth)
- Initialization

### **index.html** (18 lines)
- Minimal HTML shell
- Loads Tailwind CSS & Chart.js from CDN
- Imports all JS modules in correct order

## 🚀 Benefits Achieved

1. **Maintainability** - Find code instantly (modals in modals.js, data in data.js)
2. **Scalability** - Easy to add new features without cluttering files
3. **Collaboration** - Multiple people can work on different modules
4. **Context Window** - Edit one file at a time without loading entire codebase
5. **Production-Ready** - Professional structure ready for deployment
6. **SharePoint-Friendly** - Works with relative paths, no build step required

## 📝 How to Use

### Local Development
```bash
# Open in browser (double-click or):
start index.html

# Or serve with Python:
python -m http.server 8000
# Then open: http://localhost:8000
```

### Deploy to SharePoint
1. Upload entire folder structure to `/SiteAssets/capacity-plan/`
2. Access via: `https://yoursite.sharepoint.com/SiteAssets/capacity-plan/index.html`
3. Optionally embed in SharePoint page using Embed web part

## ✨ Current Features (Version 1.4.1)

### Keyboard & History (v1.4.0) ✅
- ✅ **Keyboard Shortcuts** - Streamlined navigation system
  - Ctrl+F - Focus filter dropdown
  - Ctrl+, - Open settings page
  - Ctrl+Z - Undo last change
  - Ctrl+Shift+Z / Ctrl+Y - Redo
  - Shift+? - Show help overlay
- ✅ **Undo/Redo System** - In-memory history management (up to 50 steps)
- ✅ **Help Overlay** - Interactive shortcuts reference with keyboard visualization
- ✅ **Custom Confirmations** - Modern modal dialogs for delete operations
- ✅ **Toast Notifications** - Non-intrusive feedback for undo/redo actions

### Input Validation & Data Integrity (v1.3.0) ✅
- ✅ **Input Validation** - Day allocations (0-31), negative value prevention
- ✅ **Edge Case Handling** - Division by zero protection, graceful error handling
- ✅ **Data Integrity Guards** - Confirmation dialogs, cross-field validation

### Terminology & Consistency (v1.4.1) ✅
- ✅ **Semantic Alignment** - `projectSettings` → `planSettings` throughout codebase
- ✅ **Backward Compatibility** - Automatic data migration for existing users

### Core Features (v1.0-1.2) ✅
- ✅ **Location filter** - Filter by France (🇫🇷) or Prague (🇨🇿)
- ✅ **Copy row feature** - Duplicate any row with all allocations (📋 button)
- ✅ **Tab navigation** - Full keyboard navigation in inline editing and modals
- ✅ **Settings page** - Dedicated full-screen settings with 3 tabs
- ✅ **localStorage Integration** - Auto-save with 500ms debounce
- ✅ **Storage Abstraction Layer** - Pluggable adapter pattern ready for SharePoint
- ✅ **5 Fixed Allocation Types** - Admin, Training, Internal Initiatives, CIP Support, E&C Activity
- ✅ **Dynamic Fixed Allocation Detail** - Only shows non-zero allocations when expanded
- ✅ **Decimal Value Support** - Enter values like 2.5 days
- ✅ **Inline Row Editing** - Click any cell to edit with Ctrl+Enter to save, ESC to cancel
- ✅ **Column Sorting** - Click Type, Project, or Status headers to sort

## 🎯 Key Architecture Decisions

### Modular Structure
Each JavaScript file has a single responsibility:
- **data.js** - Single source of truth for state
- **storage.js** - Abstraction layer (swap localStorage for SharePoint later)
- **components.js** - Pure render functions (no side effects)
- **modals.js** - Dialog management
- **chart.js** - Data visualization
- **app.js** - Coordination & event handling
- **settings.js** - Settings page logic

### Storage Abstraction
The `Storage` object in `js/storage.js` uses the adapter pattern:

```javascript
const Storage = {
  save: (data) => LocalStorageAdapter.save(data),
  load: () => LocalStorageAdapter.load()
};
```

**Future SharePoint adapter:**
```javascript
const Storage = {
  save: (data) => SharePointAdapter.save(data),
  load: () => SharePointAdapter.load()
};
```

This makes migration seamless - just swap adapters, no changes to app code.

### No Build Process
- Pure HTML/CSS/JavaScript
- CDN dependencies (Tailwind, Chart.js)
- No npm, webpack, babel, etc.
- Edit and refresh workflow
- SharePoint-friendly

## 📖 Development Guide

### Adding a New Feature

1. **Plan** - Decide which module it belongs in
2. **Data Changes** - Update `js/data.js` if new state needed
3. **Render Logic** - Add to `js/components.js` if UI change
4. **Event Handlers** - Add to `js/app.js` or `js/settings.js`
5. **Storage** - Ensure auto-save captures new data
6. **Test** - Verify in browser, check localStorage

### Debugging Tips

**View current data:**
```javascript
// Open browser console
console.log(employees);
console.log(entries);
console.log(months);
```

**Clear all data:**
```javascript
localStorage.removeItem('capacityPlanData');
location.reload();
```

**Check auto-save:**
```javascript
// Should see data after making changes
console.log(localStorage.getItem('capacityPlanData'));
```

### File Load Order (Important!)

In `index.html` and `settings.html`, scripts must load in this order:

1. `data.js` - Defines state first
2. `storage.js` - Defines storage adapter
3. `components.js` - Render functions (uses data)
4. `modals.js` - Modal functions (uses data)
5. `chart.js` - Chart functions (uses data)
6. `history.js` - Undo/redo system (must load before app.js)
7. `keyboard.js` - Keyboard shortcuts (must load before app.js)
8. `app.js` or `settings.js` - Initializes app (uses everything)

**Why?** JavaScript files depend on each other. Wrong order = undefined errors.

## 🚀 Deployment

### Local Development
```bash
# Option 1: Direct file access (works for most cases)
start index.html

# Option 2: Python HTTP server (needed for some features)
python -m http.server 8000
# Open: http://localhost:8000

# Option 3: Node.js HTTP server
npx http-server -p 8000
```

### SharePoint Deployment
See [SHAREPOINT_MIGRATION.md](SHAREPOINT_MIGRATION.md) for complete guide.

**Quick steps:**
1. Upload entire `capacity_plan/` folder to SharePoint Documents library
2. Navigate to `/SiteAssets/capacity-plan/index.html`
3. Swap storage adapter from localStorage to SharePoint API
4. Test thoroughly

### Static Hosting
Works on any static host:
- **GitHub Pages** - Push to repo, enable Pages
- **Netlify** - Drag & drop folder
- **Vercel** - Connect repo
- **Azure Static Web Apps** - Deploy via GitHub Actions

## 🐛 Troubleshooting

### "Data not saving"
- Check browser console for errors
- Verify localStorage is enabled (Settings > Privacy)
- Clear site data and reload
- Check available storage: `navigator.storage.estimate()`

### "Chart not displaying"
- Verify Chart.js loaded from CDN
- Check browser console for errors
- Ensure `<canvas id="capacityChart">` exists in DOM
- Try hard refresh (Ctrl+Shift+R)

### "Changes lost on refresh"
- Ensure `triggerAutoSave()` is called after modifications
- Check `localStorage.getItem('capacityPlanData')` has data
- Verify no JavaScript errors preventing save

### "Settings page broken"
- Ensure `settings.html` loads same JS files as `index.html`
- Verify `settings.js` loaded last
- Check browser console for errors

## 📚 Related Documentation

- [ROADMAP.md](ROADMAP.md) - Feature roadmap and future plans
- [CODE_REVIEW.md](CODE_REVIEW.md) - Quality assessment and recommendations
- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [SHAREPOINT_MIGRATION.md](SHAREPOINT_MIGRATION.md) - SharePoint deployment guide

## 🤝 Contributing

1. **Read CODE_REVIEW.md** - Understand current issues and recommendations
2. **Check ROADMAP.md** - See what's planned
3. **Follow patterns** - Match existing code style
4. **Test thoroughly** - Verify in multiple browsers
5. **Update CHANGELOG.md** - Document your changes

## 📄 Notes

- **No build tools** - Edit and refresh workflow
- **Archive folder** - Original files remain as backup reference
- **Browser compatibility** - Tested in Chrome, Edge, Firefox (ES6+ required)
- **Data format** - localStorage stores JSON serialized data
- **Auto-save delay** - 500ms debounce prevents excessive writes

## 🎓 Learning Resources

- **Tailwind CSS:** https://tailwindcss.com/docs
- **Chart.js:** https://www.chartjs.org/docs/
- **localStorage API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **SharePoint REST API:** https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service

---

**Last Updated:** March 25, 2026  
**Current Version:** 1.4.1  
**Maintained By:** EMEA North Development Team
