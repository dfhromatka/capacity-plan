# Design System — Token Reference

**App version:** 3.14.1  
**Last Updated:** 2026-04-22

Token values live in `src/css/design-tokens.css`. Component classes live in `src/css/styles.css`.
Before editing CSS, grep those files directly — they are always current.

---

## Core Principles

1. **Tokens first** — Every colour, size, spacing, shadow, and duration uses a `var(--*)` from `design-tokens.css`. Never write a raw hex, px literal, or rgba() in `styles.css`.
2. **4 px spacing grid** — All spacing values are multiples of 4 px. Use `--space-*`.
3. **BEM naming** — `.block`, `.block__element`, `.block--modifier`, `.is-state`.
4. **Interactive states required** — Every interactive element needs `:hover`, `:focus-visible`, `:active`, `:disabled`.

---

## Color Palette

### Primary (`--color-primary-*`)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-primary` | `#2563eb` | Primary buttons, links |
| `--color-primary-hover` | `#1d4ed8` | Primary button hover |
| `--color-primary-light` | `#3b82f6` | Chart bars, icons, row accents |
| `--color-primary-bg` | `#eff6ff` | Light blue backgrounds, selected option bg |
| `--color-primary-border` | `#bfdbfe` | Borders, dividers |
| `--color-primary-focus` | `#60a5fa` | Focus ring for inputs |
| `--color-primary-border-strong` | `#93c5fd` | Project-link underline |
| `--color-primary-bg-light` | `#f0f9ff` | Filter option hover bg |
| `--color-primary-bg-active` | `#dbeafe` | Filter option selected+hover bg |

### Success (`--color-success-*`)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-success` | `#22c55e` | Success indicators |
| `--color-success-dark` | `#15803d` | High-availability text |
| `--color-success-bg` | `#dcfce7` | Available-capacity cell backgrounds |
| `--color-success-light` | `#86efac` | Chart bar — Available segment |

### Warning (`--color-warning-*`)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-warning` | `#f59e0b` | Warning badges |
| `--color-warning-dark` | `#92400e` | Amber text on light bg |
| `--color-warning-bg` | `#fef3c7` | Low-availability cell backgrounds |
| `--color-warning-light` | `#fcd34d` | Amber borders |
| `--color-warning-pale` | `#fffbeb` | Absence row background |

### Danger (`--color-danger-*`)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-danger` | `#ef4444` | Delete button icon |
| `--color-danger-dark` | `#b91c1c` | Critical text on light bg |
| `--color-danger-bg` | `#fee2e2` | Over-allocation cell backgrounds |
| `--color-danger-light` | `#fca5a5` | Error borders, focus ring danger |
| `--color-danger-error` | `#dc2626` | Form validation error text; `.btn--danger` bg |
| `--color-danger-pale` | `#f87171` | Lighter red accent |
| `--color-danger-bg-subtle` | `#fef2f2` | Clear-filter button resting background |
| `--color-danger-border` | `#fecaca` | Clear-filter button resting border |

### Gray — Slate scale (`--color-gray-*`)

Used for: structural chrome — table headers, page background, borders.

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-gray-50` | `#f8fafc` | `<thead>` background |
| `--color-gray-100` | `#f1f5f9` | Scrollbar track, body bg |
| `--color-gray-200` | `#e2e8f0` | Table borders, dividers |
| `--color-gray-300` | `#cbd5e1` | Disabled elements, scrollbar thumb |
| `--color-gray-400` | `#94a3b8` | Secondary / placeholder text |
| `--color-gray-500` | `#64748b` | Tertiary text |
| `--color-gray-600` | `#475569` | Body text |
| `--color-gray-700` | `#374151` | Headings, button labels |
| `--color-gray-800` | `#1e293b` | Emphasis text |
| `--color-gray-900` | `#111827` | Primary headings |

### Gray — Neutral scale (`--color-gray-neutral-*`)

