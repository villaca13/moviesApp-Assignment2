import React from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

const styles = {
    root: {
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 1.5,
    },
};

interface HeaderProps {
    title: string;
    page?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const Header: React.FC<HeaderProps> = (headerProps) => {
    const { title, page, totalPages, onPageChange } = headerProps;

    const canGoBack = !!onPageChange && !!page && page > 1;
    const canGoForward = !!onPageChange && !!page && !!totalPages && page < totalPages;


    return (
        <Paper component="div" sx={styles.root}>
            <IconButton
                aria-label="go back"
                disabled={!canGoBack}
                onClick={() => page && onPageChange && onPageChange(page - 1)}
            >
                <ArrowBackIcon color="primary" fontSize="large" />
            </IconButton>

            <Typography variant="h4" component="h3">
                {title}
            </Typography>
            <IconButton
                aria-label="go forward"
                disabled={!canGoForward}
                onClick={() => page && onPageChange && onPageChange(page + 1)}
            >
                <ArrowForwardIcon color="primary" fontSize="large" />
            </IconButton>
        </Paper>
    );
};

export default Header;
