
# Testimonies — Full App Plan

## Design
Warm & Reverent: stone/amber palette, serif headings, cream backgrounds, soft shadows.

## Pages & Routes

| Route | Purpose |
|---|---|
| `/` | Landing page with app intro |
| `/login` | Sign in / Sign up |
| `/feed` | Testimony social feed |
| `/thinkers` | Post struggles, get AI attack ratings |
| `/discernment` | Discernment Bot AI chat |
| `/blog` | Blog listing |
| `/blog/$slug` | Single blog post |
| `/blog/new` | Blog creation (admin only) |
| `/profile/$userId` | User profile |
| `/settings` | Account settings |

Protected routes require authentication. Blog creation further gated to admin role.

## Database Tables (Supabase)

**app_role enum**: `'admin'`, `'moderator'`, `'user'`

**profiles** — id (uuid, FK auth.users), display_name, bio, avatar_url, is_public (boolean), created_at

**user_roles** — id (uuid), user_id (uuid, FK auth.users, unique with role), role (app_role), created_at. RLS via `has_role()` security-definer function.

**testimonies** — id, user_id, title, body, is_public, created_at

**testimony_reactions** — id, testimony_id, user_id, type (enum: 'praying', 'amen'), created_at

**testimony_comments** — id, testimony_id, user_id, body, created_at

**thinker_posts** — id, user_id, title, body, attack_rating (int 1-10), ai_analysis (text), created_at

**blog_posts** — id, title, slug (unique), body, excerpt, published (boolean), author_id, created_at, updated_at. Write access restricted to admin role via `has_role()`.

**discernment_conversations** — id, user_id, created_at

**discernment_messages** — id, conversation_id, role ('user'/'assistant'), content, created_at

## Role-Based Access

- `has_role(uuid, app_role)` security-definer function for RLS without recursion
- Default 'user' role assigned on sign-up via trigger
- Blog post insert/update/delete policies use `has_role(auth.uid(), 'admin')`
- Blog "New Post" button hidden client-side for non-admins; enforced server-side via RLS
- Moderators can delete testimonies/comments (future use)

## Discernment Bot — Crisis Detection Layer

The Discernment Bot system prompt will include a **crisis detection priority** that overrides normal spiritual counsel. The prompt structure:

**Priority 1 — Crisis Detection (always evaluated first):**
Before responding to any message, scan for indicators of:
- Self-harm or suicidal ideation (e.g. "I want to end it", "no reason to live", "hurting myself")
- Abuse — physical, sexual, emotional, or domestic (e.g. "he hits me", "I'm being hurt", "no one can know")
- Immediate danger or crisis (e.g. "I don't feel safe", "I can't take this anymore")

When detected, the bot will:
1. Pause all spiritual counsel — no scripture, no prayer, no spiritual framing
2. Acknowledge the person's pain with warmth and without judgment
3. Clearly direct them to real human resources:
   - **988 Suicide & Crisis Lifeline**: Call or text 988 (US)
   - **Crisis Text Line**: Text HOME to 741741
   - **National Domestic Violence Hotline**: 1-800-799-7233
   - **RAINN (sexual assault)**: 1-800-656-4673
   - **Emergency**: Call 911 or local emergency services
4. Encourage them to reach out to a trusted person — pastor, counselor, friend, or family member
5. Only after providing resources, gently affirm that God cares for them and that seeking help is a sign of strength, not weakness

**Priority 2 — Normal Operation (when no crisis detected):**
The bot operates as a stern, biblically grounded counselor that gives righteous counsel rooted in scripture and closes every response with a personalized prayer.

This ensures the bot never spiritualizes a crisis or delays someone from getting real help.

## AI Implementation

Uses Lovable AI Gateway (built-in, no extra key needed) via edge functions:
1. **Discernment Bot** — streaming chat with the crisis-aware system prompt above
2. **Thinkers analysis** — non-streaming call that returns a 1-10 attack rating and brief spiritual analysis
3. Rate limit (429) and credit (402) errors surfaced to the user via toast notifications

## Key Features

### Testimony Feed
- Card-based feed of public testimonies
- Post form: title, body, public/private toggle
- "Praying" and "Amen" reactions, threaded comments

### Thinkers Section
- Post a thought or struggle
- AI returns 1-10 spiritual attack strength rating with analysis
- Rating shown as colored bar (green 1-3, amber 4-6, red 7-10)

### Blog
- Published articles listed with excerpts
- Full article view by slug
- Admin-only creation form (hidden + RLS-enforced)

### Auth & Profiles
- Email/password via Supabase Auth
- Profile + default role created on sign-up
- Public/private profile toggle

## Technical Details
- TanStack Start with file-based routing
- Supabase for auth, database, RLS
- Edge functions for AI calls to Lovable AI Gateway
- Server functions for data access
- Tailwind CSS with warm design tokens (stone-800, amber accents, cream backgrounds, serif headings)
- Mobile-responsive with bottom nav on small screens
