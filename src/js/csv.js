/* ── CSV IMPORT / EXPORT ──────────────────────────────────────── */

// Allowed entry types for import (case-insensitive match)
const ALLOWED_TYPES = ['project', 'other', 'absence'];

/* ── CSV SERIALISATION ──────────────────────────────────────── */

function _escape(val) {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function _row(cells) { return cells.map(_escape).join(','); }

export function exportEmployeesCsv(employees) {
  const header = [
    'name','ism','location','availability',
    'futureAvailability','availabilityEffectiveDate',
    'adminDays','trainingDays','internalInitiatives','cipSupport','encActivity',
    'adminDesc','trainingDesc','internalInitiativesDesc','cipSupportDesc','encActivityDesc',
  ];
  const rows = employees.map(e => _row([
    e.name, e.ism, e.location, e.availability,
    e.futureAvailability ?? '', e.availabilityEffectiveDate ?? '',
    e.adminDays, e.trainingDays, e.internalInitiatives, e.cipSupport, e.encActivity,
    e.adminDesc, e.trainingDesc, e.internalInitiativesDesc, e.cipSupportDesc, e.encActivityDesc,
  ]));
  return [_row(header), ...rows].join('\r\n');
}

export function exportEntriesCsv(entries, employees, months) {
  const empMap = Object.fromEntries(employees.map(e => [e.id, e.name]));
  const monthKeys = months.map(m => m.key);
  const header = [
    'employee_name','type','ipm','project','status','projectUrl','ragStatus','epsd',
    ...monthKeys,
  ];
  const rows = entries.map(e => _row([
    empMap[e.empId] ?? '',
    e.type, e.ipm ?? '', e.project, e.status ?? '',
    e.projectUrl ?? '', e.ragStatus ?? '', e.epsd ?? '',
    ...monthKeys.map(k => {
      // e.days may be positional array (runtime) or keyed object (if loaded from _allDays)
      if (Array.isArray(e.days)) {
        const idx = months.findIndex(m => m.key === k);
        return idx >= 0 ? (e.days[idx] || 0) : 0;
      }
      return (e._allDays && e._allDays[k]) || (e.days && e.days[k]) || 0;
    }),
  ]));
  return [_row(header), ...rows].join('\r\n');
}

/* ── CSV PARSING ────────────────────────────────────────────── */

// Minimal RFC-4180 parser: handles quoted fields with embedded commas/newlines.
function _parseCsvText(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    const row = _parseLine(lines[i]);
    result.push(row);
    i++;
  }
  return result;
}

function _parseLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur.trim());
  return fields;
}

function _colMap(header) {
  return Object.fromEntries(header.map((h, i) => [h.toLowerCase().trim(), i]));
}

function _get(row, cols, name) {
  const i = cols[name];
  return i != null && i < row.length ? row[i].trim() : '';
}

function _num(val, def = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? def : n;
}

export function parseEmployeesCsv(text) {
  const rows = _parseCsvText(text);
  if (rows.length < 2) return { employees: [], errors: ['File is empty or has no data rows.'] };

  const cols = _colMap(rows[0]);
  if (cols['name'] == null) return { employees: [], errors: ['Missing required column: name'] };

  const errors = [];
  const employees = [];
  const seen = new Set();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(c => !c)) continue;
    const lineNum = r + 1;
    const name = _get(row, cols, 'name');
    if (!name) { errors.push(`Row ${lineNum}: missing name`); continue; }
    if (seen.has(name.toLowerCase())) {
      errors.push(`Row ${lineNum}: duplicate employee name "${name}"`);
      continue;
    }
    seen.add(name.toLowerCase());
    employees.push({
      name,
      ism:                      _get(row, cols, 'ism'),
      location:                 _get(row, cols, 'location').toUpperCase() || 'CZ',
      availability:             _num(_get(row, cols, 'availability'), 1.0),
      futureAvailability:       _get(row, cols, 'futureavailability') || null,
      availabilityEffectiveDate:_get(row, cols, 'availabilityeffectivedate') || null,
      adminDays:                _num(_get(row, cols, 'admindays'), 0),
      trainingDays:             _num(_get(row, cols, 'trainingdays'), 0),
      internalInitiatives:      _num(_get(row, cols, 'internalinitiatives'), 0),
      cipSupport:               _num(_get(row, cols, 'cipsupport'), 0),
      encActivity:              _num(_get(row, cols, 'encactivity'), 0),
      adminDesc:                _get(row, cols, 'admindesc'),
      trainingDesc:             _get(row, cols, 'trainingdesc'),
      internalInitiativesDesc:  _get(row, cols, 'internalinitiativesdesc'),
      cipSupportDesc:           _get(row, cols, 'cipsupportdesc'),
      encActivityDesc:          _get(row, cols, 'encactivitydesc'),
    });
  }

  return { employees, errors };
}

