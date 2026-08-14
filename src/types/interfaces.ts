export interface BaseMovieProps {
    genre_ids?: number[];
    title: string;
    budget: number;
    homepage: string | undefined;
    id: number;
    imdb_id: string;
    original_language: string;
    overview: string;
    release_date: string;
    vote_average: number;
    popularity: number;
    poster_path?: string;
    tagline: string;
    runtime: number;
    revenue: number;
    vote_count: number;
    favourite?: boolean;
    mustWatch?: boolean;
  }

export interface BaseMovieListProps {
  movies: BaseMovieProps[];
  action: (m: BaseMovieProps) => React.ReactNode;
}

 export interface MovieDetailsProps extends BaseMovieProps {
    genres: {
      id: number;
      name: string;
    }[];
    production_countries: {
      iso_3166_1: string;
      name: string;
    }[];
  }

  export interface MovieImage {
  file_path: string;
  aspect_ratio?: number; //some props are optional...
  height?: number;
  iso_639_1?: string;
  vote_average?: number;
  vote_count?: number;
  width?: number;
}

export interface MoviePageProps {
  movie: MovieDetailsProps;
  images: MovieImage[];
}

export type FilterOption = "title" | "genre";
export interface MovieListPageTemplateProps extends BaseMovieListProps {
  title: string;
}
  export interface Review{
    id: string;
    content: string
    author: string
  }
export interface GenreData {
  genres: {
    id: string;
    name: string
  }[];
}
export interface DiscoverMovies {
  page: number;	
  total_pages: number;
  total_results: number;
  results: BaseMovieProps[];
}

export interface UpcomingMovies {
  page: number;	
  total_pages: number;
  total_results: number;
  results: BaseMovieProps[];
}

export interface Review {
    author: string,
    content: string,
    agree: boolean,
    rating: number,
    movieId: number,
  }


// Authentication Context

export interface LogInDetails {
    email: string;
    password: string;
}

export interface SignInProps extends LogInDetails {
    remember_me?: boolean | undefined;
}

export interface SignUpProps extends LogInDetails {
    fullName: string;
    isSubscribed?: boolean | undefined;
}

export interface AuthSession {
    email: string;
    token: string;
}
