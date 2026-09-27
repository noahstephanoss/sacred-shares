# Rename Feed to Home and animate testimony cards

## What will change
- Move the testimony page from `/feed` to `/home` without changing its posting, privacy, editing, deletion, or reading behavior.
- Keep `/feed` as a permanent redirect to `/home`, preserving query details used when writing or opening a testimony.
- Replace user-facing “Feed” wording with “Home” across navigation, page headings, browser/share metadata, buttons, sign-in destinations, Bible sharing, burden-to-testimony links, and the sitemap. Internal database names and unrelated “Community Feed” terminology in Thinkers stay unchanged.
- Restyle testimony cards with slightly roomier spacing, rounded corners, a theme-aware soft shadow, and a subtle hover/tap lift while preserving the existing Private badge.
- Make reaction state and counts update optimistically on tap, add a short pop animation to the selected reaction, and roll the optimistic change back if saving fails.

## Technical details
- Rename the route file to `home.tsx` and use `createFileRoute("/home")`.
- Add a lightweight `feed.tsx` compatibility route whose loader redirects to `/home`, forwarding `burden` and `testimony` query parameters.
- Update all typed links and navigations that currently target `/feed`.
- Use semantic theme colors and CSS transforms/shadows already supported by the design system; respect reduced-motion preferences.
- Verify `/home`, the `/feed` redirect, desktop/mobile card behavior, reaction interaction, private badge appearance, metadata, and the final build.
