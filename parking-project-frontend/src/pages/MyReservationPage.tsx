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
    Divider
} from "@mui/material";
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
                <Box sx={{ textAlign: "center", py: 8 }}>
                    <CircularProgress sx={{ mb: 2 }} size={60} />
                    <Typography variant="h6">Đang tải danh sách đặt chỗ...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ textAlign: "center", py: 8 }}>
                    <Typography variant="h6" color="error">{error}</Typography>
                    <Button variant="outlined" onClick={loadMyReservations} sx={{ mt: 2 }}>
                        Thử lại
                    </Button>
                </Box>
            </Container>
        );
    }

    if (reservations.length === 0) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ textAlign: "center", py: 8 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                        Chưa có đặt chỗ nào
                    </Typography>
                    <Typography variant="body1" color="text.secondary">Bạn chưa đặt chỗ đỗ xe nào.</Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Đặt chỗ của tôi
                </Typography>
                <Chip label={`${reservations.length} đặt chỗ`} variant="outlined" />
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
                                    boxShadow: 1,
                                    border: '1px solid',
                                    borderColor: isActive ? 'success.light' : isPast ? 'divider' : 'primary.light',
                                '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 3
                                },
                                transition: 'all 0.3s ease'
                            }}>
                                <CardContent sx={{ p: 3 }}>
                                    {/* Status Badge */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Chip 
                                            label={isActive ? 'Đang sử dụng' : isUpcoming ? 'Sắp tới' : 'Đã hoàn thành'}
                                            size="small"
                                            color={isActive ? 'success' : isUpcoming ? 'warning' : 'default'}
                                        />
                                        {(isUpcoming || isActive) && (
                                            <Button onClick={() => handleCancelReservation(res.id)} size="small" color="error" variant="text">
                                                Hủy
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Reservation Details */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                            Chỗ {res.parkingSpot.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Mã đặt chỗ: #{res.id}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Time Information */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                                            Thời gian đặt chỗ
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            {formatDisplayDate(startTime)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {formatDisplayHour(startTime)} - {formatDisplayHour(endTime)}
                                        </Typography>
                                        <Chip label={`${duration.toFixed(1)} giờ`} size="small" variant="outlined" sx={{ mr: 1 }} />
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
                                                Bắt đầu {formatRelativeTime(startTime)}
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
