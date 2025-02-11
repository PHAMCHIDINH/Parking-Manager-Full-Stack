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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../api";
import MainArea from "../components/MainArea";
import RightPanel from "../components/RightPanel";
import { SpotRecord } from "../types";

import { Client, Message } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const baseURL = "http://localhost:8080";

/**
 * Convert raw spot from GET /parking to SpotRecord
 */
function toSpotRecord(spot: any): SpotRecord {
    return {
        spot_id: spot.label,
        type: spot.category,
        occupied: spot.occupied,
        geometry: spot.coordinates ? JSON.parse(spot.coordinates) : undefined,
    };
}

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [spots, setSpots] = useState<SpotRecord[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // filters
    const [filterText, setFilterText] = useState("");
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    // for live occupancy
    const [liveOccupancy, setLiveOccupancy] = useState(false);

    const profileImageUrl =
        user?.profileImageUrl && !user.profileImageUrl.startsWith("http")
            ? baseURL + user.profileImageUrl
            : user?.profileImageUrl;

    // load all spots once
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const resp = await API.get("/parking");
                const data = resp.data as any[];
                setSpots(data.map(toSpotRecord));
            } catch (err) {
                console.error("Error loading spots:", err);
                setError("Failed to load spots");
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // optional WebSocket
    useEffect(() => {
        if (!liveOccupancy) return;

        const socket = new SockJS("http://localhost:8080/ws");
        const stompClient = new Client({
            webSocketFactory: () => socket as any,
            onConnect: () => {
                console.log("[AdminDashboard] STOMP connected!");
                stompClient.subscribe("/topic/parking-updates", (msg: Message) => {
                    const payload = JSON.parse(msg.body);
                    if (Array.isArray(payload)) {
                        setSpots(payload.map(toSpotRecord));
                    } else {
                        const updated = toSpotRecord(payload);
                        setSpots((prev) => {
                            const idx = prev.findIndex((s) => s.spot_id === updated.spot_id);
                            if (idx >= 0) {
                                const copy = [...prev];
                                copy[idx] = updated;
                                return copy;
                            }
                            return [...prev, updated];
                        });
                    }
                });
            },
        });
        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, [liveOccupancy]);

    const handleSpotSelect = (spotId: string) => {
        setSelectedSpotId(spotId);
    };

    const handleLogout = () => {
        logout();
    };

    // filter logic
    const filteredSpots = spots.filter((spot) => {
        const matchesText = spot.spot_id.toLowerCase().includes(filterText.toLowerCase());
        const matchesType =
            selectedTypes.length === 0 || selectedTypes.includes(spot.type.toLowerCase());
        return matchesText && matchesType;
    });

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <AppBar position="fixed">
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <IconButton onClick={() => navigate("/user/profile")}>
                            <Avatar src={profileImageUrl || ""} alt={user?.name || "Admin"} />
                        </IconButton>
                        <Typography variant="h6">Admin Dashboard</Typography>
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
                        <Button color="inherit" onClick={handleLogout}>
                            Logout
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* Main */}
                <Box sx={{ flex: 1, overflow: "auto" }}>
                    <MainArea
                        spots={filteredSpots}
                        selectedSpotId={selectedSpotId}
                        onSpotSelect={handleSpotSelect}
                    />
                </Box>

                {/* Right Panel, pass isAdmin as well */}
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
                        isAdmin
                    />
                </Box>
            </Box>
        </Box>
    );
}
