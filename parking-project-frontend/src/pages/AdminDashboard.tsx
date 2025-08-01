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
    CircularProgress, // ⭐ Thêm import này
} from "@mui/material";
import { 
    Dashboard as DashboardIcon,
    DirectionsCar as CarIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    LocalParking as ParkingIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../api";
import MainArea from "../components/MainArea";
import RightPanel from "../components/RightPanel";
import { SpotRecord } from "../types";
import RefreshIcon from "@mui/icons-material/Refresh";

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

    // for live occupancy
    const [liveOccupancy, setLiveOccupancy] = useState(true);

    // Statistics - tính toán với useMemo để tối ưu performance
    const statistics = useMemo(() => {
        const total = spots.length;
        const occupied = spots.filter(spot => spot.occupied).length;
        const available = total - occupied;
        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
        
        const typeStats = spots.reduce((acc, spot) => {
            acc[spot.type] = (acc[spot.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total,
            occupied,
            available,
            occupancyRate,
            typeStats
        };
    }, [spots]);

    const profileImageUrl =
        user?.profileImageUrl && !user.profileImageUrl.startsWith("http")
            ? baseURL + user.profileImageUrl
            : user?.profileImageUrl;

    // Tối ưu hóa việc load spots với useCallback
    const loadSpots = useCallback(async () => {
        setIsLoading(true);
        setError(null);
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
    }, []);

    // load all spots once
    useEffect(() => {
        loadSpots();
    }, [loadSpots]);

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
                    console.log("[AdminDashboard] Received WebSocket update:", payload);
                    if (Array.isArray(payload)) {
                        console.log("[AdminDashboard] Updating all spots:", payload.length);
                        setSpots(payload.map(toSpotRecord));
                    } else {
                        const updated = toSpotRecord(payload);
                        console.log("[AdminDashboard] Updating single spot:", updated.spot_id);
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
                console.log("[AdminDashboard] STOMP disconnected!");
            },
            onStompError: (frame) => {
                console.error("[AdminDashboard] STOMP error:", frame);
            },
        });
        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, [liveOccupancy]);

    const handleSpotSelect = useCallback((spotId: string) => {
        setSelectedSpotId(spotId);
    }, []);

    const handleLogout = useCallback(() => {
        logout();
    }, [logout]);

    // Tối ưu filter logic với useMemo
    const filteredSpots = useMemo(() => {
        return spots.filter((spot) => {
            const matchesText = spot.spot_id.toLowerCase().includes(filterText.toLowerCase());
            const matchesType =
                selectedTypes.length === 0 || selectedTypes.includes(spot.type.toLowerCase());
            return matchesText && matchesType;
        });
    }, [spots, filterText, selectedTypes]);

    // Tối ưu hóa handler cho filter
    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterText(e.target.value);
    }, []);

    const handleTypeFilter = useCallback((types: string[]) => {
        setSelectedTypes(types);
    }, []);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Enhanced AppBar with gradient and better styling */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                                    alt={user?.name || "Admin"}
                                    sx={{ width: 40, height: 40 }}
                                />
                            </IconButton>
                        </Tooltip>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DashboardIcon />
                                Admin Dashboard
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                Quản lý bãi đỗ xe thông minh
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* Statistics in AppBar */}
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
                                <Tooltip title="Đã sử dụng">
                                    <Chip 
                                        icon={<CarIcon />}
                                        label={`${statistics.occupied} đã đỗ`}
                                        sx={{ 
                                            backgroundColor: statistics.occupied > 0 ? 'rgba(244,67,54,0.8)' : 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                        size="small"
                                    />
                                </Tooltip>
                                <Tooltip title="Còn trống">
                                    <Chip 
                                        label={`${statistics.available} trống`}
                                        sx={{ 
                                            backgroundColor: statistics.available > 0 ? 'rgba(76,175,80,0.8)' : 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                        size="small"
                                    />
                                </Tooltip>
                                <Tooltip title="Tỷ lệ sử dụng">
                                    <Badge 
                                        badgeContent={`${statistics.occupancyRate}%`}
                                        color={statistics.occupancyRate > 80 ? "error" : statistics.occupancyRate > 50 ? "warning" : "success"}
                                        sx={{
                                            '& .MuiBadge-badge': {
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }
                                        }}
                                    >
                                        <Chip 
                                            label="Sử dụng"
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
                        <Grid container spacing={2} alignItems="center">
                            <Grid item>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={liveOccupancy}
                                            onChange={(e) => setLiveOccupancy(e.target.checked)}
                                            color="secondary"
                                        />
                                    }
                                    label="Live Occupancy"
                                    sx={{ color: 'white' }}
                                />
                            </Grid>
                            <Grid item>
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
                            </Grid>
                        </Grid>
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
                            isAdmin
                        />
                    </Container>
                </Box>
            </Box>
        </Box>
    );
}
