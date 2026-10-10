# Architecture rules

- `/home` is the canonical testimony stream route; `/feed` remains a compatibility redirect so existing links continue to work.
- Session, admin flag and the guest sign-in prompt come from `AuthProvider` (`useSession().requireAuth()`); every action button calls it so guests stay read-only without per-page auth code.
- Shared page chrome is `PageShell` in `AppNav.tsx` (top nav on desktop, bottom bar on phones); theme preference lives in localStorage and is applied by an inline head script to avoid a flash.
