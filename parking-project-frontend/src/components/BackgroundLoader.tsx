import React, { useState, useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

interface BackgroundLoaderProps {
    imageUrl: string;
    children: React.ReactNode;
}

const BackgroundLoader: React.FC<BackgroundLoaderProps> = ({ imageUrl, children }) => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => setLoaded(true);
    }, [imageUrl]);

    if (!loaded) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div
            style={{
                background: `url(${imageUrl}) no-repeat center center`,
                backgroundSize: "cover",
                minHeight: "100vh",
            }}
        >
            {children}
        </div>
    );
};

export default BackgroundLoader;
