# Remember Me + Email Notifications — Step by Step

Recap of what we're building, based on how your checkboxes map to your DB:

- `remember_me` (checkbox on `signIn.tsx`) → recorded when the user **signs in**.
- `email_notifications` (the `isSubscribed` checkbox on `signUp.tsx`, "I want to receive updates via email.") → recorded when the user **signs up**.
- Favourites/mustWatch → **already** write to the database on every change. No code needed there — see Step 0.

New table: `profiles`, plain boolean columns (not JSONB — these are two flat true/false values known at write time, unlike the flexible `favourites`/`mustWatch`/`reviews` shape in `user_movie_data.data`, which is why *that* column is `jsonb`).

Test after Step 3 (schema) before writing Step 4/5 code — confirms RLS policies work before you build on top of them.

## Step 0 — Confirm favourites already persist (no change needed)

Look at `moviesContext.tsx`. Every mutation already goes through one path:

```
addToFavourites(movie) → persist(nextData) → setMovieData(nextData)  [local state, instant UI]
                                            → saveMovieData(userId, nextData)  [writes to Supabase]
```

`saveMovieData` in `supabase-api.ts` runs `.update({ data, updated_at })` on `user_movie_data` — the whole `favourites`/`mustWatch`/`reviews` document is rewritten on every single change. Same for `addToMustWatch` and `removeFromFavourites`. This is already correct; nothing to fix here.

## Step 1 — Create the `profiles` table

Supabase dashboard → **SQL Editor → New query**:

```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remember_me boolean not null default false,
  email_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "select own profile" on profiles for select using (auth.uid() = user_id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "update own profile" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Same RLS shape as `user_movie_data` — a user can only ever touch the row where `user_id` matches their own `auth.uid()`.

**Test point:** in the Table Editor, try inserting a row manually with a `user_id` that isn't your logged-in user — it should be rejected once RLS is on (or just trust the policies and move on, your call).

## Step 2 — Add a `UserProfile` type

In `src/types/interfaces.ts`, add this near `AuthSession`:

```diff
 export interface AuthSession {
   user: {
     id: string;
     email: string;
   };
   access_token: string;
 }
+
+export interface UserProfile {
+  user_id: string;
+  remember_me: boolean;
+  email_notifications: boolean;
+}
```

## Step 3 — Add profile read/write helpers to `supabase-api.ts`

Same pattern as `fetchMovieData`/`saveMovieData` already in that file — one `upsert` call so you don't need separate insert-vs-update logic (an upsert inserts if the row doesn't exist yet, updates it if it does).

```diff
 import { SignInProps, SignUpProps, AuthSession, Review } from "../types/interfaces";
+import { UserProfile } from "../types/interfaces";
 import { supabase } from "./supabase-client";
```

Add near the bottom of the file, after `saveMovieData`:

```ts
export const upsertProfile = async (
  userId: string,
  changes: Partial<Pick<UserProfile, "remember_me" | "email_notifications">>
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, ...changes, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(error.message);
  }
};
```

`Partial<Pick<...>>` just means: pass only the field(s) you're changing (e.g. `{ remember_me: true }`), the other column keeps its existing/default value on the DB side thanks to `upsert`.

## Step 4 — Record `remember_me` on sign-in

Both `loginUser` and `upsertProfile` already live in the same file (`src/api/supabase-api.ts`) — no new import needed, just call it before returning. `loginUser` currently returns before ever looking at `data.remember_me`:

```diff
 export const loginUser = async (data: SignInProps): Promise<AuthSession> => {
   const { data: authData, error } = await supabase.auth.signInWithPassword({
     email: data.email,
     password: data.password,
   });

   if (error) {
     throw new Error(error.message);
   }
   if (!authData.session || !authData.user) {
     throw new Error("Login failed: no session returned");
   }

+  await upsertProfile(authData.user.id, { remember_me: data.remember_me ?? false });
+
   return {
     user: {
       id: authData.user.id,
       email: authData.user.email ?? "",
     },
     access_token: authData.session.access_token,
   };
 };
```

## Step 5 — Record `email_notifications` on sign-up

Same file, same deal — `registerUser` sits right above `loginUser` in `supabase-api.ts`. It currently discards the response from `supabase.auth.signUp` (only destructures `{ error }`), so there's no `user.id` to attach a profile row to yet. Pull `data` out too:

```diff
 export const registerUser = async (data: SignUpProps): Promise<void> => {
-  const { error } = await supabase.auth.signUp({
+  const { data: authData, error } = await supabase.auth.signUp({
     email: data.email,
     password: data.password,
     options: {
       data: {
         full_name: data.fullName,
         is_subscribed: data.isSubscribed ?? false,
       },
     },
   });
   if (error) {
     throw new Error(error.message);
   }
+  if (authData.user) {
+    await upsertProfile(authData.user.id, { email_notifications: data.isSubscribed ?? false });
+  }
 };
```

The `if (authData.user)` guard matters: if you ever re-enable "Confirm email" in Supabase settings, `signUp` returns a user but no active session until they click the confirmation link — and the `profiles` insert policy requires `auth.uid() = user_id`, which needs a session. With confirmation off (your current dev setting), `authData.user` is populated and there's an active session immediately, so this works as written.

## Step 6 — Test end to end

1. `npm run dev`.
2. Sign up a new user with the "I want to receive updates via email." box **checked**. In Supabase Table Editor → `profiles`, confirm a row exists with `email_notifications = true`.
3. Log out, log back in with "Remember me" **checked**. Confirm the same row now has `remember_me = true`.
4. Log in again with "Remember me" **unchecked**. Confirm it flips back to `false`.
5. Add/remove a favourite, refresh the page, confirm it's still there (this one should already pass — see Step 0).

## What this doesn't do yet

Recording `remember_me` in the database doesn't, by itself, change how long the browser session lasts — that's controlled by Supabase's client-side storage config (`persistSession` / custom storage in `createClient`). Right now you're just storing the user's preference. If you want the checkbox to actually control session length (e.g. unchecked = session-only, cleared on browser close), that's a separate change to `supabase-client.ts` — say the word if you want that tutorial next.
