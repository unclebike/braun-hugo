# Typography System Guide

Complete reference for the unified typography system across Braun Hugo (public site + admin panel).

## System Principles

1. **Scale Ratio**: Major Third (1.25) creates harmonious typography progression
2. **Line Heights**: Exactly 3 values (1.1 tight, 1.4 normal, 1.6 loose) for consistency
3. **Font Weights**: Only 4 standard weights (300, 400, 600, 700) - no non-standard weights
4. **Semantic Naming**: Classes describe purpose, not appearance
5. **Maximum Styles**: 12 total text styles for maintainability
6. **Single Source**: Unified system via CSS variables, reused across all contexts

---

## Public Site Semantic Classes

Use these classes on the public-facing website for content, components, and layouts.

### Display Classes (Large Headlines)

```css
.display           /* 5.5rem, bold, -0.02em letter-spacing */
.display-md        /* 4.4rem, bold, -0.01em letter-spacing */
```

**When to use:**
- Page hero sections
- Large marketing headlines
- Featured content titles
- Above-the-fold headlines

**Example:**
```html
<h1 class="display">Welcome to Our Service</h1>
<h2 class="display-md">Featured Collection</h2>
```

### Headline Class

```css
.headline          /* 2.8rem, bold, tight line-height */
```

**When to use:**
- Section headings (h1-equivalent in blog posts)
- Primary content headlines
- Article titles
- Important subsections

**Example:**
```html
<article>
  <h1 class="headline">Article Title</h1>
  <p class="body">Article content here...</p>
</article>
```

### Subheading Classes

```css
.subhead           /* 2.3rem, medium weight, normal line-height */
.subhead-lg        /* Fluid: 2.3rem–2.8rem via clamp(), medium weight */
```

**When to use:**
- Secondary headings (h2-h3 equivalents)
- Section subheadings
- Responsive flexible headings
- Content subsections

**Example:**
```html
<section>
  <h2 class="subhead">Section Subtitle</h2>
  <p class="body">Content here...</p>
</section>
```

### Body Classes

```css
.body              /* 1.8rem, regular weight, normal line-height */
.body-sm           /* 1.5rem, regular weight, normal line-height */
```

**When to use:**
- Paragraph text (.body for primary, .body-sm for supplementary)
- List items
- Table content
- Form descriptions

**Example:**
```html
<p class="body">This is primary paragraph text.</p>
<p class="body-sm">This is smaller supplementary text.</p>
```

### Label Class

```css
.label             /* 1.2rem, medium weight, uppercase, 0.05em letter-spacing */
```

**When to use:**
- Metadata labels
- Tags and badges
- Section headers/categories
- Form field labels (uppercase)

**Example:**
```html
<span class="label">Published</span>
<span class="label">Featured</span>
<label class="label">Email Address</label>
```

### Caption Class

```css
.caption           /* 1.2rem, regular weight, loose line-height (1.6) */
```

**When to use:**
- Figure captions
- Footnotes
- Attribution text
- Small disclaimer text

**Example:**
```html
<figure>
  <img src="photo.jpg" alt="Description">
  <figcaption class="caption">Photo by Jane Smith</figcaption>
</figure>
```

---

## Admin Panel Semantic Classes

Use these classes in the admin interface for consistent UI typography.

### Admin Page Titles

```css
.admin-page-title  /* 2.8rem, bold, tight line-height, -0.01em spacing */
```

**When to use:**
- Page header titles
- Main content area headings
- Primary admin section titles

**Example:**
```tsx
<h1 class="admin-page-title">Dashboard</h1>
<h1 class="admin-page-title">Messages</h1>
```

### Admin Section Titles

```css
.admin-section-title /* 1.8rem, medium weight, normal line-height */
```

**When to use:**
- Card/panel titles
- Subsection headings
- Form section headers
- Content group titles

**Example:**
```tsx
<h2 class="admin-section-title">Account Settings</h2>
```

### Admin Labels (Form Fields)

```css
.admin-label       /* 1.2rem, medium weight, 0.02em letter-spacing */
```

**When to use:**
- Form field labels
- Metadata labels in listings
- Status indicators
- Descriptive labels

**Example:**
```tsx
<label class="admin-label">Email Address</label>
<input type="email" />
```

### Admin Navigation Items

