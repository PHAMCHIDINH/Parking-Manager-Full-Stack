import React, { useEffect, useState } from "react";
import { AppBar, Toolbar, Button, Box, Avatar, Typography, IconButton } from "@mui/material";
import API from "../api";
import { useAuth } from "../contexts/AuthContext";
import LeftPanel from "../components/LeftPanel";
import MainArea from "../components/MainArea";
import RightPanel from "../components/RightPanel";
import { SpotRecord } from "../types";
import { useNavigate } from "react-router-dom";

// Define the backend base URL for static resources
const baseURL = "http://localhost:8080";

const UserDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [spots, setSpots] = useState<SpotRecord[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterText, setFilterText] = useState("");
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    useEffect(() => {
        const loadSpots = async () => {
            setIsLoading(true);
            try {
                const response = await API.get("/parking");
                const spotsList: SpotRecord[] = response.data.map((spot: any) => ({
                    spot_id: spot.label,
                    type: spot.category,
                    geometry: spot.coordinates ? JSON.parse(spot.coordinates) : undefined,
                    occupied: spot.occupied,
                }));
                setSpots(spotsList);
            } catch (err) {
                console.error("Error loading spots:", err);
                setError("Failed to load parking spots from backend");
            } finally {
                setIsLoading(false);
            }
        };
        loadSpots();
    }, []);

    const handleSpotSelect = (spotId: string) => {
        setSelectedSpotId(spotId);
    };

    // Build the complete URL for the profile image
    const profileImageUrl =
        user?.profileImageUrl && !user.profileImageUrl.startsWith("http")
            ? baseURL + user.profileImageUrl
            : user?.profileImageUrl;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Fixed Top Bar */}
            <AppBar position="fixed">
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <IconButton onClick={() => navigate("/user/profile")}>
                            <Avatar src={profileImageUrl} alt={user?.name || "User"} />
                        </IconButton>
                        <Typography variant="h6">{user?.name || "User Dashboard"}</Typography>
                    </Box>
                    <Button color="inherit" onClick={logout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Toolbar />

            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    overflow: "hidden",
                    position: "relative",
                    height: "calc(100vh - 64px)",
                }}
            >
                {/* Left Panel */}
                <Box
                    sx={{
                        width: 360,
                        flexShrink: 0,
                        height: "100%",
                        overflow: "auto",
                    }}
                >
                    <LeftPanel isOpen={true} leftTab={0} onTabChange={() => {}} />
                </Box>

                {/* Main Area */}
                <Box sx={{ flex: 1, overflow: "auto", height: "100%" }}>
                    <MainArea selectedSpotId={selectedSpotId} onSpotSelect={handleSpotSelect} />
                </Box>

                {/* Right Panel */}
                <Box
                    sx={{
                        width: 360,
                        flexShrink: 0,
                        height: "100%",
                        overflow: "auto",
                    }}
                >
                    <RightPanel
                        isOpen={true}
                        spots={spots}
                        selectedSpotId={selectedSpotId}
                        filterText={filterText}
                        selectedTypes={selectedTypes}
                        onFilterChange={(e) => setFilterText(e.target.value)}
                        onSelectedTypesChange={setSelectedTypes}
                        onSpotSelect={handleSpotSelect}
                        isLoading={isLoading}
                        error={error}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default UserDashboard;
