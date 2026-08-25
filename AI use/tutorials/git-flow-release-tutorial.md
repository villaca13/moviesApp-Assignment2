# Git Flow Release Tutorial — Step by Step

Mapping git flow onto what you already have: `main` is your Assignment 1 checkpoint (single commit, protected — don't touch it directly) and will become your tagged release line going forward. `develop` is where all your Assignment 2 work already lives (Supabase auth, favourites/reviews, the Vercel fixes). A `release/*` branch is a short-lived branch cut from `develop` used only to stabilize and version-bump before it lands on `main`. No git-flow CLI extension needed — this is the standard manual workflow, same commands either way.

Note: `git flow` (the AVH extension) isn't installed in this repo, so every step below is plain `git`. That's fine — most teams do it this way anyway.

One housekeeping note before you start: there's a stale `.git/index.lock` in your working copy. If you don't have a git GUI, VS Code source control panel, or another terminal mid-operation right now, delete it or your first `git` command below may fail with "another git process seems to be running":

```bash
rm .git/index.lock
```

## Step 1 — Commit your outstanding `develop` work

You've got ~65 modified files on `develop` that aren't committed yet (all the fixes from the last few rounds — Grid v2, `vite-env.d.ts`, the `addReview` signature, etc.). A release branch should be cut from a clean, committed `develop`:

```bash
git add .
git commit -m "fix TypeScript build errors for Vercel deployment"
git push origin develop
```

If you'd rather split this into smaller commits (e.g. one for the Grid migration, one for the unused-var cleanup), that's fine too — just make sure `git status` is clean before Step 2.

## Step 2 — Cut the release branch from `develop`

```bash
git checkout -b release/1.0.0 develop
```

Version number is up to you — `1.0.0` makes sense as your first tagged release since `main` currently only has the untagged Assignment 1 starting point. Everything from here happens on `release/1.0.0`, not on `develop` or `main` directly.

## Step 3 — Bump the version

Edit `package.json`:

```diff
 {
   "name": "moviesapp-ts",
   "private": true,
-  "version": "0.1.0",
+  "version": "1.0.0",
   "type": "module",
```

## Step 4 — Verify the release branch builds clean

```bash
npm run build
```

This is the last checkpoint before merging into `main` — if `tsc` or `vite build` fail here, fix them on `release/1.0.0` before continuing (same process as the last few rounds).

## Step 5 — Commit the version bump

```bash
git add package.json
git commit -m "bump version to 1.0.0"
```

## Step 6 — Merge into `main` and tag

```bash
git checkout main
git merge --no-ff release/1.0.0 -m "release 1.0.0"
git tag -a v1.0.0 -m "Assignment 2 release"
git push origin main --tags
```

`--no-ff` keeps a merge commit even though this could fast-forward — it marks "this is where release 1.0.0 landed" clearly in the history, which is the whole point of git flow. This is the first time `main` moves past the Assignment 1 commit, and it's happening deliberately, with a tag, not by accident.

## Step 7 — Merge back into `develop`

Release branches merge both ways, so `develop` also gets the version bump and stays even with `main`:

```bash
git checkout develop
git merge --no-ff release/1.0.0 -m "merge release 1.0.0 back into develop"
git push origin develop
```

## Step 8 — Clean up the release branch

```bash
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

## Step 9 — Point Vercel back at `main`

Now that `main` actually holds working code (tagged `v1.0.0`), switch Production Branch back: Vercel dashboard → your project → Settings → Git → Production Branch → `main`. This is the proper version of what we almost did by hand earlier — instead of force-merging uncommitted work into `main`, it's now a tagged, reviewed release.

## Going forward

- New work: branch off `develop` as `feature/whatever-it-is`, merge back into `develop` with a PR when done.
- Next release: repeat from Step 2 with a new version (`release/1.1.0`, etc.) once `develop` is ready again.
- If `main` ever needs an urgent fix that can't wait for the next release: `hotfix/*` branched from `main`, merged into both `main` (tag it, e.g. `v1.0.1`) and `develop`.
