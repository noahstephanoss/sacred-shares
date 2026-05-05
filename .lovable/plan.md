
## Overview

Add three writing modes (Journal, Draft, Post) to the Thinkers page, replacing the current implicit "always public" behavior. Drafts can be promoted to public posts from the profile page. Journals stay private forever.

## Database Migration

Add two columns to `thinker_posts`:
- `post_type TEXT NOT NULL DEFAULT 'post' CHECK (post_type IN ('journal', 'draft', 'post'))`
- `title TEXT` (nullable, used for journal entries)

Add an RLS UPDATE policy so users can update their own posts (needed for draft promotion):
```sql
CREATE POLICY "Users can update own posts"
ON public.thinker_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Thinkers Page Changes (`src/routes/thinkers.tsx`)

1. **Writing mode selector**: Add three pill buttons above the form: "Journal", "Draft", "Post". Default to "Post" (current behavior).

2. **Form behavior per mode**:
   - **Journal**: Show title input + body textarea. Hide tags, AI button, and scripture suggestions. On submit, save with `post_type='journal'`, `is_public=false`. Skip AI analysis and daily limit increment.
   - **Draft**: Show body + tags + AI analysis button (current form minus nothing). Save with `post_type='draft'`, `is_public=false`.
   - **Post**: Current full experience unchanged. Save with `post_type='post'`, `is_public=true`.

3. **Community feed query**: Filter to only show `post_type='post'` AND `is_public=true`.

## Profile Page Changes (`src/routes/profile.$userId.tsx`)

1. Add a **"My Drafts"** and **"My Journal"** tabs (alongside existing Profile and Battlefield tabs) visible only on own profile.

2. **Drafts tab**: List user's drafts. Each card shows body, tags, AI analysis, attack rating, and a **"Make Public"** button. Clicking it updates the post to `post_type='post'`, `is_public=true`, shows a toast: "Your thought is now shared with the community."

3. **Journal tab**: List user's journal entries showing title + body + date. No "Make Public" button ever appears.

## Technical Details

- Update the `FeedPost` type to include `post_type` and `title` fields
- The feed query adds `.eq("post_type", "post").eq("is_public", true)`
- Draft promotion uses `supabase.from("thinker_posts").update({ post_type: "post", is_public: true }).eq("id", postId).eq("user_id", userId)`
- Use sonner toast for the promotion confirmation message
