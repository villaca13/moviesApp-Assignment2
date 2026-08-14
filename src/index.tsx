import React from "react";
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Navigate, Routes } from "react-router-dom";
import HomePage from "./pages/homePage";
import MoviePage from "./pages/movieDetailsPage";
import FavouriteMoviesPage from "./pages/favouriteMoviesPage"; // NEW
import MovieReviewPage from "./pages/movieReviewPage";
import SiteHeader from './components/siteHeader'
import UpcomingMoviesPage from "./pages/upcomingMoviesPage"; // NEW
import { QueryClientProvider, QueryClient } from "react-query";
import { ReactQueryDevtools } from 'react-query/devtools';
import MoviesContextProvider from "./contexts/moviesContext";
import AddMovieReviewPage from './pages/addMovieReviewPage';
import SignInPage from "./pages/signIn";
import SignUpPage from "./pages/signUp";
import AuthContextProvider from "./contexts/authContext";
import ProtectedRoute from "./components/protectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 360000,
      refetchInterval: 360000, 
      refetchOnWindowFocus: false
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
        <MoviesContextProvider>
          <SiteHeader />      {/* New Header  */}
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />

            <Route path="/movies/favourites" element={<ProtectedRoute><FavouriteMoviesPage /></ProtectedRoute>} />
            <Route path="/movies/upcoming" element={<ProtectedRoute><UpcomingMoviesPage /></ProtectedRoute>} />
            <Route path="/movies/:id" element={<ProtectedRoute><MoviePage /></ProtectedRoute>} />
            <Route path="/reviews/:id" element={<ProtectedRoute><MovieReviewPage/></ProtectedRoute>} />
            <Route path="/reviews/form" element={<ProtectedRoute><AddMovieReviewPage/></ProtectedRoute>} />

            <Route path="/" element={<SignInPage/>} />
            <Route path="/signUp" element={<SignUpPage/>} />

          </Routes>
        </MoviesContextProvider>
    <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthContextProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </AuthContextProvider>
  </BrowserRouter>,
)

