# Website Retheming Prompt

Use this prompt with Claude Code to completely retheme/reskin this Next.js ecommerce website.

---

## Quick Theme Change (Recommended)

**The site now uses semantic color tokens!** To change the primary brand color across the entire site:

1. Open `/app/globals.css`
2. Find the `@theme` block (lines 6-32)
3. Replace the `--color-primary-*` hex values with your brand colors:

```css
@theme {
  /* Change these indigo values to your brand color */
  --color-primary-50: #eef2ff; /* Lightest */
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5; /* Main brand color */
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;
  --color-primary-950: #1e1b4b; /* Darkest */
}
```

**That's it!** All buttons, links, focus states, and interactive elements will automatically use your new color.

### Example Color Palettes

**Emerald Green:**

```css
--color-primary-50: #ecfdf5;
--color-primary-100: #d1fae5;
--color-primary-200: #a7f3d0;
--color-primary-300: #6ee7b7;
--color-primary-400: #34d399;
--color-primary-500: #10b981;
--color-primary-600: #059669;
--color-primary-700: #047857;
--color-primary-800: #065f46;
--color-primary-900: #064e3b;
--color-primary-950: #022c22;
```

**Purple:**

```css
--color-primary-50: #faf5ff;
--color-primary-100: #f3e8ff;
--color-primary-200: #e9d5ff;
--color-primary-300: #d8b4fe;
--color-primary-400: #c084fc;
--color-primary-500: #a855f7;
--color-primary-600: #9333ea;
--color-primary-700: #7e22ce;
--color-primary-800: #6b21a8;
--color-primary-900: #581c87;
--color-primary-950: #3b0764;
```

**Rose/Pink:**

```css
--color-primary-50: #fff1f2;
--color-primary-100: #ffe4e6;
--color-primary-200: #fecdd3;
--color-primary-300: #fda4af;
--color-primary-400: #fb7185;
--color-primary-500: #f43f5e;
--color-primary-600: #e11d48;
--color-primary-700: #be123c;
--color-primary-800: #9f1239;
--color-primary-900: #881337;
--color-primary-950: #4c0519;
```

