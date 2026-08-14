# Supabase Tutorial — Step by Step

Full working code, in the order to apply it. Each step tells you which file to touch and whether it's a new file or a replacement. Test after Step 8 (auth) before moving on to Step 10+ (data).

Files by the end: `src/api/supabase-client.ts` (client instance), `src/api/auth-api.ts` (unchanged file, Supabase-backed per Step 6), `src/api/supabase-api.ts` (movie-data document reads/writes), `src/contexts/authContext.tsx`, `src/contexts/moviesContext.tsx`.

## Step 1 — Create the Supabase project

1. Go to supabase.com → New project. Pick a region near Ireland (e.g. West EU / London). Save the DB password somewhere.
2. **Project Settings → API** → copy the **Project URL** and the **anon public key**.
3. **Authentication → Settings** → for local dev, turn off "Confirm email" so signup doesn't need email verification (turn it back on before any real deployment).

No code yet — just get those two values.

## Step 2 — Install the client and set env vars

```bash
npm install @supabase/supabase-js
```

Add to `.env` (keep `VITE_TMDB_KEY` as is):

```
VITE_TMDB_KEY=fdbde849a86d99a3490c21af1d106b93
VITE_SUPABASE_URL=paste-your-project-url-here
VITE_SUPABASE_ANON_KEY=paste-your-anon-key-here
```

## Step 3 — Create one document-style table

Instead of three relational tables, this uses a single table with one row per user and a `jsonb` column holding a JSON document — `{ favourites: [...], mustWatch: [...], reviews: [...] }`. It's still Postgres underneath (`jsonb` is a column type, not a separate database), but from the app's point of view you read and write one JSON blob per user, the same way you would with a Firestore document.

In the Supabase dashboard, open **SQL Editor → New query**, paste this, and run it:

```sql
create table user_movie_data (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{"favourites": [], "mustWatch": [], "reviews": []}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_movie_data enable row level security;

create policy "select own movie data" on user_movie_data for select using (auth.uid() = user_id);
create policy "insert own movie data" on user_movie_data for insert with check (auth.uid() = user_id);
create policy "update own movie data" on user_movie_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

There's no `favourites`/`must_watch`/`reviews` tables anymore — everything for a user lives in the `data` column of their one row in `user_movie_data`.

## Step 4 — New file: `src/api/supabase-client.ts`

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Step 5 — Update `src/types/interfaces.ts`

Replace the existing `AuthSession` interface with:

```ts
export interface AuthSession {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
}
```

Everything else in that file (`Review`, `SignInProps`, `SignUpProps`, etc.) stays the same.

## Step 6 — Replace `src/api/auth-api.ts`

```ts
import { SignInProps, SignUpProps, AuthSession } from "../types/interfaces";
import { supabase } from "./supabase-client";

export const registerUser = async (data: SignUpProps): Promise<void> => {
  const { error } = await supabase.auth.signUp({
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
};

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

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email ?? "",
    },
    access_token: authData.session.access_token,
  };
};

export const getSession = async (): Promise<AuthSession | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return null;
  }
  return {
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? "",
    },
    access_token: data.session.access_token,
  };
};

export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut();
};
```

`getUsers`, `saveSession`, and the localStorage keys are gone — Supabase stores and refreshes the session itself.

## Step 7 — Replace `src/contexts/authContext.tsx`

```tsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignInProps } from "../types/interfaces";
import { loginUser, logoutUser } from "../api/auth-api";
import { supabase } from "../api/supabase-client";

interface AuthContextInterface {
  user: string | null;
  userId: string | null;
  token: string;
  login(data: SignInProps): Promise<void>;
  logout(): Promise<void>;
}

const initialAuthContext: AuthContextInterface = {
  user: null,
  userId: null,
  token: "",
  login: async () => {},
  logout: async () => {},
};

export const AuthContext = React.createContext<AuthContextInterface>(initialAuthContext);

