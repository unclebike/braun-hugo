# GOATkit Admin Typography System

## Overview

The admin panel typography system is built on **iOS Human Interface Guidelines (HIG) principles** with **TideSans** as the canonical font family. This ensures a consistent, accessible, and optically-tuned reading experience across all screen sizes and themes (light/dark).

**Key principles:**
- **Semantic hierarchy**: Named styles (not generic size classes)
- **Optical sizing**: Weights and line heights adjust per style to maintain legibility
- **TideSans only**: All 9 weights (100–900) available for nuanced optical tuning
- **Accessibility-first**: Line heights and sizes support dynamic type scaling
- **CSS variables**: Single source of truth for all typography properties

---

## Type Scale Foundation

### Base Setup
```css
html { font-size: 10px; }  /* 1rem = 10px */
```

This enables clean rem arithmetic: `3.4rem = 34px`, `1.8rem = 18px`, etc.

### Font Family
```css
--font-sans: 'TideSans', system-ui, -apple-system, sans-serif;
```

TideSans is used exclusively in the admin panel. The public site uses system fonts.

### Font Weights (4-weight system)
```css
--font-weight-light: 300;      /* Never used in current system */
--font-weight-regular: 400;    /* Body text, secondary info */
--font-weight-medium: 600;     /* Small text, emphasis (optical sizing) */
--font-weight-bold: 700;       /* Headings, high contrast */
```

**Optical sizing principle**: Smaller text (< 18px) uses heavier weights (600+) for legibility.

---

## Semantic Type Styles

Each style is defined by **three CSS variables**: `--text-*`, `--lh-*`, `--fw-*`.

### Display Styles

#### Large Title
- **Variables**: `--text-large-title`, `--lh-large-title`, `--fw-large-title`
- **Size**: 34px (3.4rem) | **Weight**: 700 | **Line-height**: 1.0
- **Use case**: Top-level page titles, modal headers
- **HTML element**: `<h1>`
- **CSS utility**: `.text-large-title`
- **Notes**: Compact line-height (1.0) because text is large and bold

#### Title 1
- **Variables**: `--text-title-1`, `--lh-title-1`, `--fw-title-1`
- **Size**: 28px (2.8rem) | **Weight**: 700 | **Line-height**: 1.1
- **Use case**: Primary section headers (e.g., "Jobs", "Customers")
- **HTML element**: `<h2>`
- **CSS utility**: `.text-title-1`
- **Notes**: Slightly looser than Large Title for breathing room

#### Title 2
- **Variables**: `--text-title-2`, `--lh-title-2`, `--fw-title-2`
- **Size**: 23px (2.3rem) | **Weight**: 600 | **Line-height**: 1.15
- **Use case**: Subsection headers (card titles, job details section)
- **HTML element**: `<h3>`
- **CSS utility**: `.text-title-2`
- **Notes**: Medium weight (600) instead of bold for subtlety

#### Title 3
- **Variables**: `--text-title-3`, `--lh-title-3`, `--fw-title-3`
- **Size**: 18px (1.8rem) | **Weight**: 600 | **Line-height**: 1.2
- **Use case**: Card titles, subheadings within sections
- **HTML element**: `<h4>`
- **CSS utility**: `.text-title-3`
- **Notes**: Same size as body but medium weight for hierarchy

### Body/Reading Styles

#### Body
- **Variables**: `--text-body`, `--lh-body`, `--fw-body`
- **Size**: 18px (1.8rem) | **Weight**: 400 | **Line-height**: 1.5
- **Use case**: Main paragraph text, primary content
- **HTML element**: `<p>`
- **CSS utility**: `.text-body`
- **Notes**: Optimal readability (18px min, 1.5 lh). Used in job descriptions, notes, etc.

#### Callout
- **Variables**: `--text-callout`, `--lh-callout`, `--fw-callout`
- **Size**: 16px (1.6rem) | **Weight**: 600 | **Line-height**: 1.35
- **Use case**: Inline emphasis, highlighted stats, badges
- **HTML element**: `<span>` with `.text-callout`
- **CSS utility**: `.text-callout`
- **Notes**: Medium weight (600) for emphasis without size increase

### Secondary/Label Styles

#### Headline
- **Variables**: `--text-headline`, `--lh-headline`, `--fw-headline`
- **Size**: 15px (1.5rem) | **Weight**: 700 | **Line-height**: 1.3
- **Use case**: Field labels, emphasis within body
- **HTML element**: `<span>` with `.text-headline` or form context
- **CSS utility**: `.text-headline`
- **Notes**: Bold weight for label distinction

#### Subheadline
- **Variables**: `--text-subheadline`, `--lh-subheadline`, `--fw-subheadline`
- **Size**: 15px (1.5rem) | **Weight**: 400 | **Line-height**: 1.35
- **Use case**: Metadata, secondary info, form inputs
- **HTML element**: `<input>`, `<textarea>`, `<span>` with `.text-subheadline`
- **CSS utility**: `.text-subheadline`
- **Notes**: Same size as Headline but regular weight for quieter presentation