export function parseEntriesCsv(text, employeeNameToId, months) {
  const rows = _parseCsvText(text);
  if (rows.length < 2) return { entries: [], errors: ['File is empty or has no data rows.'], skipped: [] };

  const cols = _colMap(rows[0]);
  if (cols['employee_name'] == null) return { entries: [], errors: ['Missing required column: employee_name'], skipped: [] };
  if (cols['type'] == null)          return { entries: [], errors: ['Missing required column: type'], skipped: [] };

  // Detect month columns (headers matching YYYY-MM)
  const monthColIndices = [];
  rows[0].forEach((h, i) => { if (/^\d{4}-\d{2}$/.test(h.trim())) monthColIndices.push({ key: h.trim(), i }); });

  const errors = [];
  const skipped = [];
  const entries = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(c => !c)) continue;
    const lineNum = r + 1;

    const empName = _get(row, cols, 'employee_name');
    const type    = _get(row, cols, 'type');

    // Skip Admin-type rows silently (note in skipped log)
    if (type.toLowerCase() === 'admin') {
      skipped.push(`Row ${lineNum}: type "Admin" — skipped (not importable)`);
      continue;
    }

    if (!ALLOWED_TYPES.includes(type.toLowerCase())) {
      errors.push(`Row ${lineNum}: invalid type "${type}" (allowed: Project, Absence, Other)`);
      continue;
    }
    if (!empName) { errors.push(`Row ${lineNum}: missing employee_name`); continue; }

    const empId = employeeNameToId[empName.toLowerCase()];
    if (!empId) {
      errors.push(`Row ${lineNum}: unknown employee name "${empName}"`);
      continue;
    }

    // Build keyed days object for this entry
    const keyedDays = {};
    monthColIndices.forEach(({ key, i }) => {
      const v = parseFloat(row[i]);
      if (!isNaN(v) && v > 0) keyedDays[key] = v;
    });

    // Convert to positional array for runtime
    const days = months.map(m => keyedDays[m.key] || 0);

    entries.push({
      empId,
      type:       type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
      ipm:        _get(row, cols, 'ipm') || '',
      project:    _get(row, cols, 'project') || '',
      status:     _get(row, cols, 'status') || '',
      projectUrl: _get(row, cols, 'projecturl') || null,
      ragStatus:  _get(row, cols, 'ragstatus') || null,
      epsd:       _get(row, cols, 'epsd') || null,
      days,
      _allDays:   keyedDays,
    });
  }

  return { entries, errors, skipped };
}

/* ── DOWNLOAD HELPER ────────────────────────────────────────── */

export function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildErrorLog(filename, errors, skipped) {
  const ts = new Date().toLocaleString();
  const lines = [
    `CSV Import Error Log — ${ts}`,
    `File: ${filename}`,
    '',
  ];
  if (errors.length) {
    errors.forEach(e => lines.push(e));
    lines.push('');
  }
  if (skipped.length) {
    lines.push(`Skipped rows (not errors):`);
    skipped.forEach(s => lines.push('  ' + s));
    lines.push('');
  }
  lines.push('Import aborted. No data was changed.');
  return lines.join('\n');
}

/* ── CAPACITY PLAN SPREADSHEET IMPORTER ─────────────────────── */

const _MONTH_ABBR = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
                      Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };

// 'Dec-25' → '2025-12', 'Jan-26' → '2026-01', etc.
function _parseMonthHeader(h) {
  const m = h.match(/^([A-Z][a-z]{2})-(\d{2})$/);
  if (!m) return null;
  const mon = _MONTH_ABBR[m[1]];
  if (!mon) return null;
  return `20${m[2]}-${String(mon).padStart(2, '0')}`;
}

// Classify a row's type into an app type or a skip/error signal.
// Returns: 'Project' | 'Absence' | 'skip' | 'error:<message>'
function _classifyType(csvType, project) {
  const t = csvType.toLowerCase().trim();
  if (t === 'admin') return 'skip';
  if (t === 'e&c')   return 'skip';
  if (t === 'absences' || t === 'absence') {
    if (project.startsWith('** Bank Holiday')) return 'skip';
    return 'Absence';
  }
  if (t === 'project (active)' || t === 'project') return 'Project';
  return `error:Unrecognised type "${csvType}"`;
}

