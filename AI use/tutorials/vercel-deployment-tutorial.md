# Vercel Deployment Tutorial — Step by Step

Your app is Vite + React + TS, using client-side routing (`react-router-dom`) and three env vars (`VITE_TMDB_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) from `.env`. Vercel builds fine out of the box, but two things need attention: env vars must be re-entered in the Vercel dashboard (`.env` is gitignored, so it never reaches Vercel), and a rewrite rule is needed so client-side routes don't 404 on refresh.

Files by the end: new `vercel.json` at the project root. Everything else is dashboard config, no other code changes.

## Step 1 — Push your code to GitHub

Vercel deploys from a Git repo. You're already on `origin` at `github.com/villaca13/moviesApp-Assignment2`, branch `develop`. Commit and push whatever branch you want deployed:

```bash
git add .
git commit -m "prep for vercel deployment"
git push origin develop
```

(You currently have a lot of uncommitted changes — commit or stash them before deploying so Vercel builds what you expect.)

## Step 2 — New file: `vercel.json`

Without this, hitting a route directly (e.g. `yoursite.vercel.app/movie/123`) or refreshing on one returns a 404, because Vercel tries to find a physical file at that path instead of letting `react-router-dom` handle it client-side.

Create `vercel.json` at the project root (same level as `package.json`):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This tells Vercel: for any path, serve `index.html` and let React Router take over.

## Step 3 — Import the project on Vercel

1. Go to vercel.com → log in with GitHub → **Add New... → Project**.
2. Select `villaca13/moviesApp-Assignment2` from the repo list.
3. Vercel auto-detects **Vite** as the framework. Confirm these build settings (should be prefilled):
   - **Build Command**: `npm run build` (this runs `tsc && vite build` per your `package.json`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Don't click Deploy yet — go to Step 4 first to add env vars, or the first build will fail/build without your API keys.

## Step 4 — Add environment variables

In the same import screen (or later under **Project → Settings → Environment Variables**), add:

| Name | Value | Environments |
|---|---|---|
| `VITE_TMDB_KEY` | your TMDB key | Production, Preview, Development |
| `VITE_SUPABASE_URL` | your Supabase project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key | Production, Preview, Development |

Copy the actual values from your local `.env` file. Check all three environment checkboxes so preview deployments (PRs, other branches) also work.

Vite only exposes vars prefixed `VITE_` to the client bundle — since yours already are, no renaming needed.

## Step 5 — Deploy

Click **Deploy**. Vercel will run `npm install`, then `npm run build`, then serve `dist/`. First build takes a couple minutes (TypeScript compile + Vite build + your dependency list, which is sizeable with MUI + Storybook).

## Step 6 — Verify

Once deployed:

1. Open the given `*.vercel.app` URL.
2. Navigate to a nested route (e.g. a movie details page), then hit browser refresh — it should still load (confirms `vercel.json` rewrite is working, not a 404).
3. Try signing in/up — confirms Supabase env vars made it into the build.
4. Check that movie data loads — confirms the TMDB key made it into the build.

## Step 7 — Supabase auth redirect (if using email confirmation or OAuth)

If you turned "Confirm email" back on, or use Google OAuth (per your `google-oauth-login-tutorial.md`), Supabase needs to know about the new Vercel URL:

1. Supabase dashboard → **Authentication → URL Configuration**.
2. Add your Vercel URL (e.g. `https://moviesapp-assignment2.vercel.app`) to **Site URL** and **Redirect URLs**.

Without this, email confirmation links or the OAuth callback will redirect back to `localhost` instead of your deployed site.

## Notes

- Every push to `develop` (or whichever branch you connect) triggers an automatic redeploy.
- Pushes to other branches / PRs get their own preview URL with the same env vars, useful for testing before merging.
- If the build fails on `tsc` errors that don't show locally, run `npm run build` locally first to reproduce — Vercel's build is just running that same script.

## Troubleshooting: first build failed with `tsc` errors

Your first deploy failed with 16 TypeScript errors. Two things going on:

**1. Branch mismatch.** The log said `Cloning ... (Branch: main, Commit: 9c62273 "Initial Commit - Starting point is from end of assignment 1")`. Vercel's Production Branch is set to `main`, which still holds your bare Assignment 1 code — none of your Supabase/OAuth/movie-card work is on it (that's all sitting uncommitted, or on `develop`/`feature/vercel_deployment`). Fix this once, separately from the code fixes below: either push your real branch and `git checkout main && git merge develop` (or whichever branch has your current work) then push `main`, **or** go to Vercel → Project Settings → Git → change the Production Branch to `develop`. Otherwise you'll keep debugging errors in code you've already replaced.

**2. Real `tsc` errors**, all because `vite dev` never runs `tsc` — it just transpiles, so these have been silently sitting in the code and only surface at build/deploy time. Two are root causes worth fixing regardless of which branch you land on, since they'll follow your code wherever it goes:

### Fix A — missing `src/vite-env.d.ts`

