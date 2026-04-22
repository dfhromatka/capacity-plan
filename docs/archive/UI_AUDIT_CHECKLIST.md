# ✅ UI/UX Audit Checklist

**Version:** 1.3.0  
**Last Updated:** March 24, 2026

Use this checklist before merging any UI changes to ensure visual consistency and quality.

---

## 📋 Pre-Merge Quality Gate

Every UI change must pass ALL sections of this checklist before being considered complete.

---

## 🎨 Visual Consistency

### Colors

- [ ] **All colors use design token variables** (no hardcoded hex values)
- [ ] **Colors are from the defined palette** (check `css/design-tokens.css`)
- [ ] **Semantic colors used correctly:**
  - [ ] Primary blue for main actions and project indicators
  - [ ] Success green for positive states (>20% availability)
  - [ ] Warning amber for cautions (1-20% availability, absences)
  - [ ] Danger red for errors and critical states (>90% utilization)
  - [ ] Gray scale for text hierarchy and backgrounds
- [ ] **No invented or random colors** (e.g., `#2563ec` instead of `#2563eb`)
- [ ] **Hover states use defined hover colors** (e.g., `--color-primary-hover`)
- [ ] **Focus states use blue focus ring** (`--color-primary-focus` with box-shadow)

### Typography

- [ ] **Font sizes match the scale:**
  - [ ] 9px, 10px, 11px, 12px, 13px, 14px, 16px, 18px, 20px, 24px ONLY
  - [ ] No arbitrary sizes (e.g., 15px, 17px, 19px)
- [ ] **Font weights are consistent:**
  - [ ] 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold) ONLY
  - [ ] No font-weight: 300 or 900
- [ ] **System font stack used** (`var(--font-base)`)
- [ ] **Text hierarchy is clear:**
  - [ ] Headings are darker/bolder than body text
  - [ ] Labels use uppercase + letter-spacing
  - [ ] Important text uses higher weight, not larger size
- [ ] **No font family mixing** (all text uses system fonts)

### Spacing

- [ ] **All spacing uses 4px increments:**
  - [ ] Valid: 4px, 8px, 12px, 16px, 20px, 24px, 28px, 32px...
  - [ ] Invalid: 7px, 11px, 15px, 18px, 22px...
- [ ] **Spacing variables used** (no hardcoded margin/padding values)
- [ ] **Consistent gaps between related elements:**
  - [ ] Small gaps: 8px (`--space-2`)
  - [ ] Standard gaps: 16px (`--space-4`)
  - [ ] Large sections: 24px (`--space-6`)
- [ ] **Component padding matches standards:**
  - [ ] Table cells: 7px 9px
  - [ ] Buttons: 10px 16px
  - [ ] Inputs: 8px 12px
  - [ ] Modals: 24px

### Borders & Radius

- [ ] **Border widths are standard:**
  - [ ] 1px (thin), 1.5px (medium), 2px (thick), 3px (extra-thick), 4px (heavy)
- [ ] **Border radius is consistent:**
  - [ ] 4px (inputs), 6px (buttons), 8px (cards), 10px (large), 14px (modals), 9999px (pills)
- [ ] **No arbitrary radius values** (e.g., 5px, 7px, 11px)

---

## 🔘 Component Consistency

### Buttons

- [ ] **Primary buttons:**
  - [ ] Blue background (`--color-primary`)
  - [ ] White text
  - [ ] 8px border-radius
  - [ ] 10px 16px padding
  - [ ] 14px font size, 600 weight
  - [ ] Hover state darkens to `--color-primary-hover`
- [ ] **Secondary buttons:**
  - [ ] Light gray background (`--color-gray-neutral-100`)
  - [ ] Dark gray text (`--color-gray-700`)
  - [ ] Same dimensions as primary
  - [ ] Hover state to `--color-gray-neutral-200`
- [ ] **Icon buttons:**
  - [ ] No background initially
  - [ ] Gray color that changes to blue on hover
  - [ ] Appropriate sizing (typically 11px font size)
- [ ] **All buttons have hover states**
- [ ] **All buttons have cursor: pointer**

### Inputs & Forms

- [ ] **Text inputs:**
  - [ ] 1.5px border, color `--color-gray-neutral-200`
  - [ ] 6px border-radius
  - [ ] 8px 12px padding
  - [ ] 13px font size
  - [ ] Focus state: blue border + box-shadow
