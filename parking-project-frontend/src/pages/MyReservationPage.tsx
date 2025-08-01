// src/pages/MyReservationsPage.tsx
import React, { useEffect, useState } from "react";
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    CircularProgress, 
    Container,
    Grid,
    Chip,
    Button,
    IconButton,
    Divider
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import API from "../api";
import { 
    parseBackendTime, 
    formatDisplayDate, 
    formatDisplayHour, 
    calculateDurationHours, 
    getTimeStatus, 
    formatRelativeTime 
} from "../utils/timeUtils";

interface Reservation {
    id: number;
    startTime: string;
    endTime: string;
    parkingSpot: {
        id: number;
        label: string;
    };
}

const MyReservationsPage: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMyReservations = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await API.get("/reservations/mine");
            setReservations(resp.data);
        } catch (err) {
            console.error("Failed to load my reservations:", err);
            setError("Không thể tải danh sách đặt chỗ.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelReservation = async (reservationId: number) => {
        try {
            await API.delete(`/reservations/${reservationId}`);
            // Refresh the list
            loadMyReservations();
        } catch (err) {
            console.error("Failed to cancel reservation", err);
        }
    };

    useEffect(() => {
        loadMyReservations();
    }, []);

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ 
                    textAlign: "center",
                    py: 8,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 3,
                    color: 'white'
                }}>
                    <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
                    <Typography variant="h6">⏳ Đang tải danh sách đặt chỗ...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ 
                    textAlign: "center",
                    py: 8,
                    backgroundColor: 'error.light',
                    color: 'error.contrastText',
                    borderRadius: 3
                }}>
                    <Typography variant="h6">❌ {error}</Typography>
                    <Button 
                        variant="contained" 
                        onClick={loadMyReservations}
                        sx={{ mt: 2, backgroundColor: 'white', color: 'error.main' }}
                    >
                        🔄 Thử lại
                    </Button>
                </Box>
            </Container>
        );
    }

    if (reservations.length === 0) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ 
                    textAlign: "center",
                    py: 8,
                    backgroundColor: '#f8f9fa',
                    borderRadius: 3,
                    border: '2px dashed #dee2e6'
                }}>
                    <LocalParkingIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: 'text.secondary' }}>
                        📭 Chưa có đặt chỗ nào
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Bạn chưa đặt chỗ đỗ xe nào. Hãy bắt đầu đặt chỗ đầu tiên!
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ 
                mb: 4, 
                p: 4, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 3,
                color: 'white',
                textAlign: 'center'
            }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                    🚗 Đặt chỗ của tôi
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Quản lý tất cả các chỗ đỗ xe bạn đã đặt
                </Typography>
                <Chip 
                    label={`${reservations.length} đặt chỗ`}
                    sx={{ 
                        mt: 2,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                />
            </Box>

            {/* Reservations Grid */}
            <Grid container spacing={3}>
                {reservations.map((res) => {
                    // Sử dụng utility functions để xử lý thời gian chính xác
                    const startTime = parseBackendTime(res.startTime);
                    const endTime = parseBackendTime(res.endTime);
                    const duration = calculateDurationHours(startTime, endTime);
                    const { isUpcoming, isActive, isPast } = getTimeStatus(startTime, endTime);

                    return (
                        <Grid item xs={12} md={6} lg={4} key={res.id}>
                            <Card sx={{ 
                                height: '100%',
                                borderRadius: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                border: isActive ? '3px solid #4caf50' : isPast ? '1px solid #e0e0e0' : '2px solid #2196f3',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                                },
                                transition: 'all 0.3s ease'
                            }}>
                                <CardContent sx={{ p: 3 }}>
                                    {/* Status Badge */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Chip 
                                            label={
                                                isActive ? '🟢 Đang sử dụng' : 
                                                isUpcoming ? '⏳ Sắp tới' : 
                                                '✅ Đã hoàn thành'
                                            }
                                            size="small"
                                            sx={{
                                                backgroundColor: 
                                                    isActive ? '#4caf50' : 
                                                    isUpcoming ? '#ff9800' : 
                                                    '#9e9e9e',
                                                color: 'white',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        {(isUpcoming || isActive) && (
                                            <IconButton 
                                                onClick={() => handleCancelReservation(res.id)}
                                                sx={{
                                                    backgroundColor: 'error.light',
                                                    color: 'error.main',
                                                    '&:hover': {
                                                        backgroundColor: 'error.main',
                                                        color: 'white'
                                                    }
                                                }}
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </Box>

                                    {/* Reservation Details */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 'bold',
                                            mb: 1,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            <LocalParkingIcon sx={{ mr: 1, color: 'primary.main' }} />
                                            Chỗ {res.parkingSpot.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            🏷️ Mã đặt chỗ: #{res.id}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Time Information */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <AccessTimeIcon sx={{ mr: 1, color: 'info.main', fontSize: 20 }} />
                                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                Thời gian đặt chỗ
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            📅 {formatDisplayDate(startTime)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            🕐 {formatDisplayHour(startTime)} - {formatDisplayHour(endTime)}
                                        </Typography>
                                        <Chip 
                                            label={`⏱️ ${duration.toFixed(1)} giờ`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ mr: 1 }}
                                        />
                                        {/* Thêm thông tin relative time */}
                                        <Chip 
                                            label={
                                                isUpcoming ? `Bắt đầu ${formatRelativeTime(startTime)}` :
                                                isActive ? `Kết thúc ${formatRelativeTime(endTime)}` :
                                                `Đã kết thúc ${formatRelativeTime(endTime)}`
                                            }
                                            size="small"
                                            variant="outlined"
                                            color={isUpcoming ? 'warning' : isActive ? 'success' : 'default'}
                                        />
                                    </Box>

                                    {/* Quick Actions */}
                                    {isUpcoming && (
                                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                🔔 Bắt đầu {formatRelativeTime(startTime)}
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Container>
    );
};

export default MyReservationsPage;
