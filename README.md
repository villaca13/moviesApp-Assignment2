# Movies App — TMDB Client

**Live demo:** [https://movies-app-assignment2-lj7j-one.vercel.app/](https://movies-app-assignment2-lj7j-one.vercel.app/)

## Overview
Developed for the Full Stack Development 2 module of the Higher Diploma in Computer Science at SETU (Assignment 2). A React + TypeScript movie browsing app built with Vite, backed by the TMDB API for movie data and Supabase for authentication and per-user data (favourites, must-watch list, reviews, preferences).

- **TypeScript / React**: Functional components, hooks, Context API, generics, type-safe props/interfaces.
- **Architecture**: Pages → Components → Context (`authContext`, `moviesContext`) → API layer (`tmdb-api.ts`, `supabase-api.ts`).
- **Routing**: `react-router-dom` v6, with protected routes gated behind an authenticated Supabase session.
- **Data fetching/caching**: `react-query` (queries, parallel queries with `useQueries`, pagination-aware query keys).
- **Forms & validation**: `react-hook-form` (sign in, sign up, review submission).
- **UI**: MUI (Material UI) component library and theming, responsive AppBar/menu.
- **Backend-as-a-service**: Supabase — Postgres tables + Row Level Security, Auth (email/password and Google OAuth).
- **Component development**: Storybook, with stories for the main presentational components.
- **Deployment**: Vercel, with a rewrite rule for client-side routing.

---

## Features
- Navigation bar (MUI AppBar, responsive: button row on desktop, hamburger menu on mobile)
1. ***Sign Up***
    - Create a new account (email, password, full name) via Supabase Auth.
    - Optional "email notifications" subscription checkbox, saved to the user's profile.
2. ***Sign In***
    - Email/password login via Supabase Auth, plus Google sign-in (Supabase OAuth).
    - "Remember me" checkbox, saved to the user's profile.
    - Forgot password flow.
3. ***Dashboard*** (`/dashboard`) — Discover Movies
    - Paginated list of movies from TMDB's Discover endpoint.
    - Filter by title and/or genre.
    - Add any movie to Favourites.
4. ***Upcoming Movies*** (`/movies/upcoming`)
    - Paginated list of movies from TMDB's Upcoming endpoint.
    - Filter by title and/or genre.
    - Add any movie to the must-watch list.
5. ***Favourite Movies*** (`/movies/favourites`)
    - Lists the signed-in user's favourited movies (fetched from TMDB in parallel per ID).
    - Remove from favourites, or write a review.
6. ***Movie Details*** (`/movies/:id`)
    - Overview, genres, runtime, revenue, rating, release date.
    - Reviews drawer showing TMDB reviews for the movie, with a link through to the full review.
7. ***Reviews***
    - `/reviews/:id` — full TMDB review view.
    - `/reviews/form` — form to submit your own review for a movie (rating categories via `react-hook-form`), stored per-user in Supabase.
8. ***User data & preferences (Supabase)***
    - Favourites, must-watch list and reviews are persisted per authenticated user (`user_movie_data` table).
    - "Remember me" and "email notifications" preferences persisted in a `profiles` table.
9. ***Protected routes***
    - Every route except Sign In / Sign Up requires an authenticated Supabase session; unauthenticated users are redirected.
10. ***Storybook***
    - Isolated stories for `movieCard`, `movieList`, `movieDetails`, `filterMoviesCard`, `siteHeader` and the movie list header, for building/testing components outside the full app.

---

## Technologies Used

- **Frontend**: React 18, TypeScript, Vite
- **UI**: MUI (Material UI) v9, Emotion
- **Forms**: react-hook-form
- **Data fetching / cache**: react-query
- **Routing**: react-router-dom v6
- **Backend-as-a-service**: Supabase (Postgres, Auth incl. Google OAuth, Row Level Security)
- **External API**: [TMDB](https://www.themoviedb.org/) (The Movie Database) API
- **Component development**: Storybook 8
- **Linting**: ESLint + typescript-eslint
- **Deployment**: Vercel

---

## Getting Started

1. Clone the repository and install dependencies:
    ```bash
    git clone https://github.com/villaca13/moviesApp-Assignment2.git
    cd moviesApp-Assignment2
    npm install
    ```
2. Create a `.env` file in the project root (this file is gitignored — never commit it) with:
    ```
    VITE_TMDB_KEY=your_tmdb_api_key
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
    ```
3. Run the app locally:
    ```bash
    npm run dev
    ```
4. Other useful scripts:
    ```bash
    npm run build          # type-check and build for production
    npm run preview        # preview the production build locally
    npm run lint           # run ESLint
    npm run storybook      # run Storybook on port 6006
    npm run build-storybook
    ```

### Deployment
Deployed on [Vercel](https://vercel.com/) at https://movies-app-assignment2-lj7j-one.vercel.app/. Since `.env` is gitignored, the three environment variables above must be re-entered in the Vercel project's dashboard. `vercel.json` adds a rewrite rule so client-side routes don't 404 on refresh:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Project Structure

*Files/folders marked **NEW** were added after the Assignment 1 checkpoint commit (`Initial Commit - Starting point is from end of assignment 1`); everything else existed there and was modified since.*

```
moviesApp-Assignment2/
├── src/
│   ├── api/
│   │   ├── tmdb-api.ts              TMDB endpoints: discover, movie, upcoming, genres, images, reviews
│   │   ├── supabase-api.ts          Auth (sign up/in/out, session) + user_movie_data / profiles  **NEW**
│   │   └── supabase-client.ts       Supabase client instance  **NEW**
│   ├── components/
│   │   ├── cardIcons/               addToFavourites, addToPlaylist, removeFromFavourites, writeReview, CustomIcons.tsx **NEW**
│   │   ├── filterMoviesCard/
│   │   ├── forgotPassword/          **NEW**
│   │   ├── headerMovie/ , headerMovieList/
│   │   ├── movieCard/ , movieList/
│   │   ├── movieDetails/ , movieReview/ , movieReviews/
│   │   ├── movieFilterUI/
│   │   ├── protectedRoute/          Route guard using authContext  **NEW**
│   │   ├── reviewForm/              react-hook-form review submission + rating categories
│   │   ├── siteHeader/              Responsive MUI AppBar / navigation
│   │   ├── spinner/
│   │   ├── templateMovieListPage/   Shared list page template (grid + pagination)
│   │   └── templateMoviePage/
│   ├── contexts/
│   │   ├── authContext.tsx          Supabase session state, login/logout  **NEW**
│   │   └── moviesContext.tsx        Favourites / must-watch / reviews state, synced to Supabase
│   ├── hooks/
│   │   ├── useFiltering.ts
│   │   └── useMovie.ts
│   ├── pages/
│   │   ├── signIn.tsx , signUp.tsx  **NEW**
│   │   ├── homePage.tsx             Discover Movies (paginated)
│   │   ├── upcomingMoviesPage.tsx   Upcoming Movies (paginated)
│   │   ├── favouriteMoviesPage.tsx
│   │   ├── movieDetailsPage.tsx
│   │   ├── movieReviewPage.tsx
│   │   └── addMovieReviewPage.tsx
│   ├── shared-theme/                MUI theme, color mode, customizations  **NEW**
│   ├── stories/                     Storybook stories + sample data
│   ├── types/
│   │   └── interfaces.ts            Shared TypeScript interfaces
│   └── index.tsx                    App root: providers, router, routes
├── public/
├── tutorials/                       Step-by-step implementation guides (Supabase, OAuth, pagination, deployment, git flow)  **NEW**
├── .storybook/
├── vercel.json                      Client-side routing rewrite for Vercel  **NEW**
├── package.json
└── README.md
```

---

## Contributors
- **Tiago Linhares Villaca** — HDip in Computer Science student, background in Control & Automation Engineering, postgraduate in Data Analytics.

---

## Acknowledgments

- [TMDB](https://www.themoviedb.org/documentation/api) — movie data API.
- [Supabase](https://supabase.com/docs) — Auth and Postgres backend.
- [MUI](https://mui.com/) — component library and the [sign-in-side template](https://mui.com/material-ui/getting-started/templates/sign-in-side/) used as the basis for the Sign In / Sign Up pages.
- [react-hook-form](https://react-hook-form.com/) docs.
- Early authentication exploration was inspired by a set of localStorage/Context-API auth tutorials, before the app moved to Supabase Auth:
  - [Login with local Storage (video)](https://www.youtube.com/watch?v=j4Ms4CSDR60) and its [companion repo](https://github.com/learntocodewithsagar/react-auth-local-storage/tree/main)
  - [Add login authentication to React applications](https://www.digitalocean.com/community/tutorials/how-to-add-login-authentication-to-react-applications) (Context API + localStorage)
  - [React + TypeScript authentication guide using Context API](https://medium.com/@kimtai.developer/react-typescript-authentication-guide-using-context-api-5c82f2530eb1)
  - [Complete guide to authentication with React Router v6](https://blog.logrocket.com/complete-guide-authentication-with-react-router-v6/) (protected routes)
  - [Role-based auth with React Router v6 + TypeScript](https://www.adarsha.dev/blog/role-based-auth-with-react-router-v6)
  - [React authentication: from protected routes to passkeys](https://clerk.com/articles/react-authentication-from-protected-routes-to-passkeys) — explains why localStorage auth isn't production-secure, which is what prompted the move to Supabase Auth.
- [react-query](https://tanstack.com/query/v3/) docs.
- [Storybook](https://storybook.js.org/) docs.
- README structure adapted from a previous SETU project, Weather Top 3.0.

---

## Limitations and Future Work

### Limitations
- Layout is primarily optimised for desktop; mobile styling is partial (responsive nav only).
- Filtering is limited to title and genre; no full-text/keyword search.
- Reviews shown on the movie details page come from TMDB; user-submitted reviews are stored separately in Supabase and not yet merged into that view.
- "Email notifications" is stored as a preference but not yet wired to an actual email-sending service.
- No automated tests (unit or end-to-end) yet.

### Future Work
- Add keyword/cast search on top of the existing filters.
- Full responsive redesign for mobile/tablet.
- Show cast, crew and trailers on the movie details page.
- Wire up the email notifications preference to a real notification service.
- Add unit/integration tests (e.g. Vitest + React Testing Library).

---

## License

This project was developed for academic purposes as part of the Higher Diploma in Computer Science at SETU and is not licensed for commercial use.