- [ ] **Select dropdowns:**
  - [ ] Same styling as text inputs
  - [ ] Background: white
  - [ ] Font family inherited
- [ ] **Form labels:**
  - [ ] 11px font size
  - [ ] 600 font weight
  - [ ] Uppercase with letter-spacing
  - [ ] Gray color (`--color-gray-neutral-500`)
- [ ] **Error states:**
  - [ ] Red border (`--color-danger-error`)
  - [ ] Red error message text
  - [ ] Error message font size: 12px
- [ ] **All inputs have focus states**
- [ ] **Placeholder text is readable** (not too light)

### Badges

- [ ] **Project badges:** Blue background, dark blue text
- [ ] **Other badges:** Light gray background, dark gray text
- [ ] **Absence badges:** Yellow background, dark amber text
- [ ] **All badges:**
  - [ ] 1px 8px padding
  - [ ] 10px font size
  - [ ] 700 font weight
  - [ ] 9999px border-radius (pill shape)
  - [ ] inline-block display

### Modals

- [ ] **Modal overlay:**
  - [ ] Fixed position, full viewport
  - [ ] Semi-transparent black background (rgba(0,0,0,0.45))
  - [ ] Flexbox centering
  - [ ] z-index: 200
- [ ] **Modal content:**
  - [ ] White background
  - [ ] 14px border-radius
  - [ ] 24px padding
  - [ ] 460px width (max 95vw)
  - [ ] Max height 90vh with overflow scroll
  - [ ] Large drop shadow
- [ ] **Modal titles:**
  - [ ] 18px font size
  - [ ] 700 font weight
  - [ ] Dark gray color (`--color-gray-900`)

### Tables

- [ ] **Table headers:**
  - [ ] Light gray background (`--color-gray-50`)
  - [ ] 10px font size
  - [ ] 600 font weight
  - [ ] Uppercase with letter-spacing
  - [ ] Left-aligned
- [ ] **Table cells:**
  - [ ] 7px 9px padding
  - [ ] Light bottom border
  - [ ] Center-aligned (except .tl class)
- [ ] **Row types use correct colors:**
  - [ ] Employee: `--color-row-emp` with blue left border
  - [ ] Project: `--color-row-project` with blue left border
  - [ ] Absence: `--color-row-absence` with amber left border
  - [ ] Fixed Allocation: `--color-row-oh` with gray left border
  - [ ] Subtotal: `--color-row-sub`
- [ ] **Sticky columns work correctly** (Type, Project, Notes)
- [ ] **Horizontal scroll styled** (thin scrollbar, gray colors)

---

## ♿ Accessibility

### Contrast

- [ ] **Text contrast meets WCAG AA:**
  - [ ] Normal text (< 18px): 4.5:1 minimum
  - [ ] Large text (≥ 18px): 3:1 minimum
- [ ] **UI component contrast:** 3:1 minimum
- [ ] **Test key combinations:**
  - [ ] Dark text on light backgrounds
  - [ ] White text on colored buttons
  - [ ] Colored text on colored backgrounds

### Keyboard Navigation

- [ ] **All interactive elements are keyboard accessible**
- [ ] **Focus indicators are visible:**
  - [ ] Blue focus ring on inputs
  - [ ] Visual change on button focus
  - [ ] Tab order is logical
- [ ] **No keyboard traps** (user can tab through and escape)

### Screen Readers

- [ ] **Buttons have descriptive text or aria-labels**
- [ ] **Form inputs have associated labels**
- [ ] **Error messages are announced**
- [ ] **Icon-only buttons have titles**

---

## 🖥️ Browser Compatibility

### Desktop Browsers

Test in these browsers before merging:

- [ ] **Chrome/Edge** (primary target)
  - [ ] Layout correct
  - [ ] Sticky columns work
  - [ ] Scrollbars styled
  - [ ] All interactions work
- [ ] **Firefox**
  - [ ] Layout correct
  - [ ] No CSS-specific issues
  - [ ] Interactions work
- [ ] **Safari** (if available)
  - [ ] Webkit-specific styles work
  - [ ] Date inputs render correctly

### Responsive Behavior

