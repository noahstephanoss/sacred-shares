## Overview

Restyle the "My Journal" and "My Battlefield" tab content areas in the profile page to resemble physical folders or stacks of paper. Each entry card becomes a "page" with layered shadow pages behind it. On hover, the top page lifts slightly with a subtle transform animation.

## Changes

**File: `src/routes/profile.$userId.tsx`**

### Journal tab (lines ~530-556)
- Wrap each journal entry in a container that has 2-3 pseudo-layers behind it (using `::before` and `::after` or stacked `div` elements) to create a "stack of paper" look.
- Style: off-white/cream background, subtle box-shadow, very slight rotation on the back layers (1-2deg) to simulate a messy paper stack.
- On hover: the top card translates up by ~4px and shadow deepens, creating a "lifting" effect via CSS transition.
- Add a thin left-side amber accent (like a folder tab or binding).

### Battlefield tab (lines ~394-428)
- Same stacked-paper treatment as Journal.
- Each archived insight card gets the layered paper look with hover-lift.

### Implementation approach
- Create a reusable `PaperStack` wrapper component (inline in the same file or as a small component) that:
  - Renders a `relative` container with two absolute-positioned "shadow pages" behind the content at slight rotations.
  - Uses `transition-transform` on hover to lift the top layer.
  - Uses the leather-Bible theme colors: cream/ivory card backgrounds, warm shadows, amber folder-tab accent on the left edge.

### CSS details (inline styles or Tailwind)
- Back layers: `rotate(1deg)` and `rotate(-0.5deg)`, slightly offset, same bg with border.
- Top layer: `transition: transform 0.2s ease, box-shadow 0.2s ease`; on hover: `translateY(-4px)` + deeper shadow.
- Left accent: 3px solid amber (`#B8860B`) left border on the top card.

No database changes needed.