Used for: text/input UI — labels, form fields, muted chrome.

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-gray-neutral-50` | `#fafafa` | Fixed allocation row bg |
| `--color-gray-neutral-100` | `#f3f4f6` | Cancel button background |
| `--color-gray-neutral-200` | `#e5e7eb` | Input borders, table th borders |
| `--color-gray-neutral-300` | `#d1d5db` | Toolbar button borders |
| `--color-gray-neutral-400` | `#9ca3af` | Placeholder text, chevron icon |
| `--color-gray-neutral-500` | `#6b7280` | Label text, form field labels |
| `--color-gray-bg` | `#f9fafb` | Table row hover, settings row hover |

> **Two-scale rule:** Use `--color-gray-neutral-*` for text/inputs; use `--color-gray-*` for structural layout.

### Semantic

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-white` | `#ffffff` | Pure white backgrounds |
| `--color-bg-modal` | `rgba(0,0,0,0.45)` | Modal backdrop overlay |
| `--color-surface` | `#ffffff` | Card/panel surfaces |
| `--color-surface-raised` | `var(--color-gray-neutral-50)` | Elevated surface (e.g. action menus) |
| `--color-text-secondary` | `var(--color-gray-neutral-500)` | Muted body text |
| `--color-text-inverse` | `#ffffff` | Text on dark/primary backgrounds |

### Row Type (`--color-row-*`)

| Variable | Hex | Row type |
|----------|-----|----------|
| `--color-row-emp` | `#eff6ff` | Employee header rows |
| `--color-row-emp-border` | `#3b82f6` | Employee row left-border accent |
| `--color-row-oh` | `#fafafa` | Fixed allocation rows |
| `--color-row-project` | `#f0f7ff` | Project allocation rows |
| `--color-row-other` | `#f9fafb` | "Other" type rows |
| `--color-row-absence` | `#fffbeb` | Absence rows |
| `--color-row-sub` | `#f8fafc` | Subtotal rows |

---

## Typography

### Font Family