[See full Tailwind color palette](https://tailwindcss.com/docs/customizing-colors#default-color-palette)

---

## Full Retheming Instructions (Advanced)

For comprehensive design changes beyond just the primary color, use the detailed prompt below with Claude Code.

---

## Retheming Instructions

Please retheme this entire Next.js ecommerce website with the following design specifications:

### Brand Colors

**Primary Brand Color:** [SPECIFY COLOR - e.g., "Emerald green (#10b981)" or "Royal purple (#7c3aed)"]

- Replace all instances of indigo (indigo-600, indigo-500, indigo-700, etc.)
- Use for: buttons, links, active states, focus rings, interactive elements

**Secondary/Accent Color:** [SPECIFY COLOR - e.g., "Slate gray (#64748b)" or "Amber (#f59e0b)"]

- Use for: secondary buttons, hover states, supporting UI elements

**Neutral Color Palette:**

- Background: [SPECIFY - e.g., "Warm white (#fafaf9)" or "Cool gray (#f8fafc)"]
- Text Primary: [SPECIFY - e.g., "Charcoal (#1f2937)" or "Navy (#0f172a)"]
- Text Secondary: [SPECIFY - e.g., "Medium gray (#6b7280)" or "Slate (#64748b)"]
- Borders: [SPECIFY - e.g., "Light gray (#e5e7eb)" or "Neutral (#d4d4d8)"]

**Dark Elements:**

- Hero overlay: [SPECIFY - e.g., "Black with 60% opacity" or "Navy (#1e293b) with 70% opacity"]
- Footer: [SPECIFY - e.g., "Charcoal (#111827)" or "Dark slate (#0f172a)"]

### Typography

**Primary Font:**

- Font Family: [SPECIFY - e.g., "Inter" or "Poppins" or "Keep Geist Sans"]
- Installation: [If changing font: "npm install @next/font" and specify Google Font or system font]

**Typography Scale:**

- Headings: [SPECIFY - e.g., "font-bold" or "font-extrabold", "tracking-tight" or "tracking-normal"]
- Body: [SPECIFY - e.g., "font-normal text-base" or "font-medium text-base"]
- Links: [SPECIFY - e.g., "font-medium underline-offset-4" or "font-semibold no-underline"]

### Design Style

**Overall Aesthetic:**
[SPECIFY - e.g., "Modern and minimal" / "Bold and vibrant" / "Luxury and elegant" / "Playful and friendly"]

**Border Radius:**

- Buttons: [SPECIFY - e.g., "rounded-md" (6px) or "rounded-full" (pill shape) or "rounded-lg" (8px)]
- Cards/Images: [SPECIFY - e.g., "rounded-lg" or "rounded-xl" or "rounded-none"]
- Inputs: [SPECIFY - e.g., "rounded-md" or "rounded-lg"]

**Button Style:**

- Primary buttons: [SPECIFY - e.g., "Solid background with shadow" or "Gradient background" or "Outlined with hover fill"]
- Size: [SPECIFY - e.g., "px-8 py-3" (current) or "px-6 py-2.5" (smaller) or "px-10 py-4" (larger)]
- Font weight: [SPECIFY - e.g., "font-medium" or "font-semibold" or "font-bold"]

**Spacing & Layout:**

- Overall spacing: [SPECIFY - e.g., "Keep current spacing" or "More generous (increase padding by 25%)" or "Tighter/compact"]
- Section padding: [SPECIFY - e.g., "Keep current" or "Increase vertical spacing between sections"]

### Product Display

**Product Cards:**

- Image style: [SPECIFY - e.g., "Rounded corners with shadow" or "Sharp corners, no shadow" or "Subtle border"]
- Hover effect: [SPECIFY - e.g., "Opacity fade (current)" or "Scale up slightly" or "Add shadow" or "None"]
- Background: [SPECIFY - e.g., "Light gray (current)" or "White" or "Match page background"]

**Product Detail Page:**

- Image gallery style: [SPECIFY - e.g., "Keep current tab style" or "Thumbnail sidebar" or "Dots navigation"]
- Color swatches: [SPECIFY - e.g., "Keep current circle swatches" or "Square swatches" or "Rounded squares"]
- Size selector: [SPECIFY - e.g., "Keep current button grid" or "Dropdown" or "Radio list"]

### Navigation

**Desktop Navigation:**

- Style: [SPECIFY - e.g., "Clean underline indicator (current)" or "Background highlight" or "Bold text only"]
- Hover effect: [SPECIFY - e.g., "Color change only" or "Underline animation" or "Background fade"]

**Mobile Navigation:**

- Style: [SPECIFY - e.g., "Full-screen slide-over (current)" or "Slide from top" or "Bottom sheet"]
- Background: [SPECIFY - e.g., "White" or "Match theme background" or "Blur overlay"]

### Special Requests

[ADD ANY SPECIFIC REQUESTS - e.g.:]

- Add subtle animations to product cards
- Make the search command palette match new theme
- Update the newsletter signup section styling
- Change cart drawer appearance
- Modify footer layout

---

## Implementation Requirements

1. **Update all color references** throughout the codebase:

   - Replace indigo-\* classes with new primary color
   - Update gray/neutral palette consistently
   - Fix the `bg-blue-600` inconsistency in add-to-cart button

2. **Typography changes:**

   - Update font family if specified
   - Adjust font weights and tracking
   - Ensure readability is maintained

3. **Component updates:**

   - Buttons (primary, secondary, icon buttons)
   - Links (navigation, product links, footer links)
   - Form inputs (search, newsletter, filters)
   - Cards (product cards, collection cards)
   - Navigation (desktop dropdown, mobile menu)
   - Cart drawer
   - Search command palette
   - Product detail components

4. **Maintain functionality:**

   - Keep all interactive states (hover, focus, active)
   - Preserve accessibility (focus rings, ARIA attributes)
   - Ensure responsive design works on all breakpoints
   - Test cart operations and navigation

5. **Files to modify:**
   - `/app/globals.css` - Global styles and border colors
   - `/app/layout.tsx` - Font family and body background
   - `/app/(store)/layout.tsx` - Store section backgrounds
   - All navigation components (`/components/layout/navbar/`)
   - All product components (`/components/product/`)
   - Home page components (`/components/home/`)
   - Search components (`/components/search-command/`)
   - Cart components (`/components/cart/`)
   - Footer components (`/components/layout/footer/`)

---

## Example Filled-Out Prompt

```
Please retheme this entire Next.js ecommerce website with the following design specifications:

### Brand Colors

**Primary Brand Color:** Emerald green (#10b981) - Use emerald-600 for main elements, emerald-500 for hover, emerald-700 for pressed states

**Secondary/Accent Color:** Teal (#14b8a6) - Use for secondary buttons and supporting elements

**Neutral Color Palette:**
- Background: Warm white (#fafaf9) - stone-50
- Text Primary: Charcoal (#18181b) - zinc-900
- Text Secondary: Medium gray (#71717a) - zinc-500
- Borders: Light gray (#e4e4e7) - zinc-200

**Dark Elements:**
- Hero overlay: Black with 50% opacity
- Footer: Dark zinc (#18181b)

### Typography

**Primary Font:** Keep Geist Sans - it's clean and modern

**Typography Scale:**
- Headings: font-bold with tracking-tight
- Body: font-normal text-base
- Links: font-semibold with subtle underline on hover

### Design Style

**Overall Aesthetic:** Modern, clean, and eco-friendly - emphasizing natural, organic feel

**Border Radius:**
- Buttons: rounded-lg (8px) for softer feel
- Cards/Images: rounded-xl (12px)
- Inputs: rounded-lg

**Button Style:**
- Primary buttons: Solid emerald background with subtle shadow, slightly larger padding (px-10 py-3.5)
- Font weight: font-semibold

**Spacing & Layout:**
- Overall spacing: Keep current spacing, it's already well-balanced

### Product Display

**Product Cards:**
- Image style: Rounded-xl corners with subtle shadow on hover
- Hover effect: Add shadow and slight scale (scale-105)
- Background: White with very subtle border

**Product Detail Page:**
- Image gallery style: Keep current tab style
- Color swatches: Rounded square swatches (rounded-md)
- Size selector: Keep current button grid but with rounded-lg

### Navigation

**Desktop Navigation:**
- Style: Background highlight with emerald-50 on hover, emerald-100 when active
- Hover effect: Smooth background color transition

**Mobile Navigation:**
- Style: Keep full-screen slide-over
- Background: White with emerald accent for active tabs

### Special Requests
- Update search command palette to use emerald for highlights instead of indigo
- Make newsletter signup button more prominent with emerald-600 background
- Add subtle hover animations to product cards (transition-all duration-300)
- Update focus rings to use emerald-500 instead of indigo
```

---

## Notes

- Be specific with color values to ensure consistency
- Provide Tailwind color names (e.g., "emerald-600") when possible
- Consider color contrast for accessibility (WCAG AA minimum)
- Test on both light and dark modes if implementing dark mode
- Verify all interactive states are clearly visible with new colors
