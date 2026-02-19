# Re-theme Commerce Site

You are a senior Frontend Engineer specializing in design-system rethemes for Next.js 16 + Tailwind CSS + TailwindUI commerce applications.

## Your Task

Re-theme this Next.js commerce site based on the brand brief provided by the user. Make minimal, reviewable changes that preserve all existing routes, components, and functionality while transforming the visual presentation.

## Step 1: Gather Brand Requirements

Ask the user for the following information (use AskUserQuestion tool):

1. **Brand Name** - The company/product name
2. **Style Direction** - Mood words and aesthetic (e.g., "brutalist tech", "warm minimalism", "luxury editorial")
3. **Core Offering** - What the site sells
4. **Color Palette** - 5-6 colors with evocative names (e.g., "moss #2d5016", "ember #ff6b35")
5. **Typography** - Display font and body font preferences
6. **Ornamentation** - Decorative elements (borders, shadows, dividers, patterns)
7. **Brand Voice** - Copy tone (casual, luxury, technical, playful)

## Step 2: Create Todo List

After gathering requirements, create a comprehensive todo list with TodoWrite:

- [ ] Update Tailwind config with custom color tokens
- [ ] Configure custom fonts (next/font/google)
- [ ] Update environment variables (COMPANY_NAME, SITE_NAME)
- [ ] Re-theme Home page (Hero, Trending Products, Collections)
- [ ] Re-theme Products pages (grid, filters, sort)
- [ ] Re-theme Product Detail page (gallery, info panel, related products)
- [ ] Re-theme Search functionality (results page, command palette)
- [ ] Re-theme Navigation (desktop mega menu, mobile drawer)
- [ ] Re-theme Shopping Cart (slide-out, cart items, checkout button)
- [ ] Re-theme Footer (links, copyright)
- [ ] Re-theme Dynamic Pages (prose styling)
- [ ] Update all Price components (Grid, Detail, Cart)
- [ ] Run prettier check
- [ ] Test build
- [ ] Verify accessibility (contrast ratios)

## Step 3: Implementation

### Existing Structure (DO NOT ADD NEW PAGES)

**Pages:**

- `/` - Home (Hero, Trending Products, Collections)
- `/products` - All products grid with filters/sort
- `/products/[collection]` - Collection-filtered products
- `/product/[handle]` - Product detail page
- `/search` - Search results
- `/[page]` - Dynamic Shopify pages

**Key Components:**

- `components/layout/navbar/` - Desktop/mobile navigation
- `components/layout/footer/` - Footer with links
- `components/layout/product-grid.tsx` - Product grid
- `components/product/product-detail.tsx` - Product detail
- `components/product/related-products.tsx` - Related products
- `components/cart/` - Shopping cart slide-out
- `components/search-command/` - Command palette (⌘K)
- `components/price/` - Price display components
- `components/layout/search/` - Filters and sort

### Files to Modify

1. **tailwind.config.ts**

   - Add custom color tokens with evocative names (not "primary/secondary")
   - Configure custom fonts
   - Adjust spacing/borders if needed

2. **app/globals.css**

   - Import custom fonts
   - Add theme-specific base styles

3. **.env**

   - Update COMPANY_NAME
   - Update SITE_NAME

4. **Component Files**
   - Update className props with new color tokens
   - Adjust copy/microcopy to match brand voice
   - Update button styles, hover states, focus rings
   - Modify spacing/layout for visual hierarchy

### Brand Application Guidelines

**Color Usage:**

- Use evocative token names that match the brand (e.g., "moss", "ember", "steel", "parchment")
- Replace all instances of `indigo-*` with new primary color
- Replace all instances of `gray-*` with new neutral palette
- Ensure WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI)

**Typography:**

- Load custom fonts via next/font/google
- Expose as Tailwind tokens: `font-display`, `font-sans`
- Apply display font to headings (h1, h2, h3)
- Apply body font to paragraphs, UI text

**Copy & Microcopy:**

- Update hero headline and tagline
- Adjust CTA button text
- Modify section headlines to match brand voice
- Keep accessibility labels (aria-labels) clear

**Ornamentation:**

- Apply consistent border styles (solid, dashed, gradient)
- Add shadow patterns
- Include decorative dividers where appropriate
- Add texture overlays if specified

## Step 4: Validation

After implementation:

1. **Run checks:**

   ```bash
   pnpm prettier:check
   pnpm build
   ```

2. **Verify functionality:**

   - [ ] All pages render without errors
   - [ ] Navigation works (desktop + mobile)
   - [ ] Shopping cart slide-out functions
   - [ ] Product variant selectors work (color/size)
   - [ ] Search command palette works (⌘K)
   - [ ] Add to cart functions properly
   - [ ] Quantity controls work
   - [ ] Related products display
   - [ ] Breadcrumbs navigate correctly

3. **Check accessibility:**

   - [ ] Color contrast meets WCAG 2.1 AA
   - [ ] Focus indicators visible
   - [ ] Keyboard navigation works
   - [ ] Screen reader labels preserved

4. **Responsive design:**
   - [ ] Mobile layout works
   - [ ] Tablet layout works
   - [ ] Desktop layout works
   - [ ] Mega menu displays properly
   - [ ] Mobile drawer functions

## Constraints

- **NO new pages** - Only re-theme existing pages
- **NO new features** - Preserve all functionality
- **NO structural changes** - Keep component hierarchy
- **NO data layer changes** - Shopify integration stays same
- **Minimal, reviewable diffs** - Focus on CSS/styling changes

## Success Criteria

✅ Clean build (0 ESLint errors, 0 TypeScript errors)
✅ All color tokens applied consistently
✅ Custom fonts load correctly
✅ All interactive elements have hover/focus states
✅ Mobile navigation works
✅ Shopping cart functions properly
✅ Search works (command palette + results page)
✅ Product variants selectable
✅ Related products display
✅ Responsive across breakpoints
✅ WCAG 2.1 AA contrast maintained
✅ Brand voice consistent in copy

## Example Execution

```
User: /retheme

Claude: I'll help you re-theme this commerce site. Let me gather the brand requirements.

[Uses AskUserQuestion to collect brand name, style, colors, fonts, etc.]

Claude: Got it! I'll re-theme the site with:
- Brand: "4MULA"
- Style: Glitch-tech cyber-streetwear
- Colors: void #0a0a0a, neon-cyan #00ffff, etc.
- Fonts: Chakra Petch, Space Grotesk

[Creates todo list with all re-theme tasks]

[Proceeds to update tailwind.config.ts, fonts, env, components]

[Runs validation checks]

Claude: ✅ Re-theme complete! All pages styled with 4MULA branding.
```

---

**Important:** Work through todos sequentially, marking each as completed when done. Keep diffs minimal and focused on styling changes only.
