import React, { useEffect, useState } from "react";
import {
    AppBar,
    Toolbar,
    Button,
    Box,
    Avatar,
    Typography,
    IconButton,
    FormControlLabel,
    Switch,
    CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../api";
import MainArea from "../components/MainArea";
import RightPanel from "../components/RightPanel";
import { SpotRecord } from "../types";

export default function UserDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [spots, setSpots] = useState<SpotRecord[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // For text filtering
    const [filterText, setFilterText] = useState("");

    // If you want real-time, you might keep a switch, but not auto‐poll.
    const [liveOccupancy, setLiveOccupancy] = useState(false);

    // Remove or comment out any setInterval or repeated fetching.
    // Instead, only fetch once on mount OR only on user action.

    useEffect(() => {
        // If you still want to fetch once on mount, you can do so here:
        handleFetchSpots();
        // If you do not want to fetch on mount at all, just remove this line
        // and rely solely on a user clicking "Refresh".
    }, []);

    const handleFetchSpots = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const resp = await API.get("/parking");
            const data = resp.data as any[];
            const mapped: SpotRecord[] = data.map((spot) => ({
                spot_id: spot.label,
                type: spot.category,
                occupied: spot.occupied,
                geometry: spot.coordinates ? JSON.parse(spot.coordinates) : undefined,
                // if needed, spot.status = ...
            }));
            setSpots(mapped);
        } catch (err) {
            console.error("Error loading spots:", err);
            setError("Failed to load parking spots");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
    };

    const handleSpotSelect = (spotId: string) => {
        setSelectedSpotId(spotId);
    };

    // Filter logic example
    const filteredSpots = spots.filter((spot) =>
        spot.spot_id.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <AppBar position="fixed">
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <IconButton onClick={() => navigate("/user/profile")}>
                            <Avatar src={user?.profileImageUrl} alt={user?.name || "User"} />
                        </IconButton>
                        <Typography variant="h6">{user?.name || "User Dashboard"}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={liveOccupancy}
                                    onChange={() => setLiveOccupancy(!liveOccupancy)}
                                    color="secondary"
                                />
                            }
                            label="Live Occupancy"
                        />
                        {user?.role !== "ROLE_ADMIN" && (
                            <Button color="inherit" onClick={() => navigate("/user/my-reservations")}>
                                My Reservations
                            </Button>
                        )}
                        <Button color="inherit" onClick={handleLogout}>
                            Logout
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar />

            {/* Simple Refresh button above the main content */}
            <Box sx={{ p: 2 }}>
                <Button variant="contained" onClick={handleFetchSpots} disabled={isLoading}>
                    {isLoading ? "Refreshing..." : "Refresh Spots"}
                </Button>
            </Box>

            <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Main content (map, etc.) */}
                <Box sx={{ flex: 1, overflow: "auto" }}>
                    {isLoading && (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {!isLoading && !error && (
                        <MainArea
                            spots={filteredSpots}
                            selectedSpotId={selectedSpotId}
                            onSpotSelect={handleSpotSelect}
                        />
                    )}
                    {error && (
                        <Box sx={{ p: 2 }}>
                            <Typography color="error">{error}</Typography>
                        </Box>
                    )}
                </Box>

                {/* Right Panel */}
                <Box sx={{ width: 360, flexShrink: 0, height: "100%", overflow: "auto" }}>
                    <RightPanel
                        isOpen={true}
                        spots={filteredSpots}
                        selectedSpotId={selectedSpotId}
                        filterText={filterText}
                        onFilterChange={(e) => setFilterText(e.target.value)}
                        onSpotSelect={handleSpotSelect}
                        isLoading={isLoading}
                        error={error}
                    />
                </Box>
            </Box>
        </Box>
    );
}
