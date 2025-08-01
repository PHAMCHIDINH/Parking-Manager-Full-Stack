import React, { useEffect, useState, useCallback, useMemo } from "react";
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
    Badge,
    Tooltip,
    Fade,
    Paper,
    Container,
    Grid,
    alpha,
    CircularProgress, // ⭐ Thêm import này
} from "@mui/material";
import { 
    Person as PersonIcon,
    DirectionsCar as CarIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    LocalParking as ParkingIcon,
    BookOnline as BookIcon,
    Schedule as ScheduleIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";
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
        status: string; // ⭐ Backend dùng "status", không phải "occupied"
        coordinates?: string 
    };
    return {
        spot_id: spotData.label,
        type: spotData.category,
        occupied: spotData.status === "OCCUPIED", // ⭐ Convert status thành boolean
        geometry: spotData.coordinates ? JSON.parse(spotData.coordinates) : undefined,
    };
}

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

    // Fetch initial data with optimized loading
    useEffect(() => {
        loadSpots();
    }, [loadSpots]);

    // WebSocket for real-time updates
    useEffect(() => {
        if (!liveOccupancy) {
            console.log("[UserDashboard] Live occupancy disabled, skipping WebSocket");
            return;
        }

        console.log("[UserDashboard] Setting up WebSocket connection...");
        const socket = new SockJS("http://localhost:8080/ws");
        const stompClient = new Client({
            webSocketFactory: () => socket as any,
            debug: (str) => {
                console.log("[UserDashboard] STOMP Debug:", str);
            },
            onConnect: () => {
                console.log("[UserDashboard] STOMP connected successfully!");
                stompClient.subscribe("/topic/parking-updates", (msg: Message) => {
                    const payload = JSON.parse(msg.body);
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
        });
        
        console.log("[UserDashboard] Activating STOMP client...");
        stompClient.activate();

        return () => {
            console.log("[UserDashboard] Deactivating STOMP client...");
            stompClient.deactivate();
        };
    }, [liveOccupancy]);

    const handleFetchSpots = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const resp = await API.get("/parking");
            const data = resp.data as Array<any>;
            setSpots(data.map(toSpotRecord));
        } catch (err) {
            console.error("Error loading spots:", err);
            setError("Failed to load parking spots");
        } finally {
            setIsLoading(false);
        }
    };

    const baseURL = "http://localhost:8080";
    const profileImageUrl =
        user?.profileImageUrl && !user.profileImageUrl.startsWith("http")
            ? baseURL + user.profileImageUrl
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
            {/* Enhanced AppBar for User */}
            <AppBar 
                position="fixed"
                sx={{ 
                    background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
            >
                <Toolbar sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Tooltip title="Hồ sơ cá nhân">
                            <IconButton 
                                onClick={() => navigate("/user/profile")}
                                sx={{ 
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    '&:hover': { 
                                        border: '2px solid rgba(255,255,255,0.6)',
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Avatar 
                                    src={profileImageUrl || ""} 
                                    alt={user?.name || "User"}
                                    sx={{ width: 40, height: 40 }}
                                />
                            </IconButton>
                        </Tooltip>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon />
                                {user?.name || "User Dashboard"}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                Tìm kiếm và đặt chỗ đỗ xe
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* User Statistics */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Fade in={!isLoading}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Tổng số chỗ đỗ">
                                    <Chip 
                                        icon={<ParkingIcon />}
                                        label={`${statistics.total} chỗ`}
                                        sx={{ 
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                        size="small"
                                    />
                                </Tooltip>
                                <Tooltip title="Chỗ trống">
                                    <Chip 
                                        label={`${statistics.available} trống`}
                                        sx={{ 
                                            backgroundColor: statistics.available > 0 ? 'rgba(76,175,80,0.8)' : 'rgba(244,67,54,0.8)',
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                        size="small"
                                    />
                                </Tooltip>
                                <Tooltip title="Tỷ lệ khả dụng">
                                    <Badge 
                                        badgeContent={`${statistics.availabilityRate}%`}
                                        color={statistics.availabilityRate > 50 ? "success" : statistics.availabilityRate > 20 ? "warning" : "error"}
                                        sx={{
                                            '& .MuiBadge-badge': {
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }
                                        }}
                                    >
                                        <Chip 
                                            label="Khả dụng"
                                            variant="outlined"
                                            sx={{ 
                                                borderColor: 'rgba(255,255,255,0.5)',
                                                color: 'white'
                                            }}
                                            size="small"
                                        />
                                    </Badge>
                                </Tooltip>
                            </Box>
                        </Fade>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Tooltip title="Đặt chỗ của tôi">
                            <Button 
                                color="inherit" 
                                onClick={() => navigate("/user/my-reservations")}
                                startIcon={<BookIcon />}
                                variant="outlined"
                                sx={{ 
                                    borderColor: 'rgba(255,255,255,0.5)',
                                    '&:hover': { 
                                        borderColor: 'white',
                                        backgroundColor: 'rgba(255,255,255,0.1)'
                                    }
                                }}
                            >
                                Đặt chỗ
                            </Button>
                        </Tooltip>
                        
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={liveOccupancy}
                                    onChange={(e) => setLiveOccupancy(e.target.checked)}
                                    color="secondary"
                                />
                            }
                            label="Live Updates"
                            sx={{ color: 'white' }}
                        />
                        <Button
                            variant="outlined"
                            onClick={loadSpots}
                            disabled={isLoading}
                            startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.5)',
                                color: 'white',
                                '&:hover': {
                                    borderColor: 'white',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                },
                                '&:disabled': {
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    color: 'rgba(255,255,255,0.5)',
                                }
                            }}
                        >
                            {isLoading ? 'Đang tải...' : 'Refresh Spots'}
                        </Button>
                        <Button 
                            color="inherit" 
                            onClick={handleLogout}
                            variant="outlined"
                            sx={{ 
                                borderColor: 'rgba(255,255,255,0.5)',
                                '&:hover': { 
                                    borderColor: 'white',
                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
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
                                    top: 20,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 1000,
                                    p: 2,
                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 3,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                                }}
                            >
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ParkingIcon color="primary" />
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
                                    top: 20,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 1000,
                                    p: 2,
                                    backgroundColor: 'rgba(244,67,54,0.1)',
                                    borderLeft: '4px solid #f44336',
                                    borderRadius: 1
                                }}
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

                {/* Enhanced Right Panel */}
                <Box sx={{ 
                    width: 380, 
                    flexShrink: 0, 
                    height: "100%", 
                    overflow: "auto",
                    borderLeft: '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: '#fafafa'
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