#### Footnote
- **Variables**: `--text-footnote`, `--lh-footnote`, `--fw-footnote`
- **Size**: 13px (1.3rem) | **Weight**: 400 | **Line-height**: 1.4
- **Use case**: Form labels, hint text, buttons
- **HTML element**: `<button>`, `<label>`, `<small>`
- **CSS utility**: `.text-footnote`
- **Notes**: WCAG AA compliant (min 12.5px effective after line-height). Used in form context.

### Compact Styles (Optical Sizing)

#### Caption 1
- **Variables**: `--text-caption-1`, `--lh-caption-1`, `--fw-caption-1`
- **Size**: 12px (1.2rem) | **Weight**: 400 | **Line-height**: 1.4
- **Use case**: Small labels, timestamps, metadata tags
- **HTML element**: `<span>` with `.text-caption-1`
- **CSS utility**: `.text-caption-1`
- **Notes**: Regular weight to keep compact. Line-height increased (1.4) for legibility at small size.

#### Caption 2
- **Variables**: `--text-caption-2`, `--lh-caption-2`, `--fw-caption-2`
- **Size**: 10px (1.0rem) | **Weight**: 600 | **Line-height**: 1.3
- **Use case**: Uppercase labels, badges, status indicators
- **HTML element**: `<span>` with `.text-caption-2` or `.uk-label`
- **CSS utility**: `.text-caption-2`
- **Notes**: **Optical sizing**: Medium weight (600) at 10px for optical compensation. Always paired with `text-transform: uppercase` or `letter-spacing: 0.04em` to maintain legibility.

---

## Implementation Guide

### Using Semantic Styles in HTML/TSX

**Option 1: Use HTML elements** (preferred for semantic markup)
```tsx
<h1>Page Title</h1>           {/* Large Title */}
<h2>Section Header</h2>       {/* Title 1 */}
<h3>Subsection</h3>           {/* Title 2 */}
<p>Body text goes here</p>    {/* Body */}
<label>Field Label</label>    {/* Caption 2 (form context) */}
```

