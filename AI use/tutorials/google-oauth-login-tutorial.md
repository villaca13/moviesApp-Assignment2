# Adding Google Sign-In (Supabase OAuth) — Step by Step

## First, your question: are we using Supabase auth all the time?

Yes. Checked all the imports:

- `src/contexts/authContext.tsx` → imports `loginUser`, `logoutUser` from `api/supabase-api.ts`
- `src/pages/signUp.tsx` → imports `registerUser` from `api/supabase-api.ts`
- `src/contexts/moviesContext.tsx` → imports `fetchMovieData`/`saveMovieData` from `api/supabase-api.ts`

`src/api/supabase-api.ts` calls `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.signOut` — real Supabase Auth, password-based.

`src/api/auth-api.ts` (the localStorage version with the TODOs you filled in) is **not imported anywhere** in `src/`. It's dead code left over from before the Supabase migration — nothing currently calls it.

So there's no "password login" vs "Supabase login" split today — your existing Sign In form already logs in *through* Supabase, using the password grant (`signInWithPassword`). What you don't have yet is a **second** way to authenticate. The Google button on `signIn.tsx` is currently just `onClick={() => alert('Sign in with Google')}` — it's a placeholder. This tutorial wires it to real Supabase OAuth, so after this you'll have two working Supabase auth methods: password, and Google.

`auth-api.ts` being unused isn't something this tutorial touches — flagging it in case you want to delete it later for a cleaner submission, but that's your call.

## What changes

1. Enable the Google provider in your Supabase project (dashboard config, no code).
2. Add one function to `src/api/supabase-api.ts`.
3. Expose it through `src/contexts/authContext.tsx`.
4. Wire the existing Google button in `src/pages/signIn.tsx` to call it instead of `alert(...)`.

Test after step 4 before doing anything else.

---

## Step 1 — Enable Google as a provider in Supabase

This part has no code, it's dashboard + Google Cloud Console config.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - You'll need the Supabase callback URL for "Authorized redirect URIs" — get it from Supabase first (next bullet), then come back here.
2. In your Supabase dashboard: **Authentication → Providers → Google** → toggle it on. Supabase shows you the **Callback URL (for OAuth)**, something like:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Paste that into the Google Cloud "Authorized redirect URIs" field, then back in Google Cloud copy the generated **Client ID** and **Client Secret** into the matching fields on the Supabase Google provider screen. Save both sides.
3. Still in Supabase: **Authentication → URL Configuration** → make sure `http://localhost:5173` (or whatever port Vite uses for you) is in **Redirect URLs**, so Supabase is allowed to send the browser back to your dev server after Google login.

No `.env` changes needed — this is all server-side config on Supabase's end, the anon key you already have is enough.

---

## Step 2 — Add `loginWithGoogle` to `src/api/supabase-api.ts`

Your file currently starts like this:

```ts
import { SignInProps, SignUpProps, AuthSession, Review } from "../types/interfaces";
import { supabase } from "./supabase-client";
import { UserProfile } from "../types/interfaces";

export const registerUser = async (data: SignUpProps): Promise<void> => {
  ...
};

export const loginUser = async (data: SignInProps): Promise<AuthSession> => {
  ...
};
```

Add a new export **right after `loginUser`** (diff below — only the `+` lines are new, everything else in the file is unchanged):

```diff
 export const loginUser = async (data: SignInProps): Promise<AuthSession> => {
   ...
   return {
     user: {
       id: authData.user.id,
       email: authData.user.email ?? "",
     },
     access_token: authData.session.access_token,
   };
 };

+export const loginWithGoogle = async (): Promise<void> => {
+  const { error } = await supabase.auth.signInWithOAuth({
+    provider: "google",
+    options: {
+      redirectTo: `${window.location.origin}/dashboard`,
+    },
+  });
+  if (error) {
+    throw new Error(error.message);
+  }
+};
```

Notes on why it's shaped this way:

- `signInWithOAuth` doesn't return a session — it **redirects the whole browser tab** to Google, then Google redirects back to `redirectTo` with the session in the URL. `supabase-js` picks that up automatically (`detectSessionInUrl` is on by default), which is why this function returns `Promise<void>` instead of `AuthSession` like `loginUser` does.
- `redirectTo` points straight at `/dashboard`. Your `ProtectedRoute` (`src/components/protectedRoute/index.tsx`) already shows a `Spinner` while `loading` is true and only redirects to `/` if `loading` is false **and** there's no user — so landing directly on `/dashboard` while the session is still being parsed is safe, no extra redirect logic needed.