```css
.admin-nav-item           /* 1.5rem, regular weight */
.admin-nav-item-active    /* 1.5rem, medium weight (for active state) */
.admin-nav-header         /* 1.2rem, medium weight, uppercase, 0.08em spacing */
```

**When to use:**
- Navigation menu items
- Sidebar links
- Navigation categories
- Menu group headers

**Example:**
```tsx
<nav>
  <div class="admin-nav-header">Main Menu</div>
  <a href="#" class="admin-nav-item">Dashboard</a>
  <a href="#" class="admin-nav-item-active">Messages</a>
</nav>
```

### Admin Card and Modal Titles

```css
.admin-card-title  /* 1.8rem, medium weight, normal line-height */
.admin-modal-title /* 2.8rem, bold, tight line-height */
```

**When to use:**
- Card header titles
- Modal dialog titles
- Popup window titles
- Panel header text

**Example:**
```tsx
<div class="card">
  <h3 class="admin-card-title">Card Title</h3>
</div>

<dialog>
  <h2 class="admin-modal-title">Confirm Action</h2>
</dialog>
```

### Admin Button Text

```css
.admin-button           /* 1.5rem, medium weight */
.admin-button-secondary /* 1.5rem, regular weight */
```

**When to use:**
- Primary action buttons
- Secondary/cancel buttons
- CTA button text
- Action menu items

**Example:**
```tsx
<button class="admin-button">Save Changes</button>
<button class="admin-button-secondary">Cancel</button>
```

### Admin Helper and Caption Text

```css
.admin-help-text   /* 1.2rem, regular weight */
.admin-caption     /* 1.2rem, regular weight, loose line-height (1.6) */
```

**When to use:**
- Field helper text
- Form hints
- Small explanatory text
- Captions and notes

**Example:**
```tsx
<label>Email</label>
<input type="email" />
<p class="admin-help-text">We'll never share your email.</p>
```

### Admin Table Typography

```css
.admin-table-header /* 1.2rem, medium weight, uppercase, 0.02em spacing */
.admin-table-cell   /* 1.5rem, regular weight, normal line-height */
```

**When to use:**
- Table header cells (th)
- Table data cells (td)
- Column titles
- Row data

**Example:**
```tsx
<table>
  <thead>
    <tr>
      <th class="admin-table-header">Name</th>
      <th class="admin-table-header">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="admin-table-cell">John Doe</td>
      <td class="admin-table-cell">Active</td>
    </tr>
  </tbody>
</table>
```

### Admin Badges and Status

```css
.admin-badge       /* 1.2rem, medium weight, line-height 1 (compact) */
```

**When to use:**
- Status badges
- Tag pills
- Badge indicators
- Small status text

**Example:**
```tsx
<span class="admin-badge">Active</span>
<span class="admin-badge">Pending</span>
<span class="admin-badge">Archived</span>
```

---

## Typography Scale (CSS Variables)

All typography uses these CSS variables for consistency:

```css
/* Font Sizes - Major Third Scale (1.25 ratio) */
--text-xs: 1.2rem      /* 12px equivalent */
--text-sm: 1.5rem      /* 15px equivalent */
--text-base: 1.8rem    /* 18px equivalent */
--text-md: 2.3rem      /* 23px equivalent */
--text-lg: 2.8rem      /* 28px equivalent */
--text-xl: 3.5rem      /* 35px equivalent */
--text-2xl: 4.4rem     /* 44px equivalent */
--text-3xl: 5.5rem     /* 55px equivalent */

/* Line Heights */
--lh-tight: 1.1        /* For headings, display text */
--lh-normal: 1.4       /* Default for body and most content */
--lh-loose: 1.6        /* For captions, footnotes, dense content */

/* Font Weights */
--font-weight-light: 300         /* Rarely used, special emphasis */
--font-weight-regular: 400       /* Body text, default */
--font-weight-medium: 600        /* Emphasis, labels, nav items */
--font-weight-bold: 700          /* Headlines, strong emphasis */
```

**Accessing in CSS:**
```css
.my-class {
    font-size: var(--text-base);
    line-height: var(--lh-normal);
    font-weight: var(--font-weight-medium);
}
```

---

## Font Family System

### Default Font Stack
```css
--font-base: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
```
Used for all body text, buttons, forms, and navigation by default.

### Serif Alternative
```css
--font-serif: 'Cardo', Georgia, serif
```

