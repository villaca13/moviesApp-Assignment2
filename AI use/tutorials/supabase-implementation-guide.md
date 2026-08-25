# Supabase Implementation Guide — moviesApp-Assignment2

This guide maps Supabase onto your existing structure: it replaces the localStorage-backed `auth-api.ts` / `authContext.tsx` with real Supabase Auth, and replaces the in-memory `favourites` / `mustWatch` / `reviews` state in `moviesContext.tsx` with Postgres tables scoped to the logged-in user. Write the code yourself — this is the roadmap, not the diff.

## 1. Create the Supabase project

1. Go to supabase.com, create an account, create a new project (pick a region close to Ireland, e.g. `eu-west-1`/London).
2. In **Project Settings → API**, copy the **Project URL** and the **anon/public key**. You'll need both — never use the `service_role` key in frontend code.
3. In **Authentication → Providers**, confirm Email is enabled. For an assignment, you can turn off "Confirm email" under **Authentication → Settings** so signup doesn't require clicking a verification link (re-enable for anything real).

## 2. Install and configure the client

```
npm install @supabase/supabase-js
```

Add to `.env` (alongside your existing `VITE_TMDB_KEY`):

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Vite only exposes env vars prefixed `VITE_` to client code, same pattern you're already using for TMDB. `.env` is already gitignored — double check the Supabase keys land there too, not in `globals.d.ts` or committed config.

Create a single Supabase client instance (e.g. `src/api/supabase-client.ts`) using `createClient(url, anonKey)`, and import that one instance everywhere instead of constructing new clients per file — this is exactly the pattern you already followed by centralizing storage keys in `auth-api.ts`.

## 3. Design the database schema

Supabase gives you `auth.users` for free — you don't create a users table yourself. Your three domain concepts (`favourites`, `mustWatch`, `reviews`) become three tables, each with a `user_id` foreign key to `auth.users.id`.

**`favourites`**
- `id` bigint, primary key, identity
- `user_id` uuid, references `auth.users(id)`, not null
- `movie_id` int, not null
- `created_at` timestamptz, default `now()`
- unique constraint on `(user_id, movie_id)` — mirrors the `includes` check currently in `addToFavourites`

**`must_watch`** — same shape as `favourites`.

**`reviews`** — matches your `Review` interface (`author`, `content`, `agree`, `rating`, `movieId`):
- `id` bigint, primary key, identity
- `user_id` uuid, references `auth.users(id)`, not null
- `movie_id` int, not null
- `content` text, not null
- `agree` boolean, not null
- `rating` int, not null
- `created_at` timestamptz, default `now()`

Note `author` disappears as a column — once auth is real, you derive the author from the logged-in user (`auth.users.email` or a display name) rather than storing it freehand per review.

You can create these via the Table Editor UI or SQL Editor. For a course project, SQL Editor + saving your `.sql` file in the repo is worth doing so you have a record of the schema for your submission.

## 4. Lock it down with Row Level Security

RLS is Supabase's core security model: without it, the anon key can read/write every row for every user. Enable RLS on all three tables, then add policies so a user can only touch their own rows:

- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `WITH CHECK (auth.uid() = user_id)`
- `DELETE`: `auth.uid() = user_id`

This is the Postgres-level equivalent of what `loginUser`/`getSession` currently do by convention in `auth-api.ts` — except enforced by the database itself, not by trusting the client.

## 5. Replace `auth-api.ts`

Your current functions map fairly directly:

| Current (localStorage) | Supabase equivalent |
|---|---|
| `registerUser` | `supabase.auth.signUp({ email, password })` |
| `loginUser` | `supabase.auth.signInWithPassword({ email, password })` |
| `getSession` | `supabase.auth.getSession()` |
| `logoutUser` | `supabase.auth.signOut()` |
| `saveSession` | not needed — Supabase persists the session in localStorage itself |

Two structural differences to plan for:

- **`AuthSession` shape changes.** Supabase's session has `user.id` (a uuid you'll need as `user_id` for the tables above), `user.email`, and `access_token` — not the flat `{ email, token }` shape in your `interfaces.ts`. You'll want to update that interface or map the Supabase session onto it.
- **Auth state is asynchronous and event-driven.** Instead of reading a value once on mount like `getSession()` does today, subscribe with `supabase.auth.onAuthStateChange((event, session) => ...)` inside `AuthContextProvider` so `user`/`token` state in `authContext.tsx` stays in sync if the session refreshes or expires in another tab.

`SignUpProps.fullName` and `isSubscribed` have no home in `auth.users` by default — either drop them for now, or store them in `user_metadata` when calling `signUp`, or create a separate `profiles` table keyed by `user_id` if you want them queryable.

## 6. Replace the in-memory state in `moviesContext.tsx`

Right now `favourites`, `mustWatch`, and `myReviews` live only in React state and vanish on refresh — worth noting `addReview`'s current implementation (`setMyReviews({...myReviews, [movie.id]: review})`) is also a bug independent of Supabase, since `myReviews` is declared as an array but spread as an object.

The shape of the migration:

- On mount (once a user is logged in), fetch that user's rows from `favourites`, `must_watch`, `reviews` filtered by `user_id = session.user.id`, and use them to seed context state.
- `addToFavourites` / `addToMustWatch` become `insert` calls; `removeFromFavourites` becomes a `delete` call matching `user_id` + `movie_id`.
- `addReview` becomes an `insert` into `reviews`.
- Since `react-query` is already a dependency, this is a good fit for `useQuery`/`useMutation` instead of raw `useState` + manual fetch-on-mount — it gives you caching and refetch-on-mutation for free, consistent with how `tmdb-api.ts` calls are already wired into pages via `useQuery`.

## 7. Suggested build order

1. Wire up the Supabase client and confirm `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` load correctly.
2. Migrate auth end-to-end first (signup, login, logout, session persistence) — everything else depends on having a real `user_id`.
3. Create and RLS-lock the three tables in Supabase directly (SQL Editor), test policies with the Table Editor before touching frontend code.
4. Migrate `favourites`/`mustWatch` (simpler, no form) before `reviews` (goes through `reviewForm`/`addMovieReviewPage.tsx`).
5. Manually re-test: sign up as user A, add favourites, log out, sign up as user B, confirm user B sees none of user A's data — that's your RLS check.

## 8. Reference docs

- [supabase-js `signUp`](https://supabase.com/docs/reference/javascript/auth-signup)
- [supabase-js `signInWithPassword`](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [supabase-js `onAuthStateChange`](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