This file is normally scaffolded by `npm create vite` and is what tells TypeScript `import.meta.env` exists (the type comes from the Vite client types, not from `@types/node` or anything in your own code). It's missing from this project — that's why every `import.meta.env.VITE_TMDB_KEY` reference errors with `Property 'env' does not exist on type 'ImportMeta'` (6 of your 16 errors, all in `src/api/tmdb-api.ts`; the same will happen in `supabase-client.ts` on your real branch).

Create a **new file** `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

That's the whole file — one triple-slash directive. It pulls in Vite's `ImportMetaEnv` typings.

### Fix B — `lodash/truncate` deep import not resolving (`src/util.ts`)

```diff
- import truncate from "lodash/truncate";
+ import { truncate } from "lodash";
```

With `"moduleResolution": "bundler"` in your `tsconfig.json`, deep subpath imports into `@types/lodash` (e.g. `lodash/truncate`) don't reliably resolve even though the `.d.ts` file is physically there — a known friction point with that resolution mode. Importing the named export from the package root instead sidesteps it; `truncate(...)` is called the same way after this change.

### Fix C — genuinely unused declarations (`noUnusedLocals`/`noUnusedParameters`)

Your `tsconfig.json` has both flags set to `true`, so leftover unused imports/consts fail the build (they wouldn't in a looser config). The remaining 9 errors on `main` are all this — same pattern will show up on your real branch, just in different spots. Example of the pattern, from `src/components/movieCard/index.tsx`:

```diff
- const handleAddToFavourite = (e: MouseEvent<HTMLButtonElement>) => {//NEW
-   e.preventDefault();
-   addToFavourites(movie);
- };
-
  return (
```

(`handleAddToFavourite` was never wired to an `onClick` — favouriting happens through the `action` prop / `AddToFavouritesIcon` instead, so the whole block is dead.)

Same idea for the others reported on `main`:
- `src/index.tsx` — drop the unused `Link` from the `react-router-dom` import.
- `src/pages/addMovieReviewPage.tsx` — drop the unused `BaseMovieProps` from the `../types/interfaces` import.
- `src/pages/homePage.tsx` — delete the unused `const addToFavourites = (movieId: number) => true;` line (despite the "necessary to avoid app crashing" comment above it, nothing in the file calls it).
- `src/stories/movieCard.stories.tsx` — drop unused `action` and `React` imports.
- `src/stories/movieList.stories.tsx` — drop unused `StoryObj` from the `@storybook/react` import.
- `src/stories/movieListHeader.stories.tsx` — drop unused `React` import.

For each: either delete the whole `import`/`const` if nothing else in the file uses it, or wire it up if you actually meant to use it. `noUnusedLocals` only complains about the declaration, so once removed there's nothing else to change.

### Step D — verify before pushing again

```bash
npm run build
```

Run this locally on whichever branch you're about to deploy. It runs the exact same `tsc && vite build` Vercel runs — a clean exit means Vercel's build will pass too. Since your real branch has far more code than `main` (Supabase, OAuth, MUI components), expect a different — likely longer — error list than the 16 above; work through it with the same two patterns (missing types / unused declarations).

One thing to watch for on your real branch specifically: `src/api/auth-api.ts` has a local `AuthSession`-typed object being built with only `{ email, token }` while the type also requires `user` and `access_token` — leftover from before the Supabase migration, worth checking whether that function is still used at all. And your `@mui/material` version uses the newer Grid API (`size={6}` instead of the old `item xs={6}` props) — components like `movieCard`, `movieList`, and `templateMovieListPage` still use the old prop shape and will need updating to match.

## Troubleshooting round 2 — your real branch, 28 errors

You ran `npm run build` on `feature/vercel_deployment` as suggested — good, this is the actual branch you need clean before deploying. `vite-env.d.ts` and the `lodash` import aren't in this list anymore, so those two fixes already landed. Here's what's left, grouped the same way.

### Fix A (still outstanding) — `src/vite-env.d.ts`

Accounts for 8 of the 28 (`src/api/tmdb-api.ts` x6, `src/api/supabase-client.ts` x2). Same fix as before — create the file if you haven't yet:

```ts
/// <reference types="vite/client" />
```

### Fix E — dead code in `src/api/auth-api.ts` (2 errors)

```
src/api/auth-api.ts:58 — Argument of type '{ email: string; token: string; }' is not assignable to parameter of type 'AuthSession'.
```

`AuthSession` (in `src/types/interfaces.ts`) was reshaped to match Supabase's session object (`{ user: { id, email }, access_token }`) at some point, but `loginUser`'s local implementation still builds the old `{ email, token }` shape. I checked and nothing else in `src` imports `loginUser`, `getSession`, or `saveSession` from this file anymore — auth now goes through Supabase (`authContext.tsx` / `supabase-api.ts`). So this file is dead code left over from before the migration, but TypeScript still type-checks it since it's part of `src`.

Two ways to clear it, your call:
- **Delete `src/api/auth-api.ts`** if you're confident nothing needs it (confirmed: nothing currently imports from it).
- Or, if you want to keep it around for reference, update the object literal in `loginUser` to match the current `AuthSession` shape — but note it'll still be dead code either way since nothing calls it.

### Fix F — `src/components/forgotPassword/index.tsx:23` (1 error)

`React.SubmitEvent` isn't a real React type — likely meant to be `React.FormEvent`:

```diff
-  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => {
+  onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
```

### Fix G — MUI Grid v2 API (7 errors, 4 files)

Your installed `@mui/material` uses the newer unified Grid, which dropped the `item` boolean prop and replaced the per-breakpoint props (`xs`, `sm`, `md`, `lg`, `xl`) with a single `size` prop. `container` is unchanged.

`src/components/movieCard/index.tsx` (two Grids, same fix twice):

```diff
-          <Grid item xs={6}>
+          <Grid size={6}>
```

`src/components/movieList/index.tsx:9` — multiple breakpoints collapse into one `size` object:

```diff
-    <Grid key={m.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
+    <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
```

`src/components/templateMovieListPage/index.tsx:16` and `:19`:

```diff
-      <Grid item xs={12}>
+      <Grid size={12}>
         <Header title={title} />
       </Grid>
-      <Grid item container spacing={5}>
+      <Grid container spacing={5}>
```

`src/components/templateMoviePage/index.tsx:51` and `:70`:

```diff
-                <Grid item xs={3}>
+                <Grid size={3}>
...
-                <Grid item xs={9}>
+                <Grid size={9}>
```

### Fix H — remaining unused declarations (9 errors)

Same `noUnusedLocals`/`noUnusedParameters` pattern as before, in new spots:

- `src/components/movieCard/index.tsx:1` — you already removed `handleAddToFavourite` (nice, that worked), which leaves the `MouseEvent` import unused:
  ```diff
  - import React, {MouseEvent, useContext} from "react";
  + import React, {useContext} from "react";
  ```
- `src/index.tsx:3` — drop `Link` from the `react-router-dom` import.
- `src/pages/addMovieReviewPage.tsx:8` — drop `BaseMovieProps` from the `../types/interfaces` import.
- `src/pages/homePage.tsx:55` — this one's still there from last round: delete `const addToFavourites = (movieId: number) => true;`.
- `src/stories/movieCard.stories.tsx:6,8` — drop the unused `action` and `React` imports.
- `src/stories/movieList.stories.tsx:2` — drop unused `StoryObj` from the `@storybook/react` import.
- `src/stories/movieListHeader.stories.tsx:5` — drop unused `React` import.

One of these is worth a second look rather than a blind delete — `src/contexts/moviesContext.tsx:83`:

```ts
const addReview = useCallback(
  (movie: BaseMovieProps, review: Review) => {
    persist({ ...movieData, reviews: [...movieData.reviews, review] });
  },
  [movieData, persist]
);
```

`movie` can't just be deleted — `addReview`'s type in the context interface is `(movie: BaseMovieProps, review: Review) => void`, and the caller (`src/components/reviewForm/index.tsx:52`) passes both `movie` and `review`, so the parameter has to stay for the signature to line up. Two options:
- If it's genuinely not needed yet, prefix it to `_movie` — TypeScript's `noUnusedParameters` ignores anything starting with `_`, by convention meaning "intentionally unused."
- Worth checking though: the pushed `review` object doesn't seem to record which movie it's for anywhere in `persist(...)`. If reviews are meant to be per-movie, this might be a real gap rather than just an unused param — e.g. tagging the review with `movie.id` before pushing it. Your call on whether that's in scope right now.

### Step I — rebuild and push

```bash
npm run build
```

Once this exits clean, commit and push to whichever branch Vercel's Production Branch is set to (see the branch-mismatch note above — make sure that's sorted, or you'll be fixing the same errors against the wrong branch again).

## Troubleshooting round 3 — down to 9, on `develop`

Big drop — from 28 to 9. All the Grid, `auth-api.ts`, `SubmitEvent`, and other unused-import fixes landed. Two things left, both already covered above, just restating since they're the last ones standing:

1. **`src/vite-env.d.ts` still doesn't exist** (8 of the 9 errors — all the `import.meta.env` ones in `tmdb-api.ts` and `supabase-client.ts`). This is Fix A from round 1 — create the file:
   ```ts
   /// <reference types="vite/client" />
   ```
   One line, new file, project root of `src/`. This one keeps resurfacing because it hasn't been created yet on whichever branch you're building — worth double-checking it's actually saved and not, say, gitignored or in the wrong folder.

2. **`src/contexts/moviesContext.tsx:83`** — the `movie` param on `addReview`, per the Fix H note above: either prefix `_movie` if intentionally unused for now, or use `movie.id` to tag the review if that's meant to be tracked.

Once both are in, `npm run build` should exit clean.
