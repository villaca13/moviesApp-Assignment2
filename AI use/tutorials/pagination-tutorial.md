# Adding Pagination — Step by Step

## Where pagination fits today

`getMovies` and `getUpcomingMovies` in `src/api/tmdb-api.ts` are both hardcoded to `page=1`. TMDB's response already carries everything needed for pagination — `page`, `total_pages`, `total_results` — and your `DiscoverMovies`/`UpcomingMovies` interfaces in `src/types/interfaces.ts` already declare those fields. Nothing is using them yet.

`homePage.tsx` and `upcomingMoviesPage.tsx` both follow the same shape: a `useQuery` call with a fixed key (`"discover"` / `"upcoming"`), filtered client-side, rendered through `PageTemplate` (`templateMovieListPage`). We'll touch both pages the same way, plus the shared template.

## What changes

1. `src/api/tmdb-api.ts` — `getMovies` and `getUpcomingMovies` accept a `page` argument.
2. `src/types/interfaces.ts` — `MovieListPageTemplateProps` gains optional `page`, `totalPages`, `onPageChange`.
3. `src/components/templateMovieListPage/index.tsx` — renders an MUI `Pagination` control under the grid.
4. `src/pages/homePage.tsx` — tracks `page` in state, includes it in the query key, wires it to the template.
5. `src/pages/upcomingMoviesPage.tsx` — same as step 4.

Test after step 4 (Discover page) before touching step 5 — if it works there, Upcoming is a copy-paste of the same pattern.

---

## Step 1 — `src/api/tmdb-api.ts`: accept a page number

Currently:

