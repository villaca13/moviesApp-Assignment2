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