export function parseCapacityPlanCsv(text, months) {
  const rows = _parseCsvText(text);
  if (rows.length < 2) return { employees: [], entries: [], errors: ['File is empty or has no data rows.'], skipped: [] };

  const header = rows[0];
  const cols   = _colMap(header);

  // Require at minimum: Type and IPM
  if (cols['type'] == null) return { employees: [], entries: [], errors: ['Missing required column: Type'], skipped: [] };
  if (cols['ipm']  == null) return { employees: [], entries: [], errors: ['Missing required column: IPM'],  skipped: [] };

  // Detect month columns by header pattern
  const monthCols = [];
  header.forEach((h, i) => {
    const key = _parseMonthHeader(h.trim());
    if (key) monthCols.push({ key, i });
  });

  const errors  = [];
  const skipped = [];

  // empKey (lowercase name) → { name, ism, location }
  const empMap  = new Map();
  const entryList = [];

  const colISM      = cols['ism']  ?? -1;
  const colIPM      = cols['ipm'];
  const colProject  = cols['projects / activities'] ?? cols['project'] ?? cols['projects/activities'] ?? -1;
  const colStatus   = cols['status / comm'] ?? cols['status/comm'] ?? cols['status'] ?? -1;
  const colLocation = cols['location'] ?? -1;

  for (let r = 1; r < rows.length; r++) {
    const row     = rows[r];
    if (row.every(c => !c)) continue;
    const lineNum = r + 1;

    const csvType = row[cols['type']]?.trim() || '';
    const ipm     = row[colIPM]?.trim()       || '';
    const project = colProject >= 0 ? (row[colProject]?.trim() || '') : '';

    if (!ipm) {
      skipped.push(`Row ${lineNum}: no IPM value — skipped`);
      continue;
    }

    const classification = _classifyType(csvType, project);

    if (classification === 'skip') {
      skipped.push(`Row ${lineNum}: type "${csvType}"${project ? ` / "${project}"` : ''} — skipped`);
      continue;
    }
    if (classification.startsWith('error:')) {
      errors.push(`Row ${lineNum}: ${classification.slice(6)}`);
      continue;
    }

    const empKey = ipm.toLowerCase();
    if (!empMap.has(empKey)) {
      const ism      = colISM >= 0      ? (row[colISM]?.trim()      || '') : '';
      const location = colLocation >= 0 ? (row[colLocation]?.trim() || '') : '';
      empMap.set(empKey, { name: ipm, ism, location });
    }

    // Build keyed days — treat '#REF!' and non-numeric as 0
    const keyedDays = {};
    monthCols.forEach(({ key, i }) => {
      const raw = row[i]?.trim() || '';
      const v   = parseFloat(raw);
      if (!isNaN(v) && v > 0) keyedDays[key] = v;
    });

    const days   = months.map(m => keyedDays[m.key] || 0);
    const status = colStatus >= 0 ? (row[colStatus]?.trim() || '') : '';

    entryList.push({
      _empKey: empKey,
      type:    classification,
      ipm:     '',
      project,
      status,
      projectUrl: null,
      ragStatus:  null,
      epsd:       null,
      days,
      _allDays: keyedDays,
    });
  }

  if (errors.length) return { employees: [], entries: [], errors, skipped };

  // Assign IDs
  const empArray = [...empMap.entries()].map(([, emp], i) => ({
    id: `emp${i + 1}`,
    name: emp.name,
    ism:  emp.ism,
    location: emp.location,
    availability: 1.0,
    futureAvailability: null,
    availabilityEffectiveDate: null,
    adminDays: 0, trainingDays: 0, internalInitiatives: 0, cipSupport: 0, encActivity: 0,
    adminDesc: '', trainingDesc: '', internalInitiativesDesc: '', cipSupportDesc: '', encActivityDesc: '',
  }));

  const empKeyToId = Object.fromEntries([...empMap.keys()].map((k, i) => [k, `emp${i + 1}`]));

  const entries = entryList.map((e, i) => {
    const { _empKey, ...rest } = e;
    return { ...rest, id: i + 1, empId: empKeyToId[_empKey] };
  });

  return { employees: empArray, entries, errors: [], skipped };
}