```ts
export const getMovies = () => {
  return fetch(
    `https://api.themoviedb.org/3/discover/movie?api_key=${import.meta.env.VITE_TMDB_KEY}&language=en-US&include_adult=false&include_video=false&page=1`
  ).then((response) => {
```

Change to:

```diff
-export const getMovies = () => {
+export const getMovies = (page: number = 1) => {
   return fetch(
-    `https://api.themoviedb.org/3/discover/movie?api_key=${import.meta.env.VITE_TMDB_KEY}&language=en-US&include_adult=false&include_video=false&page=1`
+    `https://api.themoviedb.org/3/discover/movie?api_key=${import.meta.env.VITE_TMDB_KEY}&language=en-US&include_adult=false&include_video=false&page=${page}`
   ).then((response) => {
```

Do the same to `getUpcomingMovies` further down the file:

```diff
-export const getUpcomingMovies = () => {
+export const getUpcomingMovies = (page: number = 1) => {
     return fetch(
-      `https://api.themoviedb.org/3/movie/upcoming?api_key=${import.meta.env.VITE_TMDB_KEY}&language=en-US&page=1`
+      `https://api.themoviedb.org/3/movie/upcoming?api_key=${import.meta.env.VITE_TMDB_KEY}&language=en-US&page=${page}`
     ).then((response) => {
```

Leave everything else in the file (error handling, `getMovie`, `getGenres`, etc.) untouched.

---

## Step 2 — `src/types/interfaces.ts`: extend the template props

Find:

```ts
export type FilterOption = "title" | "genre";
export interface MovieListPageTemplateProps extends BaseMovieListProps {
  title: string;
}
```

Change to:

```diff
 export type FilterOption = "title" | "genre";
 export interface MovieListPageTemplateProps extends BaseMovieListProps {
   title: string;
+  page?: number;
+  totalPages?: number;
+  onPageChange?: (page: number) => void;
 }
```

Made optional (`?`) so anything that renders `MovieListPageTemplate` without pagination props (there's currently nothing else that does, but keep it future-proof) still compiles without changes.

---

## Step 3 — `src/components/templateMovieListPage/index.tsx`: render the control

Current file:

```tsx
import React from "react";
import Header from "../headerMovieList";
import Grid from "@mui/material/Grid";
import MovieList from "../movieList";
import {  MovieListPageTemplateProps} from "../../types/interfaces";

const styles = {
  root: { 
    backgroundColor: "#bfbfbf",
  }
};

const MovieListPageTemplate: React.FC<MovieListPageTemplateProps> = ({ movies, title, action })=> {
  return (
    <Grid container sx={styles.root}>
      <Grid size={12}>
        <Header title={title} />
      </Grid>
      <Grid container spacing={5}>
        <MovieList action={action} movies={movies}></MovieList>
      </Grid>
    </Grid>
  );
}
export default MovieListPageTemplate;
```

Diff:

```diff
 import React from "react";
 import Header from "../headerMovieList";
 import Grid from "@mui/material/Grid";
 import MovieList from "../movieList";
+import Pagination from "@mui/material/Pagination";
 import {  MovieListPageTemplateProps} from "../../types/interfaces";

 const styles = {
   root: { 
     backgroundColor: "#bfbfbf",
-  }
+  },
+  pagination: {
+    display: "flex",
+    justifyContent: "center",
+    padding: 2,
+  },
 };

-const MovieListPageTemplate: React.FC<MovieListPageTemplateProps> = ({ movies, title, action })=> {
+const MovieListPageTemplate: React.FC<MovieListPageTemplateProps> = ({ movies, title, action, page, totalPages, onPageChange })=> {
   return (
     <Grid container sx={styles.root}>
       <Grid size={12}>
         <Header title={title} />
       </Grid>
       <Grid container spacing={5}>
         <MovieList action={action} movies={movies}></MovieList>
       </Grid>
+      {totalPages && totalPages > 1 && (
+        <Grid size={12} sx={styles.pagination}>
+          <Pagination
+            count={totalPages}
+            page={page}
+            onChange={(_, value) => onPageChange && onPageChange(value)}
+            color="primary"
+          />
+        </Grid>
+      )}
     </Grid>
   );
 }
 export default MovieListPageTemplate;
```

The `totalPages && totalPages > 1` guard means the control simply doesn't render on pages/stories that don't pass pagination props — nothing else needs to change.

---

## Step 4 — `src/pages/homePage.tsx`: drive it from state

Current relevant lines:

```tsx
import React from "react";
...
const HomePage: React.FC = () => {
  const { data, error, isLoading, isError } = useQuery<DiscoverMovies, Error>("discover", getMovies);
  const { filterValues, setFilterValues, filterFunction } = useFiltering(
    [titleFiltering, genreFiltering]
  );
```

and the render:

```tsx
      <PageTemplate
        title="Discover Movies"
        movies={displayedMovies}
        action={(movie: BaseMovieProps) => {
          return <AddToFavouritesIcon {...movie} />
        }}
      />
```

Diff:

```diff
-import React from "react";
+import React, { useState } from "react";
 import PageTemplate from "../components/templateMovieListPage";
 import { getMovies } from "../api/tmdb-api";
 ...
 const HomePage: React.FC = () => {
-  const { data, error, isLoading, isError } = useQuery<DiscoverMovies, Error>("discover", getMovies);
+  const [page, setPage] = useState(1);
+  const { data, error, isLoading, isError } = useQuery<DiscoverMovies, Error>(
+    ["discover", page],
+    () => getMovies(page)
+  );
   const { filterValues, setFilterValues, filterFunction } = useFiltering(
     [titleFiltering, genreFiltering]
   );
```

And the render:

```diff
       <PageTemplate
         title="Discover Movies"
         movies={displayedMovies}
+        page={page}
+        totalPages={data ? data.total_pages : 1}
+        onPageChange={setPage}
         action={(movie: BaseMovieProps) => {
           return <AddToFavouritesIcon {...movie} />
         }}
       />
```

Why the query key changes to `["discover", page]`: react-query caches results by key. With a fixed `"discover"` key, changing `page` would never trigger a refetch — react-query would just keep serving the cached page-1 response. Including `page` in the key makes each page its own cache entry, and switching between visited pages is instant (no refetch) because it's already cached.

Run it, click through pages 1–3, confirm the grid updates and the pagination control tracks the active page.

---

## Step 5 — `src/pages/upcomingMoviesPage.tsx`: same pattern

Same four edits, mirrored:

```diff
-import React from "react";
+import React, { useState } from "react";
 import PageTemplate from "../components/templateMovieListPage";
 import { getUpcomingMovies } from "../api/tmdb-api";
 ...
 const UpcomingMoviesPage: React.FC = () => {
-  const { data, error, isLoading, isError } = useQuery<UpcomingMovies, Error>("upcoming", getUpcomingMovies);
+  const [page, setPage] = useState(1);
+  const { data, error, isLoading, isError } = useQuery<UpcomingMovies, Error>(
+    ["upcoming", page],
+    () => getUpcomingMovies(page)
+  );
   const { filterValues, setFilterValues, filterFunction } = useFiltering(
     [titleFiltering, genreFiltering]
   );
```

```diff
       <PageTemplate
         title="Upcoming Movies"
         movies={displayedMovies}
+        page={page}
+        totalPages={data ? data.total_pages : 1}
+        onPageChange={setPage}
         action={(movie: BaseMovieProps) => {
           return <AddToPlaylistIcon {...movie} />
         }}
       />
```

---

---

## Step 6 — Wire the header arrows to the same page state

`src/components/headerMovieList/index.tsx` has two `IconButton`s (`ArrowBackIcon`/`ArrowForwardIcon`) that are currently decorative — no `onClick`, nothing happens. They should move the same `page` that the `Pagination` control drives.

Current file:

```tsx
interface HeaderProps {
    title: string;
}

const Header: React.FC<HeaderProps> = (headerProps) => {
    const title = headerProps.title

    return (
        <Paper component="div" sx={styles.root}>
            <IconButton
                aria-label="go back"
            >
                <ArrowBackIcon color="primary" fontSize="large" />
            </IconButton>

            <Typography variant="h4" component="h3">
                {title}
            </Typography>
            <IconButton
                aria-label="go forward"
            >
                <ArrowForwardIcon color="primary" fontSize="large" />
            </IconButton>
        </Paper>
    );
};
```

Diff:

```diff
 interface HeaderProps {
     title: string;
+    page?: number;
+    totalPages?: number;
+    onPageChange?: (page: number) => void;
 }

 const Header: React.FC<HeaderProps> = (headerProps) => {
-    const title = headerProps.title
+    const { title, page, totalPages, onPageChange } = headerProps;
+
+    const canGoBack = !!onPageChange && !!page && page > 1;
+    const canGoForward = !!onPageChange && !!page && !!totalPages && page < totalPages;

     return (
         <Paper component="div" sx={styles.root}>
             <IconButton
                 aria-label="go back"
+                disabled={!canGoBack}
+                onClick={() => page && onPageChange && onPageChange(page - 1)}
             >
                 <ArrowBackIcon color="primary" fontSize="large" />
             </IconButton>

             <Typography variant="h4" component="h3">
                 {title}
             </Typography>
             <IconButton
                 aria-label="go forward"
+                disabled={!canGoForward}
+                onClick={() => page && onPageChange && onPageChange(page + 1)}
             >
                 <ArrowForwardIcon color="primary" fontSize="large" />
             </IconButton>
         </Paper>
     );
 };
```

`canGoBack`/`canGoForward` disable the buttons at the boundaries (page 1, last page) and when no `onPageChange` was passed at all — same defensive pattern as the `Pagination` guard in step 3.

---

## Step 7 — Pass the page props down from the template

`headerMovieList` only gets `title` today. `templateMovieListPage/index.tsx` already receives `page`, `totalPages`, `onPageChange` (step 3) but never forwards them to `Header` — it only uses them for the `Pagination` control below the grid.

```diff
       <Grid size={12}>
-        <Header title={title} />
+        <Header title={title} page={page} totalPages={totalPages} onPageChange={onPageChange} />
       </Grid>
```

That's the whole wire-up — `Header` and `Pagination` now read from the exact same `page`/`totalPages`/`onPageChange`, so clicking an arrow or a page number keeps both controls in sync.

Test: load Discover, confirm the back arrow is disabled on page 1, click forward a couple of times, confirm both the arrow state and the `Pagination` control agree on the current page, then confirm the back arrow re-enables. Repeat on Upcoming Movies.

---

## Notes

- **Filters still apply per-page.** `filterFunction` runs on whatever `data.results` came back for the current page, same as before — pagination doesn't change that behavior. A title filter typed on page 1 won't search page 2 until you navigate there and it refetches (or you've already cached it).
- **TMDB caps `total_pages` at 500** even if `total_results` implies more — that's a TMDB API limit, not something to fix here. MUI's `Pagination` shows ellipses automatically for large counts, so nothing extra is needed for that.
- **`favourites`/`mustWatch` localStorage sync** (the `movies.filter(m => m.favourite)` lines) still only reflects favourites found on the *currently loaded page* — that limitation already existed before this change and is unrelated to pagination.
