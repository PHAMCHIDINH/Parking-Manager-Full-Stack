import React, { useEffect, useState } from "react";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import API from "../api";
import { useAuth } from "../contexts/AuthContext";
import LeftPanel from "../components/LeftPanel";
import MainArea from "../components/MainArea";
import RightPanel from "../components/RightPanel";
import ToggleButton from "../components/ToggleButton";
import { SpotRecord } from "../types";

const AdminDashboard: React.FC = () => {
    const { logout } = useAuth();
    const [spots, setSpots] = useState<SpotRecord[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterText, setFilterText] = useState("");
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [leftTab, setLeftTab] = useState(0);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

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
                setError("Failed to load parking spots");
            } finally {
                setIsLoading(false);
            }
        };
        loadSpots();
    }, []);

    const handleSpotSelect = (spotId: string) => {
        setSelectedSpotId(spotId);
    };

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Fixed Top Bar */}
            <AppBar position="fixed">
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ typography: "h6" }}>Admin Dashboard</Box>
                    <Button color="inherit" onClick={logout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Toolbar />

            {/* Content below the AppBar */}
            <Box sx={{
                flex: 1,
                display: "flex",
                overflow: "hidden",
                position: "relative",
                height: "calc(100vh - 64px)"
            }}>
                {/* Left Panel */}
                <Box sx={{
                    width: 360,
                    flexShrink: 0,
                    position: "relative",
                    height: "100%",
                    overflow: "auto"
                }}>
                    <LeftPanel
                        isOpen={isLeftPanelOpen}
                        leftTab={leftTab}
                        onTabChange={(e, newValue) => setLeftTab(newValue)}
                    />
                    <ToggleButton
                        side="left"
                        isOpen={isLeftPanelOpen}
                        onToggle={() => setIsLeftPanelOpen((prev) => !prev)}
                    />
                </Box>

                {/* Main Area */}
                <Box sx={{ flex: 1, overflow: "auto", height: "100%" }}>
                    <MainArea
                        selectedSpotId={selectedSpotId}
                        onSpotSelect={handleSpotSelect}
                    />
                </Box>

                {/* Right Panel */}
                <Box sx={{
                    width: 360,
                    flexShrink: 0,
                    position: "relative",
                    height: "100%",
                    overflow: "auto"
                }}>
                    <RightPanel
                        isOpen={isRightPanelOpen}
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
                    <ToggleButton
                        side="right"
                        isOpen={isRightPanelOpen}
                        onToggle={() => setIsRightPanelOpen((prev) => !prev)}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default AdminDashboard;