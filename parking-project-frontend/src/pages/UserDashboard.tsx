import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
    Chip,
    Tooltip,
    Fade,
    Paper,
    Container,
    CircularProgress,
} from "@mui/material";
// Icons removed to keep UI minimal and blue/white themed
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../api";
import MainArea from "../components/MainArea";
import RightPanel from "../components/RightPanel";
import { SpotRecord } from "../types";

import { Client, Message } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Convert raw spot from GET /parking to SpotRecord
 */
function toSpotRecord(spot: unknown): SpotRecord {
    const spotData = spot as {
        id: number;
        label: string;
        category: string;
        status?: string; // Backend có thể gửi status hoặc occupied
        occupied?: boolean;
        coordinates?: string;
        imageCoordinates?: string;
    };
    const occupiedBool = typeof spotData.occupied === 'boolean'
        ? spotData.occupied
        : spotData.status === 'OCCUPIED';
    const geometryJson = spotData.coordinates || spotData.imageCoordinates;
    return {
        spot_id: spotData.label,
        type: spotData.category,
        occupied: !!occupiedBool,
        geometry: geometryJson ? JSON.parse(geometryJson) : undefined,
    };
}

export default function UserDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [spots, setSpots] = useState<SpotRecord[]>([]);
    const [selectedSpotId, setSelectedSpotId] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastWsAt, setLastWsAt] = useState<number>(() => Date.now());
    const [lastPollAt, setLastPollAt] = useState<number>(0);

    // For text filtering
    const [filterText, setFilterText] = useState("");

    // If you want real-time, you might keep a switch, but not auto‐poll.
    const [liveOccupancy, setLiveOccupancy] = useState(true);

    // Statistics cho user
    const statistics = useMemo(() => {
        const total = spots.length;
        const available = spots.filter(spot => !spot.occupied).length;
        const occupied = total - available;
        const availabilityRate = total > 0 ? Math.round((available / total) * 100) : 0;
        
        return {
            total,
            available,
            occupied,
            availabilityRate
        };
    }, [spots]);

    // Tối ưu hóa việc load spots
    const loadSpots = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const resp = await API.get("/parking");
            const data = resp.data as unknown[];
            setSpots(data.map(toSpotRecord));
        } catch (err) {
            console.error("Error loading spots:", err);
            setError("Không thể tải dữ liệu bãi đỗ xe");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Background refresh without spinner (used by polling fallback)
    const refreshSpots = useCallback(async () => {
        try {
            const resp = await API.get("/parking");
            const data = resp.data as unknown[];
            setSpots(data.map(toSpotRecord));
        } catch (err) {
            console.error("Error background refreshing spots:", err);
        }
    }, []);

    // Fetch initial data with optimized loading
    useEffect(() => {
        loadSpots();
    }, [loadSpots]);

    // WebSocket for real-time updates
    const wsInitializedRef = useRef(false);
    useEffect(() => {
        if (!liveOccupancy) {
            console.log("[UserDashboard] Live occupancy disabled, skipping WebSocket");
            return;
        }
        if (wsInitializedRef.current) {
            // Avoid double-connect in React 18 StrictMode (dev)
            console.log("[UserDashboard] WebSocket already initialized (StrictMode guard)");
            return;
        }
        wsInitializedRef.current = true;

        console.log("[UserDashboard] Setting up WebSocket connection...");
        const urls = [
            "/ws", // same-origin or via Vite proxy in dev
            "http://localhost:8080/ws", // fallback direct to backend
        ];
        let attemptIndex = 0;
        let client: Client | null = null;

        const connect = (url: string) => {
            console.log(`[UserDashboard] Trying WebSocket: ${url}`);
            const socket = new SockJS(url);
            const c = new Client({
                webSocketFactory: () => socket as unknown as WebSocket,
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                debug: (str) => {
                    console.log("[UserDashboard] STOMP Debug:", str);
                },
        onConnect: () => {
                    console.log("[UserDashboard] STOMP connected successfully!");
                    c.subscribe("/topic/parking-updates", (msg: Message) => {
                        const payload = JSON.parse(msg.body);
            setLastWsAt(Date.now());
                        console.log("[UserDashboard] Received WebSocket update:", payload);
                        if (Array.isArray(payload)) {
                            console.log("[UserDashboard] Updating all spots:", payload.length);
                            setSpots(payload.map(toSpotRecord));
                        } else {
                            const updated = toSpotRecord(payload);
                            console.log("[UserDashboard] Updating single spot:", updated.spot_id);
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
                onDisconnect: () => {
                    console.log("[UserDashboard] STOMP disconnected!");
                },
                onStompError: (frame) => {
                    console.error("[UserDashboard] STOMP error:", frame);
                },
                onWebSocketError: (event) => {
                    console.error("[UserDashboard] WebSocket error:", event);
                },
                onWebSocketClose: () => {
                    console.warn("[UserDashboard] WebSocket closed.");
                    if (attemptIndex < urls.length - 1) {
                        attemptIndex += 1;
                        console.warn(`[UserDashboard] Retrying with fallback: ${urls[attemptIndex]}`);
                        setTimeout(() => {
                            c.deactivate();
                            client = connect(urls[attemptIndex]);
                        }, 250);
                    }
                }
            });
            console.log("[UserDashboard] Activating STOMP client...");
            c.activate();
            return c;
        };

    client = connect(urls[attemptIndex]);

        return () => {
            console.log("[UserDashboard] Deactivating STOMP client...");
            if (client) client.deactivate();
            wsInitializedRef.current = false;
        };
    }, [liveOccupancy]);

    // Polling fallback: if no WS message for 15s, refresh at most every 15s (no spinner)
    useEffect(() => {
        if (!liveOccupancy) return;
        const id = setInterval(() => {
            const now = Date.now();
            if (now - lastWsAt > 15000 && now - lastPollAt > 15000) {
                console.log("[UserDashboard] WS quiet, background polling /parking as fallback...");
                setLastPollAt(now);
                refreshSpots();
            }
        }, 5000);
        return () => clearInterval(id);
    }, [liveOccupancy, lastWsAt, lastPollAt, refreshSpots]);

    // Note: explicit manual fetch function removed to avoid duplication with loadSpots

    const profileImageUrl =
        user?.profileImageUrl && !user.profileImageUrl.startsWith("http")
            ? window.location.origin.replace(/\/+$/, "") + user.profileImageUrl
            : user?.profileImageUrl;

    const handleSpotSelect = useCallback((spotId: string) => {
        setSelectedSpotId(spotId);
    }, []);

    const handleLogout = useCallback(() => {
        logout();
    }, [logout]);

    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterText(e.target.value);
    }, []);

    // Tối ưu filter logic
    const filteredSpots = useMemo(() => {
        return spots.filter((spot) =>
            spot.spot_id.toLowerCase().includes(filterText.toLowerCase())
        );
    }, [spots, filterText]);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* AppBar: blue and white theme */}
            <AppBar position="fixed" sx={{ backgroundColor: 'primary.main' }}>
                <Toolbar sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Tooltip title="Hồ sơ cá nhân">
                            <IconButton onClick={() => navigate("/user/profile")}>
                                <Avatar 
                                    src={profileImageUrl || ""} 
                                    alt={user?.name || "User"}
                                    sx={{ width: 40, height: 40 }}
                                />
                            </IconButton>
                        </Tooltip>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'common.white' }}>
                                {user?.name || "User Dashboard"}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'common.white', opacity: 0.9 }}>
                                Tìm kiếm và đặt chỗ đỗ xe
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* User Statistics - minimal, neutral */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Fade in={!isLoading}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip label={`Tổng: ${statistics.total}`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                                <Chip label={`Trống: ${statistics.available}`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                                <Chip label={`Khả dụng: ${statistics.availabilityRate}%`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                            </Box>
                        </Fade>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Button onClick={() => navigate("/user/my-reservations")} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}>
                            Đặt chỗ
                        </Button>
                        
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={liveOccupancy}
                                    onChange={(e) => setLiveOccupancy(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Live Updates"
                        />
                        <Button
                            variant="outlined"
                            onClick={loadSpots}
                            disabled={isLoading}
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
                        >
                            {isLoading ? <CircularProgress size={16} color="inherit" /> : 'Làm mới'}
                        </Button>
                        <Button onClick={handleLogout} variant="text" color="primary">
                            Đăng xuất
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar />

            <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Main Area với loading state cải thiện */}
                <Box sx={{ flex: 1, overflow: "auto", position: 'relative' }}>
                    {isLoading && (
                        <Fade in={isLoading}>
                            <Paper
                                sx={{
                                    position: 'absolute',
                                    top: 16,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 1000,
                                    p: 1.5,
                                    borderRadius: 2,
                                }}
                                elevation={0}
                                variant="outlined"
                            >
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Đang tải dữ liệu bãi đỗ xe...
                                </Typography>
                            </Paper>
                        </Fade>
                    )}
                    
                    {error && (
                        <Fade in={!!error}>
                            <Paper
                                sx={{
                                    position: 'absolute',
                                    top: 16,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 1000,
                                    p: 1.5,
                                    borderRadius: 2,
                                    borderLeft: '4px solid',
                                    borderColor: 'error.main',
                                    bgcolor: 'background.paper',
                                }}
                                elevation={0}
                                variant="outlined"
                            >
                                <Typography variant="body2" color="error">
                                    {error}
                                </Typography>
                            </Paper>
                        </Fade>
                    )}
                    
                    <MainArea
                        spots={filteredSpots}
                        selectedSpotId={selectedSpotId}
                        onSpotSelect={handleSpotSelect}
                    />
                </Box>

                {/* Right Panel */}
                <Box sx={{ 
                    width: { xs: '100%', md: 420, lg: 500 },
                    flexShrink: 0, 
                    height: "100%", 
                    overflow: "auto",
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.default'
                }}>
                    <Container sx={{ p: 0 }}>
                        <RightPanel
                            isOpen={true}
                            spots={filteredSpots}
                            selectedSpotId={selectedSpotId}
                            filterText={filterText}
                            onFilterChange={handleFilterChange}
                            onSpotSelect={handleSpotSelect}
                            isLoading={isLoading}
                            error={error}
                        />
                    </Container>
                </Box>
            </Box>
        </Box>
    );
}