```
--font-base   -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

### Font Size Scale

| Variable | Size | Usage |
|----------|------|-------|
| `--text-xs` | 9 px | Month card detail, smallest labels |
| `--text-sm` | 10 px | Badges, `<th>`, keyboard shortcut labels |
| `--text-base` | 11 px | Table `<td>`, button text |
| `--text-md` | 12 px | Form labels, inline inputs |
| `--text-lg` | 13 px | Form inputs, toolbar controls |
| `--text-xl` | 14 px | Modal buttons, body text, settings rows |
| `--text-2xl` | 16 px | Section headings (h3) |
| `--text-3xl` | 18 px | Modal titles (h2) |
| `--text-4xl` | 20 px | Page section headers |
| `--text-5xl` | 24 px | Main page title |

### Font Weights

| Variable | Weight | Usage |
|----------|--------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Secondary buttons, toolbar controls |
| `--font-semibold` | 600 | Buttons, form labels, table headers |
| `--font-bold` | 700 | Badges, employee names |
| `--font-extrabold` | 800 | Key metrics (sparingly) |

### Line Heights & Letter Spacing

| Variable | Value |
|----------|-------|
| `--leading-none` | 1 |
| `--leading-tight` | 1.2 |
| `--leading-normal` | 1.5 |
| `--leading-relaxed` | 1.6 |
| `--tracking-tight` | -0.02em |
| `--tracking-normal` | 0 |
| `--tracking-wide` | 0.05em |
| `--tracking-wider` | 0.06em |

---

## Spacing System

All spacing is multiples of 4 px. **Use `--space-*` — not `--spacing-*` (alias, pending removal).**

| Variable | Value | Usage |
|----------|-------|-------|
| `--space-1` | 4 px | Tight gaps, badge padding |
| `--space-2` | 8 px | Gap between related items |
| `--space-3` | 12 px | Section interior, tab padding |
| `--space-4` | 16 px | Standard element padding |
| `--space-5` | 20 px | Page header margin |
| `--space-6` | 24 px | Modal padding |
| `--space-8` | 32 px | Major section breaks |
| `--space-12` | 48 px | Extra-large section spacing |

### Component Padding Tokens

| Variable | Value | Usage |
|----------|-------|-------|
| `--padding-cell` | `7px 9px` | Table `<td>` |
| `--padding-button` | `10px 16px` | Modal action buttons |
| `--padding-button-sm` | `2px 8px` | Small inline buttons |
| `--padding-button-toolbar` | `6px 12px` | Toolbar controls |
| `--padding-input` | `8px 12px` | Form inputs and selects |

### Component Dimension Tokens

| Variable | Value | Usage |
|----------|-------|-------|
| `--toolbar-ctrl-height` | 27 px | Height for all toolbar controls |
| `--input-height` | 36 px | Standard form input height |
| `--modal-width` | 460 px | Default modal width |
| `--table-min-width` | 1380 px | Main capacity table |

---

## Borders & Radius

### Border Widths

| Variable | Value | Usage |
|----------|-------|-------|
| `--border-thin` | 1 px | Standard borders, table cells |
| `--border-medium` | 1.5 px | Input borders |
| `--border-thick` | 2 px | Table header bottom border |
| `--border-extra-thick` | 3 px | Row-type left-border accent |
| `--border-heavy` | 4 px | Employee row left-border accent |

### Border Radius

| Variable | Value | Usage |
|----------|-------|-------|
| `--radius-sm` | 2 px | Month bar, scrollbar thumb, `kbd` |
| `--radius-base` | 4 px | Inputs, inline-edit cells |
| `--radius-md` | 6 px | BEM buttons, form inputs |
| `--radius-lg` | 8 px | Filter buttons, toolbar, settings cards |
| `--radius-xl` | 10 px | Month cards |
| `--radius-2xl` | 14 px | Legacy modal boxes |
| `--radius-full` | 9999 px | Badges (pill) |

---

## Shadows

| Variable | Value | Usage |
|----------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` | Toolbar controls, badges, kbd |
| `--shadow-base` | `0 1px 3px rgba(0,0,0,.1)` | Cards, inputs at rest |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,.1)` | Elevated elements |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,.1)` | BEM modal |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,.15)` | Major panels |
| `--shadow-modal` | `0 24px 64px rgba(0,0,0,.3)` | Legacy modal |
| `--shadow-panel` | `0 8px 24px rgba(0,0,0,.12)` | Dropdown / floating panels |

### Focus Ring Shadows

| Variable | Usage |
|----------|-------|
| `--shadow-focus-primary` | `0 0 0 3px var(--color-primary-border)` — primary inputs |
| `--shadow-focus-blue` | `0 0 0 3px #bfdbfe` — inline-edit cells |
| `--shadow-focus-danger` | `0 0 0 3px #fca5a5` — error-state inputs |
| `--shadow-focus-input` | `0 0 0 3px #dbeafe` — standard form inputs |

---

## Z-Index Scale

| Variable | Value | Usage |
|----------|-------|-------|
| `--z-base` | 1 | Non-sticky elements that need to stack |
| `--z-sticky` | 2 | Sticky table body columns |
| `--z-sticky-header` | 3 | Sticky `<thead>` (must beat sticky body cols) |
| `--z-dropdown` | 10 | Dropdown panels |
| `--z-modal` | 200 | Modals, backdrops, filter panels |

---

## Motion & Transitions

| Variable | Value | Usage |
|----------|-------|-------|
| `--transition-fast` | 0.1 s | Micro-interactions |
| `--transition-base` | 0.2 s | Standard transitions |
| `--transition-slow` | 0.3 s | Larger animations |
| `--transition-all` | `all 0.2s ease` | General-purpose shorthand |
| `--transition-colors` | `color .2s, background-color .2s, border-color .2s` | Colour-only |
| `--transition-transform` | `transform 0.2s ease` | Hover lift effects |

Prefer `--transition-colors` over `--transition-all` — cheaper, no layout thrashing.

---

## Token Debt (see TOKEN-01 in CODE_REVIEW.md)

Aliases pending removal once usages are migrated:

| Alias | Canonical | Action |
|-------|-----------|--------|
| `--spacing-xs/sm/md/lg` | `--space-1/2/3/4` | Migrate ~58 uses, remove aliases |
| `--font-weight-medium/semibold` | `--font-medium/semibold` | Migrate ~7 uses, remove aliases |
| `--color-accent*` | `--color-primary*` | Pick one, migrate ~46 uses |
| `--color-bg-page`, `--color-bg-card`, `--color-background` | — | Dead — remove |
