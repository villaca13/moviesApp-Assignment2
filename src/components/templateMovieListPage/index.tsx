import React from "react";
import Header from "../headerMovieList";
import Grid from "@mui/material/Grid";
import MovieList from "../movieList";
import Pagination from "@mui/material/Pagination";
import {  MovieListPageTemplateProps} from "../../types/interfaces";

const styles = {
  root: { 
    backgroundColor: "#bfbfbf",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    padding: 2,
  },
};
const MovieListPageTemplate: React.FC<MovieListPageTemplateProps> = ({ movies, title, action, page, totalPages, onPageChange })=> {
  return (
    <Grid container sx={styles.root}>
      <Grid size={12}>
+        <Header title={title} page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </Grid>
      <Grid container spacing={5}>
        <MovieList action={action} movies={movies}></MovieList>
      </Grid>
      {totalPages && totalPages > 1 && (
        <Grid size={12} sx={styles.pagination}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => onPageChange && onPageChange(value)}
            color="primary"
          />
        </Grid>
      )}
    </Grid>
  );
}
export default MovieListPageTemplate;