const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Restore an existing session (e.g. after a page refresh)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user.email ?? null);
        setUserId(data.session.user.id);
        setToken(data.session.access_token);
      }
    });

    // Keep state in sync if the session changes elsewhere (refresh, other tab, sign-out)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setToken(session?.access_token ?? "");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (data: SignInProps) => {
    const session = await loginUser(data);
    setUser(session.user.email);
    setUserId(session.user.id);
    setToken(session.access_token);
    navigate("/dashboard");
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setUserId(null);
    setToken("");
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, userId, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};
```

`login`/`logout` are now `async` — anything calling them needs to `await`, which is Steps 8–9.

## Step 8 — Update `src/pages/signIn.tsx`

`login(...)` now throws asynchronously (a rejected promise), not synchronously, so the `try/catch` needs to be inside an `async` function. Replace the `handleSubmit` function with:

```tsx
const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    if (!validateInputs()) {
      return;
    }
    const data = new FormData(event.currentTarget);
    try {
      await login({
        email: data.get('email') as string,
        password: data.get('password') as string,
        remember_me: data.has('remember_me'),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Sign in failed. Please try again.'
      );
    }
  };
```

Nothing else in that file changes.

**Test point:** run `npm run dev`, sign up a user (Step 9 first, see below), then sign in. Confirm you land on `/dashboard` and that in the Supabase dashboard under **Authentication → Users** you see the account.

## Step 9 — Update `src/pages/signUp.tsx`

`registerUser` is now `async` too. Two changes: import `registerUser` from the same place (unchanged import path), and make `handleSubmit` async:

```tsx
const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    if (!validateInputs()) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const newUser: SignUpProps = {
      fullName: data.get('name') as string,
      email: data.get('email') as string,
      password: data.get('password') as string,
      isSubscribed: data.has('isSubscribed'),
    };
    try {
      await registerUser(newUser);
      navigate('/');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Sign up failed. Please try again.'
      );
    }
  };
```

At this point, stop and test signup + login end to end before moving on — everything from Step 10 depends on having a real logged-in `userId`.

## Step 10 — New file: `src/api/supabase-api.ts`

`auth-api.ts` stays exactly as written in Step 6 — this is a separate file for the movie-data document, mirroring how `tmdb-api.ts` and `auth-api.ts` already keep API calls out of the context/component layer. `moviesContext.tsx` (Step 11) will call into this file instead of talking to `supabase` directly.

```ts
import { supabase } from "./supabase-client";
import { Review } from "../types/interfaces";

export interface MovieDocument {
  favourites: number[];
  mustWatch: number[];
  reviews: Review[];
}

export const emptyMovieData: MovieDocument = { favourites: [], mustWatch: [], reviews: [] };

export const fetchMovieData = async (userId: string): Promise<MovieDocument> => {
  const { data, error } = await supabase
    .from("user_movie_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data.data as MovieDocument;
  }

  // First time this user has touched favourites/mustWatch/reviews — create their document
  const { error: insertError } = await supabase
    .from("user_movie_data")
    .insert({ user_id: userId, data: emptyMovieData });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return emptyMovieData;
};

export const saveMovieData = async (userId: string, data: MovieDocument): Promise<void> => {
  const { error } = await supabase
    .from("user_movie_data")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};
```

## Step 11 — Replace `src/contexts/moviesContext.tsx`

```tsx
import React, { useState, useCallback, useEffect } from "react";
import { BaseMovieProps, Review } from "../types/interfaces";
import { fetchMovieData, saveMovieData, emptyMovieData, MovieDocument } from "../api/supabase-api";
import { useAuth } from "./authContext";

interface MovieContextInterface {
  favourites: number[];
  mustWatch: number[];
  reviews: Review[];
  addToFavourites: (movie: BaseMovieProps) => void;
  addToMustWatch: (movie: BaseMovieProps) => void;
  removeFromFavourites: (movie: BaseMovieProps) => void;
  addReview: (movie: BaseMovieProps, review: Review) => void;
}