- [ ] **1920px (Desktop):** Full layout, no horizontal scroll
- [ ] **1440px (Laptop):** Comfortable view, all features accessible
- [ ] **1024px (Tablet):** Table scrolls horizontally, sticky columns work

---

## 🎯 Interaction States

### Hover States

- [ ] **All clickable elements have hover states:**
  - [ ] Buttons darken or lighten
  - [ ] Links show underline or color change
  - [ ] Editable cells highlight
  - [ ] Icon buttons change color
- [ ] **Hover transitions are smooth** (0.2s typical)
- [ ] **Cursor changes to pointer** on interactive elements

### Focus States

- [ ] **All focusable elements have visible focus:**
  - [ ] Blue ring on inputs
  - [ ] Outline or background change on buttons
  - [ ] Focus is never hidden (no outline: none without replacement)
- [ ] **Focus ring colors match design system**

### Active/Pressed States

- [ ] **Buttons have active state** (optional but nice)
- [ ] **No layout shift on click**

### Disabled States

- [ ] **Disabled elements are visually distinct:**
  - [ ] Lower opacity or gray color
  - [ ] Cursor: not-allowed or default
  - [ ] No hover effects
- [ ] **Disabled elements can't be interacted with**

---

## 📱 Visual Regression Prevention

### Before Merging

- [ ] **Compare screenshots with previous version:**
  - [ ] Main table view (default)
  - [ ] With filters applied
  - [ ] With grouping enabled
  - [ ] Settings page
  - [ ] Modal views
- [ ] **No unintended changes to:**
  - [ ] Font sizes
  - [ ] Colors
  - [ ] Spacing
  - [ ] Alignment
  - [ ] Component sizes

### Common Issues to Check

- [ ] **Text alignment consistent** (no mix of center/left in same column)
- [ ] **Vertical alignment centered** in table cells
- [ ] **Icon sizes consistent** (emoji size may vary by OS)
- [ ] **Button heights uniform** (all primary buttons same height)
- [ ] **Input heights match** (selects and text inputs same height)
- [ ] **Modal widths consistent** (unless intentionally different)
- [ ] **Border weights uniform** (1px, 1.5px, 2px, 3px, 4px only)

---

## 📝 Form Input Consistency

### Form-Display Matching Principle

**Core Rule:** Form inputs should match their corresponding display format in tables and views.

#### Examples:

✅ **DO:**
- Table displays "Mar '26" → Form uses month dropdown + year dropdown
- Table displays "75%" → Form uses numeric input with % suffix
- Table displays "🇫🇷 France" → Form uses dropdown with flag + name
- Table displays "(555) 123-4567" → Form uses separate area code + number fields

❌ **DON'T:**
- Table displays "Mar '26" → Form uses single HTML5 month picker ❌
- Table displays "🇫🇷 France" → Form uses plain text input ❌
- Inconsistent field granularity between form and display

### Date and Time Inputs

- [ ] **Month/Year fields use separate dropdowns:**
  - [ ] Never use HTML5 `type="month"` in forms
  - [ ] Always split into month dropdown + year dropdown
  - [ ] Example: "Effective Date" → Month select + Year select
  - [ ] **Rationale:** Better tab behavior, consistent with display format, cross-browser reliability

- [ ] **Full dates use appropriate granularity:**
  - [ ] If only month/year needed → two dropdowns
  - [ ] If full date needed → three dropdowns (day, month, year) or date picker component
  - [ ] Never mix HTML5 native and custom inputs

- [ ] **Date inputs avoid browser-native pickers:**
  - [ ] Don't use `type="date"`, `type="datetime-local"`, `type="month"`
  - [ ] **Reason:** Inconsistent browser implementations, poor accessibility, limited styling

### Multi-Part Fields

- [ ] **Related fields are visually grouped:**
  - [ ] Month + year dropdowns side-by-side with 8px gap
  - [ ] Use grid layout: `grid-template-columns: 1fr 1fr; gap: 8px`
  - [ ] Both fields share same parent label or have clear individual labels

- [ ] **Field granularity matches interaction needs:**
  - [ ] Separate fields for values users think about separately (month vs year)
  - [ ] Single field for atomic concepts (email address)
  - [ ] Tab order flows naturally through multi-part fields

### Form Field Structure Guidelines