**To enable serif fonts:**
- Add `.has-serif-body` class to parent container for body text
- Add `.has-serif-title` class to parent container for headings

**Example:**
```html
<div class="has-serif-title has-serif-body">
  <h1>This heading uses serif font</h1>
  <p>This body text uses serif font</p>
</div>
```

---

## Responsive Typography

### Mobile Breakpoint (max-width: 767px)

Typography scales down on mobile devices:

| Class | Desktop | Mobile |
|-------|---------|--------|
| .display | 5.5rem | 4.4rem |
| .display-md | 4.4rem | 3.5rem |
| .headline | 2.8rem | 2.3rem |
| .subhead | 2.3rem | 1.8rem |
| .subhead-lg | clamp(2.3, 2vw, 2.8) | clamp(1.8, 2vw, 2.3) |
| .admin-page-title | 2.8rem | 2.3rem |
| .admin-section-title | 1.8rem | 1.5rem |
| .admin-modal-title | 2.8rem | 2.3rem |

### Fluid Typography (clamp)

Some classes use `clamp()` for smooth scaling:

```css
.subhead-lg {
    font-size: clamp(var(--text-md), 2vw, var(--text-lg));
    /* Min: 2.3rem, Preferred: 2vw, Max: 2.8rem */
}
```

This means the font size scales smoothly between min/max as viewport width changes, without hard breakpoints.

---

## Do's and Don'ts

### ✅ DO

- Use semantic classes (`.display`, `.body`, `.label`)
- Use CSS variables for size/weight (e.g., `var(--text-base)`)
- Use only 4 font weights: 300, 400, 600, 700
- Keep consistent with existing patterns
- Use `.admin-*` classes for admin UI elements
- Use media query rules instead of inline media queries

### ❌ DON'T

- Use arbitrary font sizes (don't create new `1.9rem`, `2.1rem`, etc.)
- Use non-standard weights (450, 500, 650, 800)
- Mix semantic classes with custom inline styles
- Create new typography classes without updating this guide
- Use hardcoded pixel values in new code
- Ignore the 3 line-height system (use 1.1, 1.4, or 1.6 only)

---

## Common Use Cases

### Blog Article
```html
<article>
  <h1 class="headline">Article Title</h1>
  <p class="body-sm">By Author | January 15, 2025</p>
  <p class="body">Article content with primary body text...</p>
  <blockquote class="body">
    <p>Important quote here</p>
    <cite class="caption">— Citation</cite>
  </blockquote>
</article>
```

### Card Component
```html
<div class="card">
  <h3 class="admin-card-title">Card Heading</h3>
  <p class="body">Card description text</p>
  <button class="admin-button">Action</button>
</div>
```

### Form Group
```html
<fieldset>
  <label class="admin-label">Email Address</label>
  <input type="email" />
  <p class="admin-help-text">Required field</p>
</fieldset>
```

### Navigation
```html
<nav>
  <div class="admin-nav-header">Navigation</div>
  <a href="#" class="admin-nav-item">Item 1</a>
  <a href="#" class="admin-nav-item-active">Item 2</a>
</nav>
```

---

## Maintenance and Future Updates

### Adding New Typography Styles

If you need a new typography style:

1. **Check existing classes** - Does one of the 12 semantic classes work?
2. **Consider scale** - Use existing size variables (--text-xs through --text-3xl)
3. **Update this guide** - Document the new class and its use case
4. **Keep to 4 weights** - Never add 450, 500, 650, 800 weights
5. **Verify responsive** - Ensure mobile rules are defined if needed

### Migrating Old Code

If you find old inline styles:

1. Identify the purpose (heading, body, label, etc.)
2. Find the matching semantic class above
3. Replace inline style with class attribute
4. Verify responsive behavior

**Example migration:**
```html
<!-- Before -->
<h2 style="font-size: 2.3rem; font-weight: 600; margin-bottom: 1rem;">Title</h2>

<!-- After -->
<h2 class="admin-section-title">Title</h2>
```

---

## Questions?

Refer to:
- **File**: `/assets/css/general/typography.css` - CSS class definitions
- **File**: `/assets/css/general/basics.css` - CSS variable definitions
- **File**: `TYPOGRAPHY_GUIDE.md` - This documentation

For questions about usage, check existing implementations in:
- `/themes/braun-hugo/layouts/` - Public site templates
- `/api/src/views/` - Admin panel views