const initialContextState: MovieContextInterface = {
  favourites: [],
  mustWatch: [],
  reviews: [],
  addToFavourites: () => {},
  addToMustWatch: () => {},
  removeFromFavourites: () => {},
  addReview: () => {},
};

export const MoviesContext = React.createContext<MovieContextInterface>(initialContextState);

const MoviesContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();
  const [movieData, setMovieData] = useState<MovieDocument>(emptyMovieData);

  // (Re)load this user's document whenever they log in, log out, or switch accounts
  useEffect(() => {
    if (!userId) {
      setMovieData(emptyMovieData);
      return;
    }

    fetchMovieData(userId)
      .then(setMovieData)
      .catch((error) => console.error("fetchMovieData failed:", error.message));
  }, [userId]);

  // Every mutation writes the whole document back — same pattern as a Firestore setDoc
  const persist = useCallback(
    (next: MovieDocument) => {
      if (!userId) return;
      setMovieData(next);
      saveMovieData(userId, next).catch((error) =>
        console.error("saveMovieData failed:", error.message)
      );
    },
    [userId]
  );

  const addToFavourites = useCallback(
    (movie: BaseMovieProps) => {
      if (movieData.favourites.includes(movie.id)) return;
      persist({ ...movieData, favourites: [...movieData.favourites, movie.id] });
    },
    [movieData, persist]
  );

  const addToMustWatch = useCallback(
    (movie: BaseMovieProps) => {
      if (movieData.mustWatch.includes(movie.id)) return;
      persist({ ...movieData, mustWatch: [...movieData.mustWatch, movie.id] });
    },
    [movieData, persist]
  );

  const removeFromFavourites = useCallback(
    (movie: BaseMovieProps) => {
      persist({
        ...movieData,
        favourites: movieData.favourites.filter((id) => id !== movie.id),
      });
    },
    [movieData, persist]
  );

  const addReview = useCallback(
    (movie: BaseMovieProps, review: Review) => {
      persist({ ...movieData, reviews: [...movieData.reviews, review] });
    },
    [movieData, persist]
  );

  return (
    <MoviesContext.Provider
      value={{
        favourites: movieData.favourites,
        mustWatch: movieData.mustWatch,
        reviews: movieData.reviews,
        addToFavourites,
        addToMustWatch,
        removeFromFavourites,
        addReview,
      }}
    >
      {children}
    </MoviesContext.Provider>
  );
};

export default MoviesContextProvider;
```

This drops the old broken `addReview` (it was doing `setMyReviews({...myReviews, [movie.id]: review})` on an array, which doesn't work) and replaces it with a document read-modify-write, delegated to `supabase-api.ts`. `moviesContext.tsx` no longer imports `supabase` directly at all. No changes needed in `src/index.tsx` — `AuthContextProvider` already wraps `MoviesContextProvider`, so `useAuth()` inside `moviesContext.tsx` works as-is.

No changes needed in `movieCard/index.tsx`, `reviewForm/index.tsx`, or `favouriteMoviesPage.tsx` — they already call `addToFavourites(movie)`, `addToMustWatch(movie)`, `removeFromFavourites(movie)`, `context.addReview(movie, review)` with the same signatures.

## Step 12 — Test end to end

1. `npm run dev`.
2. Sign up as user A, log in, mark a couple of movies as favourites and must-watch, submit a review.
3. Refresh the page — favourites/mustWatch/reviews should still be there (proves they're coming from Supabase, not React state).
4. In Supabase, check the `user_movie_data` table — you should see one row per user, and its `data` column should be a JSON object with your favourites/mustWatch/reviews inside it.
5. Log out, sign up as user B, confirm B sees zero favourites/mustWatch/reviews — this is your RLS policies working.
6. Log back in as user A and confirm A's data is still separate from B's.

## Step 13 — Before committing

- Confirm `.env` is in `.gitignore` (it already covers `.env` for `VITE_TMDB_KEY`, so the Supabase keys are covered too).
- The anon key is safe to ship in a built frontend bundle — it's meant to be public, and RLS is what actually protects the data, not key secrecy.