---

## Step 3 — Expose it through `src/contexts/authContext.tsx`

Current shape:

```tsx
import { loginUser, logoutUser } from "../api/supabase-api";
...
interface AuthContextInterface {
  user: string | null;
  userId: string | null;
  token: string;
  loading: boolean;
  login(data: SignInProps): Promise<void>;
  logout(): Promise<void>;
}

const initialAuthContext: AuthContextInterface = {
  user: null,
  userId: null,
  token: "",
  loading: true,
  login: async () => {},
  logout: async () => {},
};
```

Diff:

```diff
-import { loginUser, logoutUser } from "../api/supabase-api";
+import { loginUser, logoutUser, loginWithGoogle } from "../api/supabase-api";

 interface AuthContextInterface {
   user: string | null;
   userId: string | null;
   token: string;
   loading: boolean;
   login(data: SignInProps): Promise<void>;
+  loginGoogle(): Promise<void>;
   logout(): Promise<void>;
 }

 const initialAuthContext: AuthContextInterface = {
   user: null,
   userId: null,
   token: "",
   loading: true,
   login: async () => {},
+  loginGoogle: async () => {},
   logout: async () => {},
 };
```

Then inside `AuthContextProvider`, next to the existing `login` function:

```diff
   const login = async (data: SignInProps) => {
     const session = await loginUser(data);
     setUser(session.user.email);
     setUserId(session.user.id);
     setToken(session.access_token);
     navigate("/dashboard");
   };

+  const loginGoogle = async () => {
+    await loginWithGoogle();
+    // No navigate() here — signInWithOAuth redirects the browser away
+    // to Google and back to redirectTo itself; there's no local state
+    // to update at this point in the flow.
+  };
+
   const logout = async () => {
```

And add it to what the provider exposes:

```diff
   return (
-    <AuthContext.Provider value={{ user, userId, token, loading, login, logout }}>
+    <AuthContext.Provider value={{ user, userId, token, loading, login, loginGoogle, logout }}>
       {children}
     </AuthContext.Provider>
   );
```

---

## Step 4 — Wire the button in `src/pages/signIn.tsx`

Currently:

```tsx
const { login } = useAuth();
...
<Button
  fullWidth
  variant="outlined"
  onClick={() => alert('Sign in with Google')}
  startIcon={<GoogleIcon />}
>
  Sign in with Google
</Button>
```

Diff:

```diff
-  const { login } = useAuth();
+  const { login, loginGoogle } = useAuth();
+  const [oauthError, setOauthError] = React.useState('');
+
+  const handleGoogleSignIn = async () => {
+    setOauthError('');
+    try {
+      await loginGoogle();
+    } catch (error) {
+      setOauthError(
+        error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'
+      );
+    }
+  };
```

```diff
+            {oauthError && <Alert severity="error">{oauthError}</Alert>}
             <Button
               fullWidth
               variant="outlined"
-              onClick={() => alert('Sign in with Google')}
+              onClick={handleGoogleSignIn}
               startIcon={<GoogleIcon />}
             >
               Sign in with Google
             </Button>
```

(`Alert` is already imported at the top of `signIn.tsx` for the existing password error, so no new import needed for that part. `useAuth` and `GoogleIcon` imports are also already there.)

Leave the Facebook button as-is for now (`alert('Sign in with Facebook')`) — same pattern would apply later if you want it (`provider: "facebook"` on Step 1/2), just not part of this request.

---

## Step 5 — Test end to end

1. `npm run dev`.
2. On `/`, click **Sign in with Google**. You should be redirected to Google's account picker, then back to your app at `/dashboard`.
3. Confirm you're actually logged in — check `Authentication → Users` in the Supabase dashboard, the Google account should show up with provider `google`.
4. Refresh `/dashboard` — you should stay logged in (session persists via `supabase-js`, same as password login).
5. Log out, then log back in with **email + password** on the same account you just used — confirm both flows still work independently.
6. Check `Authentication → Users` again: signing up via Google and via email/password with the *same* email address creates handling you should be aware of — Supabase either links or conflicts them depending on your **Authentication → Providers → Email → "Confirm email"** and account-linking settings. Worth a quick look if you plan to let the same person use both methods.