**Option 2: Use utility classes** (when semantic element doesn't fit)
```tsx
<div class="text-large-title">Custom Title</div>
<span class="text-body">Secondary content</span>
<span class="text-callout">Highlighted stat: 42 jobs</span>
<div class="text-caption-2">TIMESTAMP • 2 hours ago</div>
```

**Option 3: Combine element + utility** (for override)
```tsx
<span class="text-callout">Emphasis text</span>  {/* 16px, weight 600 */}
```

### CSS Variable Access in Components

If you need to apply typography in CSS/styled-components:
```css
.my-element {
  font-size: var(--text-body);
  font-weight: var(--fw-body);
  line-height: var(--lh-body);
}

/* Or shorthand with utility class: */
.my-element {
  @apply text-body;
}
```

### Existing Global Styles (Already Applied)

These styles are **automatically applied** to all matching elements:

| Element | Style Applied |
|---------|--------------|
| `<h1>` | Large Title |
| `<h2>` | Title 1 |
| `<h3>` | Title 2 |
| `<h4>` | Title 3 |
| `<h5>` | Headline |
| `<h6>` | Caption 1 |
| `<p>` | Body |
| `<button>` | Footnote |
| `<input>`, `<textarea>` | Subheadline |
| `<label>` | Caption 2 |

**No additional CSS needed** for these elements. Just use the semantic HTML.

---

## Typography at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│ Large Title (h1)            34px · 700 · 1.0                    │
├─────────────────────────────────────────────────────────────────┤
│ Title 1 (h2)                28px · 700 · 1.1                    │
├─────────────────────────────────────────────────────────────────┤
│ Title 2 (h3)                23px · 600 · 1.15                   │
├─────────────────────────────────────────────────────────────────┤
│ Title 3 (h4)                18px · 600 · 1.2                    │
├─────────────────────────────────────────────────────────────────┤
│ Headline (h5, label)        15px · 700 · 1.3                    │
├─────────────────────────────────────────────────────────────────┤
│ Body (p)                    18px · 400 · 1.5  ← WCAG AA         │
├─────────────────────────────────────────────────────────────────┤
│ Callout (span)              16px · 600 · 1.35                   │
├─────────────────────────────────────────────────────────────────┤
│ Subheadline (input)         15px · 400 · 1.35                   │
├─────────────────────────────────────────────────────────────────┤
│ Footnote (button)           13px · 400 · 1.4  ← Form context    │
├─────────────────────────────────────────────────────────────────┤
│ Caption 1 (small tags)      12px · 400 · 1.4                    │
├─────────────────────────────────────────────────────────────────┤
│ Caption 2 (.uk-label)       10px · 600 · 1.3  ← Optical sizing  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Accessibility & WCAG Compliance

### Minimum Font Size
- **Body text**: 18px (1.8rem) ✓ exceeds WCAG AA minimum (12px effective)
- **Form labels**: 13px (1.3rem) ✓ acceptable in form context
- **Small captions**: 10px (1.0rem) — acceptable for supporting info, NOT primary content

### Line Height
- **Large text (> 18px)**: 1.0–1.2 — compact, no orphans
- **Body text (18px)**: 1.5 — optimal reading comfort
- **Small text (< 15px)**: 1.35–1.4 — increased to prevent cramping

### Color Contrast
All text styles inherit `color: var(--text)` which maintains 4.5:1+ contrast (WCAG AA) in both light and dark themes.

### Dynamic Type Scaling
The system supports iOS/Android dynamic type. Users can adjust base font size via OS settings:
- `html { font-size: 10px }` base
- All sizes defined in `rem` units
- OS zoom scales all text proportionally

---

## Design Decisions & Rationale

### Why Not Use --text-xxs, --text-xs, etc.?

Old approach (❌):
```css
--text-xxs: 10px;
--text-xs: 12px;
--text-sm: 15px;
/* Doesn't indicate *semantic purpose* or *when to use* */
```

New approach (✓):
```css
--text-caption-2: 10px;    /* Uppercase badges, status indicators */
--text-caption-1: 12px;    /* Small labels, timestamps */
--text-footnote: 13px;     /* Form context, buttons */
```

**Benefit**: Self-documenting. Developers know *why* to use each style, not just *what size* it is.

### Why Optical Sizing?

At 10px, regular weight (400) appears thin and weak. Medium weight (600) at 10px provides optical balance:

```
10px weight 400  →  "Caption 2" (looks fragile)
10px weight 600  →  "CAPTION 2" (appears sturdy, readable)
```

This follows iOS HIG principle: **weight compensation for smaller sizes**.

### Why Line Height Per Style?

One-size-fits-all approach (❌):
```css
--lh-normal: 1.4;  /* Applied everywhere */
/* Problems: too tight for large headings (orphans),
             too loose for small text (wasted space) */
```

Per-style approach (✓):
```css
--lh-large-title: 1.0;  /* Tight for 34px bold */
--lh-body: 1.5;         /* Comfort for 18px body */
--lh-caption-2: 1.3;    /* Balance for 10px */
```

**Benefit**: Optimal readability at each size level.

---

## Common Use Cases

### Job Detail Page
```tsx
<h1>Job Title</h1>                          {/* Large Title */}
<p>Job description paragraph</p>            {/* Body */}
<h2>Details</h2>                            {/* Title 1 */}
<h3>Service Area</h3>                       {/* Title 2 */}
<label htmlFor="radius">Radius (miles)</label>  {/* Caption 2 */}
<input id="radius" type="number" />         {/* Subheadline */}
<button>Save</button>                       {/* Footnote */}
```

### Card Component
```tsx
<div className="uk-card">
  <h3>Customer Details</h3>                 {/* Title 2 */}
  <p>Contact info and history</p>           {/* Body */}
  <span className="text-caption-1">Updated 2h ago</span>  {/* Caption 1 */}
</div>
```

### Status Badge
```tsx
<span className="uk-label uk-label-primary text-caption-2">ACTIVE</span>
{/* Caption 2: 10px, weight 600, auto-uppercased by CSS */}
```

### Form Section
```tsx
<label className="uk-form-label">Email Address</label>  {/* Caption 2 */}
<input type="email" className="uk-input" />             {/* Subheadline */}
<small className="text-footnote">We'll never share your email</small>
```

---

## Maintenance & Updates

### Adding a New Typography Style

1. Define three CSS variables in `:root`:
   ```css
   --text-mynewstyle: Xrem;
   --fw-mynewstyle: Y;
   --lh-mynewstyle: Z;
   ```

2. Create utility class:
   ```css
   .text-mynewstyle { 
     font-size: var(--text-mynewstyle);
     font-weight: var(--fw-mynewstyle);
     line-height: var(--lh-mynewstyle);
   }
   ```

3. Document in this file with use case.

4. Consider if an `<h*>` or global element should use it.

### Updating Existing Styles

**Never** change `--text-*` values without considering layout impact (reflow, truncation). Test on actual pages.

Prefer adjusting `--lh-*` or `--fw-*` if tweaking legibility—these don't break layouts.

---

## Theme Support (Light/Dark)

All typography variables are **theme-agnostic**. Font sizes and weights are identical in light and dark modes. Only `color: var(--text)` changes per theme.

```css
/* Light mode */
:root { --text: #4c4f69; }

/* Dark mode */
[data-theme="dark"] { --text: #cdd6f4; }
```

Typography rendering is identical; only contrast and color values shift.

---

## Backwards Compatibility

**Legacy variables** (still available but deprecated):
```css
--lh-tight: 1.1;
--lh-normal: 1.4;
--lh-loose: 1.6;
--font-weight-light: 300;
```

Prefer semantic variables for new code. Legacy variables supported for gradual migration of existing components.
