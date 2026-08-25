# Tutorial: Fix Navigation Bar (hide on auth pages + add user info/logout)

Two changes, two files. Copy the snippets in, then adapt to taste.

---

## Step 1 — Hide the navbar on `/` (Sign In) and `/signUp`

**File:** `src/components/siteHeader/index.tsx`

Add `useLocation` and bail out early when the path is a public auth route. `+` lines are new, unmarked lines are your existing code shown for context.

```diff
 import React, { useState, MouseEvent } from "react";
 import AppBar from "@mui/material/AppBar";
 import Toolbar from "@mui/material/Toolbar";
 import Typography from "@mui/material/Typography";
 import IconButton from "@mui/material/IconButton";
 import Button from "@mui/material/Button";
 import { styled } from "@mui/material/styles";
 import MenuIcon from "@mui/icons-material/Menu";
 import MenuItem from "@mui/material/MenuItem";
 import Menu from "@mui/material/Menu";
-import { useNavigate } from "react-router-dom";
+import { useNavigate, useLocation } from "react-router-dom";
 import { useTheme } from "@mui/material/styles";
 import useMediaQuery from "@mui/material/useMediaQuery";

 const styles = {
     title: {
       flexGrow: 1,
     },
   };

 const Offset = styled("div")(({ theme }) => theme.mixins.toolbar);

+const PUBLIC_ROUTES = ["/", "/signUp"];
+
 const SiteHeader: React.FC = () => {
   const navigate = useNavigate();
+  const location = useLocation();
   const [anchorEl, setAnchorEl] = useState<HTMLButtonElement|null>(null);
   const open = Boolean(anchorEl);
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

+  // Don't render the header on sign in / sign up pages
+  if (PUBLIC_ROUTES.includes(location.pathname)) {
+    return null;
+  }
+
   const menuOptions = [
     { label: "Home", path: "/" },
     { label: "Favorites", path: "/movies/favourites" },
     { label: "Upcoming", path: "/movies/upcoming" },
     { label: "Option 4", path: "/" },
   ];
```

Put the `if` check **after** all hooks (`useState`, `useTheme`, etc.) so hook order stays consistent, but **before** the `return (...)` JSX.

**Why this approach:** simplest change, no restructuring of `index.tsx`. Downside: it's a hardcoded path list — if you add more public routes later, you have to remember to update `PUBLIC_ROUTES`.

**Alternative (more scalable):** move `<SiteHeader />` out of `App` in `index.tsx` and only render it inside a small layout wrapper that wraps the authenticated routes. More setup, but avoids the hardcoded list. Ask if you want that version instead.

---

## Step 2 — Add user info + logout button

**File:** `src/components/siteHeader/index.tsx`

Pull `user` and `logout` from your existing `useAuth()` hook, then render them in the `Toolbar`. This continues from the Step 1 result — `+` lines are new on top of that.

```diff
 import { useNavigate, useLocation } from "react-router-dom";
 import { useTheme } from "@mui/material/styles";
 import useMediaQuery from "@mui/material/useMediaQuery";
+import { useAuth } from "../../contexts/authContext";

 ...

 const SiteHeader: React.FC = () => {
   const navigate = useNavigate();
   const location = useLocation();
+  const { user, logout } = useAuth();
   const [anchorEl, setAnchorEl] = useState<HTMLButtonElement|null>(null);
   const open = Boolean(anchorEl);
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

   if (PUBLIC_ROUTES.includes(location.pathname)) {
     return null;
   }

   const menuOptions = [ ... ];

   const handleMenuSelect = (pageURL: string) => {
     navigate(pageURL);
   };

   const handleMenu = (event: MouseEvent<HTMLButtonElement>) => {
     setAnchorEl(event.currentTarget);
   };

+  const handleLogout = async () => {
+    await logout(); // already navigates to "/" for you
+  };

   return (
     <>
       <AppBar position="fixed" elevation={0} color="primary">
         <Toolbar>
           <Typography variant="h4" sx={styles.title}>
             TMDB Client
           </Typography>
           <Typography variant="h6" sx={styles.title}>
             All you ever wanted to know about Movies!
           </Typography>
           {isMobile ? ( ... ) : ( ... )}
+          {user && (
+            <>
+              <Typography variant="body1" sx={{ mx: 2 }}>
+                {user}
+              </Typography>
+              <Button color="inherit" onClick={handleLogout}>
+                Logout
+              </Button>
+            </>
+          )}
         </Toolbar>
       </AppBar>
       <Offset />
     </>
   );
 };

 export default SiteHeader;
```

Note: `...` marks unchanged blocks I collapsed for readability — your actual file keeps that code as-is.

Notes:
- `user` in your `authContext.tsx` is already the signed-in email (see `setUser(session.user.email)`), so `{user}` is enough — no extra API call needed.
- `logout()` already clears `user`/`userId`/`token` and calls `navigate("/")`, so `handleLogout` doesn't need to do anything extra.
- If you'd rather show initials in an `Avatar` instead of the raw email, MUI's `Avatar` component with `{user?.[0]?.toUpperCase()}` is a common pattern — optional polish.

---

## Step 3 — Test

1. Run the app, visit `/` — confirm no navbar renders.
2. Visit `/signUp` — confirm no navbar renders.
3. Sign in — confirm you land on `/dashboard` with the navbar visible, showing your email and a Logout button.
4. Click Logout — confirm you're returned to `/` and the navbar disappears again.
5. Refresh the page while logged in — confirm the session restores (`authContext`'s `getSession()` effect) and the navbar still shows your email correctly.

---

## Reference: current file locations

- Navbar component: `src/components/siteHeader/index.tsx`
- Route definitions: `src/index.tsx`
- Auth context (`user`, `logout`): `src/contexts/authContext.tsx`
