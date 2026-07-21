import { useEffect, useState } from "react";
import { getMovie } from '../api/tmdb-api'
import { MovieDetailsProps } from '../types/interfaces';

const useMovie = (id: string) => {
    const [movie, setMovie] = useState<MovieDetailsProps>();
    useEffect(() => {
        getMovie(id).then(movie => {
            setMovie(movie);
        });
    }, [id]);
    return [movie, setMovie] as const;
};

export default useMovie