- [ ] **Labels are descriptive:**
  - [ ] Multi-part fields have clear individual labels ("Month", "Year")
  - [ ] Or shared parent label with sub-labels
  - [ ] Never rely on placeholder text alone

- [ ] **Required vs Optional clearly marked:**
  - [ ] Optional fields labeled as "Optional"
  - [ ] Required fields have validation
  - [ ] Error messages explain what's needed

- [ ] **Validation matches field structure:**
  - [ ] If month and year are separate, validate both together
  - [ ] Error message points to correct field
  - [ ] Clear guidance: "Both month and year must be specified together"

### Common Multi-Part Patterns

**Month/Year (Effective Dates):**
```html
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
  <label>Month
    <select id="month" class="form-select">
      <option value="">Select...</option>
      <option value="01">January</option>
      <!-- ... -->
    </select>
  </label>
  <label>Year
    <select id="year" class="form-select">
      <option value="">Select...</option>
      <option value="2026">2026</option>
      <!-- ... -->
    </select>
  </label>
</div>
```

**Why This Matters:**
- Reduces cognitive load (form matches what user already saw)
- Better keyboard navigation (separate tab stops)
- Consistent user experience across the application
- Predictable behavior (no browser-specific quirks)

---

## 🚫 Common Mistakes to Avoid

### DON'T

❌ Use hardcoded colors: `background: #2563eb;`  
✅ Use design tokens: `background: var(--color-primary);`

❌ Use arbitrary font sizes: `font-size: 15px;`  
✅ Use the scale: `font-size: var(--text-xl);` (14px)

❌ Use random spacing: `margin: 7px 11px;`  
✅ Use 4px increments: `margin: var(--space-2) var(--space-3);` (8px 12px)

❌ Forget hover states: `button { background: blue; }`  
✅ Add hover: `button:hover { background: var(--color-primary-hover); }`

❌ Skip focus states: `input { outline: none; }`  
✅ Replace with visible focus: `input:focus { box-shadow: var(--shadow-focus); }`

❌ Mix font families: `font-family: Arial, Helvetica;`  
✅ Use system fonts: `font-family: var(--font-base);`

❌ Create one-off components with unique styles  
✅ Reuse existing components or create reusable patterns

❌ Use inline styles without variables  
✅ Use CSS classes with design tokens

---

## ✨ Quality Standards

### A feature is "done" when:

1. ✅ All checklist items above pass
2. ✅ Code uses design tokens (no hardcoded values)
3. ✅ Component patterns are reused (not reinvented)
4. ✅ Visual regression test shows no unintended changes
5. ✅ Tested in Chrome/Edge (primary browsers)
6. ✅ Keyboard navigation works
7. ✅ Hover and focus states present
8. ✅ Matches component library examples
9. ✅ Documented if new pattern introduced

---

## 🔍 Testing Workflow

### Step 1: Visual Inspection

1. Open the app in browser
2. Compare side-by-side with component library
3. Check each section against this checklist
4. Look for inconsistencies in:
   - Colors (do they match the palette?)
   - Font sizes (are they on the scale?)
   - Spacing (is it 4px increments?)
   - Alignment (is everything lined up?)

### Step 2: Interaction Testing

1. Hover over all interactive elements
2. Tab through all focusable elements
3. Click all buttons and links
4. Test all form inputs
5. Open and close modals
6. Test table scrolling and sticky columns

### Step 3: Browser Testing

1. Test in Chrome/Edge (primary)
2. Test in Firefox (secondary)
3. Test at 1920px, 1440px, 1024px widths
4. Check for layout breaks or overlaps

### Step 4: Visual Regression

1. Run BackstopJS tests (see testing documentation)
2. Review diff screenshots
3. Approve intentional changes
4. Fix unintended changes

---

## 📚 Reference Documents

