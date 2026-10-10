# Architecture rules

- `/home` is the canonical testimony stream route; `/feed` remains a compatibility redirect so existing links continue to work.
- Session, admin flag and the guest sign-in prompt come from `AuthProvider` (`useSession().requireAuth()`); every action button calls it so guests stay read-only without per-page auth code.
- Shared page chrome is `PageShell` in `AppNav.tsx` (top nav on desktop, bottom bar on phones); theme preference lives in localStorage and is applied by an inline head script to avoid a flash.
- Home sharing, reaction lists, and daily Scripture use focused modules under `components/home`; shared counting and testimony rules live in `lib/home` so compose and edit enforce the same behavior.
- The daily official Proverbs card derives its chapter from the UTC calendar date using bundled public-domain scripture; admin-only, date-scoped official overrides are stored separately to prevent account impersonation and avoid unnecessary scheduled writes.
- Testimony SELECT uses a restrictive visibility policy alongside existing policies so even administrator reads cannot expose an author's private story.
