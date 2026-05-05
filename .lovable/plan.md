
## Overview

Rebuild the settings page into three card-based sections with Georgia serif headings and amber dividers. Add avatar upload via storage bucket, profile visibility toggle, theme persistence, and account management (password reset, account deletion).

## Database Changes

1. **Add `theme_preference` column to `profiles`** — `TEXT NOT NULL DEFAULT 'light'` with check constraint for `'light'` or `'dark'`.

2. **Create `avatars` storage bucket** — public bucket for avatar images. RLS policies:
   - Authenticated users can upload to their own folder (`user_id/`)
   - Anyone can read (public bucket)
   - Users can update/delete their own files

## Frontend Changes

**Rebuild `src/routes/settings.tsx`** with three sections:

### Section 1 — Profile (card)
- Circular avatar upload area showing current avatar or initials
- File picker for jpg/png, uploads to `avatars` bucket at `{userId}/avatar.{ext}`
- Saves public URL to `profiles.avatar_url`
- Upload progress indicator
- Display name and bio fields (existing)
- "Public Profile" toggle with description, saves to `profiles.is_public`
- Save button at bottom of this section only

### Section 2 — Appearance (card)
- Light/Dark mode toggle, saves immediately
- Updates `profiles.theme_preference` and syncs with existing localStorage/class-based theme system
- On page load, reads saved preference from profile and applies it

### Section 3 — Account (card)
- Read-only email display from auth user
- "Change Password" button — calls `supabase.auth.resetPasswordForEmail()`, shows confirmation message
- Danger zone with red "Delete Account" button
- Confirmation modal with warning text, Cancel and Delete buttons
- On confirm, deletes user via `supabase.rpc` or admin endpoint (will use a server function with `supabaseAdmin.auth.admin.deleteUser()`)

## Server Function

**Create `src/server/account.functions.ts`** — a `deleteAccount` server function using `requireSupabaseAuth` middleware that calls `supabaseAdmin.auth.admin.deleteUser(userId)` to delete the authenticated user. This ensures secure server-side deletion.

## Theme Sync

Update `AppNav.tsx` (or a shared hook) to load `theme_preference` from the profile on auth state change and apply it, so the saved preference takes effect on login across devices.