- **Design System:** [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - Complete design documentation
- **Design Tokens:** [`css/design-tokens.css`](../css/design-tokens.css) - All CSS variables
- **Component Library:** [`component-library.html`](../component-library.html) - Visual examples
- **Contributing Guide:** [`CONTRIBUTING.md`](CONTRIBUTING.md) - Development guidelines

---

## 📝 Checklist Summary

Before merging ANY UI change, confirm:

- [ ] ✅ All visual consistency checks pass
- [ ] ✅ All component consistency checks pass
- [ ] ✅ Accessibility requirements met
- [ ] ✅ Browser compatibility verified
- [ ] ✅ Interaction states implemented
- [ ] ✅ Visual regression test passed
- [ ] ✅ No common mistakes present
- [ ] ✅ Quality standards met

**If any item fails, the change is NOT ready to merge.**

---

## 🤖 Automated Consistency Checking

While manual review is essential, automation can catch many UI inconsistencies before they reach production.

### Recommended Automation Strategy

#### 1. Visual Regression Testing (PRIMARY)

**Tool:** BackstopJS (already in ROADMAP.md)

**What It Catches:**
- Form field structure changes
- Visual inconsistencies between similar views
- Unintended styling changes
- Layout shifts or breaks
- Component pattern deviations

**Setup:**
1. Create baseline screenshots of key views:
   - Employee modal form
   - Settings page (employee table)
   - Project allocation modals
   - All component library examples
2. Run BackstopJS on every PR
3. Review diffs for unexpected changes
4. Approve intentional changes, fix unintended ones

**Coverage:**
✅ Catches form-display mismatches automatically  
✅ Catches color/spacing/typography regressions  
✅ Catches component inconsistencies  
✅ Language-agnostic (works with any framework)

**Limitations:**
⚠️ Requires initial setup and baseline creation  
⚠️ Needs maintenance as UI evolves  
⚠️ Can't catch logic errors (only visual)

#### 2. ESLint Custom Rules (SUPPLEMENTARY)

**What It Catches:**
- HTML5 date input usage (`type="month"`, `type="date"`)
- Hardcoded colors instead of design tokens
- Arbitrary font sizes not on the scale
- Spacing values not in 4px increments

**Example Custom Rules:**
```javascript
// .eslintrc.js custom rules
'no-html5-date-inputs': 'error',
'no-hardcoded-colors': 'error',
'design-token-variables-required': 'error'
```

**Coverage:**
✅ Fast feedback (runs during development)  
✅ Catches specific anti-patterns  
✅ Enforces design system rules in code

**Limitations:**
⚠️ Requires custom rule development  
⚠️ Only catches code patterns, not visual output  
⚠️ Limited to JavaScript/HTML linting

#### 3. Pre-Commit Checklist (FALLBACK)

**Tool:** This UI_AUDIT_CHECKLIST.md

**Usage:**
- Developer reviews checklist before creating PR
- Code reviewer confirms checklist items
- Use GitHub PR template to enforce

**Coverage:**
✅ Zero setup required  
✅ Comprehensive (covers logic and visual)  
✅ Encourages thoughtful review

**Limitations:**
⚠️ Relies on human discipline  
⚠️ Can be skipped or rushed  
⚠️ Doesn't prevent issues, just detects them

### Recommended Implementation Order

**Phase 1: Manual Process (NOW)**
- Use this checklist for every PR
- Build institutional knowledge
- Refine checklist based on issues found

**Phase 2: Visual Regression (Next Quarter)**
- Implement BackstopJS as planned in ROADMAP.md
- Create baseline screenshots for critical views
- Integrate into CI/CD pipeline
- Start catching visual regressions automatically

**Phase 3: Code Linting (Future)**
- Add custom ESLint rules for common issues
- Focus on rules that catch 80% of problems
- Start with easiest rules (HTML5 date inputs, hardcoded colors)

### Quick Win: Code Comments

In the meantime, add design pattern annotations:

```javascript
// DESIGN PATTERN: Month/year fields must use separate <select> dropdowns
// Never use type="month" - see UI_AUDIT_CHECKLIST.md > Form Input Consistency
<select id="month">...</select>
<select id="year">...</select>
```

**Benefits:**
- Makes patterns discoverable via code search
- Educates developers at the point of use
- No tooling required
- Links to authoritative documentation

---

## 🎯 Automation Goal

**Target:** Catch 80% of UI consistency issues automatically, reserve manual review for nuanced design decisions.

**Success Metrics:**
- Visual regression tests pass on every PR
- Fewer UI inconsistency bugs reach production
- Faster PR review cycles (automation handles obvious issues)
- Higher confidence in UI changes

---

**Questions?** Review the Design System documentation or check the component library for examples.
