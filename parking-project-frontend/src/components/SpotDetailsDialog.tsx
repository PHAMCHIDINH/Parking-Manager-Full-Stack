import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Tabs,
    Tab,
    Typography,
    List,
    ListItem,
    IconButton,
    Divider
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import moment from "moment";
import API from "../api";
import WeekPicker, { TimeInterval } from "./WeekPicker";
import VehicleTypeSelector from "./VehicleTypeSelector";
import { useAuth } from "../contexts/AuthContext";
import { SpotRecord } from "../types";
import { formatForBackend } from "../utils/timeUtils";

/** The shape of a single reservation from backend. */
interface ReservationData {
    id: number;
    user: { id: number; email: string };
    parkingSpot: { id: number; label: string };
    startTime: string;
    endTime: string;
}

interface SpotDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    spot: SpotRecord | null;
    isAdmin?: boolean;
}

/** Simple tab panel helper */
function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
    const { children, value, index } = props;
    return <div hidden={value !== index}>{value === index && <Box sx={{ p: 2 }}>{children}</Box>}</div>;
}

const SpotDetailsDialog: React.FC<SpotDetailsDialogProps> = ({
                                                                 open,
                                                                 onClose,
                                                                 spot,
                                                                 isAdmin = false
                                                             }) => {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [reservations, setReservations] = useState<ReservationData[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingReservation, setLoadingReservation] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // For creating new reservations
    const [selectedIntervals, setSelectedIntervals] = useState<TimeInterval[]>([]);

    useEffect(() => {
        if (spot && open) {
            fetchSpotHistory(spot.spot_id);
        }
    }, [spot, open]);

    /** Load existing reservations for this spot from our new endpoint. */
    const fetchSpotHistory = async (spotId: string) => {
        setError(null);
        setLoadingHistory(true);
        try {
            const resp = await API.get(`/reservations/spot-history/${spotId}`);
            setReservations(resp.data);
        } catch (err) {
            console.error("Failed to load spot history:", err);
            setError("Could not load reservation history");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    /** Create reservations from the selected intervals. */
    const handleReserve = async () => {
        if (!spot) return;
        if (selectedIntervals.length === 0) return;

        setLoadingReservation(true);
        setError(null);

        try {
            for (const interval of selectedIntervals) {
                await API.post("/reservations", {
                    parkingSpotId: Number(spot.spot_id),
                    startTime: formatForBackend(interval.start),
                    endTime: formatForBackend(interval.end),
                });
            }
            // Clear intervals, refresh
            setSelectedIntervals([]);
            fetchSpotHistory(spot.spot_id);
        } catch (e) {
            console.error("Failed to create reservation", e);
            setError("Failed to create reservation. Please try again.");
        } finally {
            setLoadingReservation(false);
        }
    };

    /** Cancel an existing reservation. If admin => force-cancel endpoint. */
    const handleCancelReservation = async (reservationId: number) => {
        try {
            if (isAdmin) {
                await API.delete(`/reservations/admin/force-cancel/${reservationId}`);
            } else {
                await API.delete(`/reservations/${reservationId}`);
            }
            // Refresh
            if (spot) {
                fetchSpotHistory(spot.spot_id);
            }
        } catch (err) {
            console.error("Failed to cancel reservation", err);
        }
    };

    if (!spot) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="lg" 
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                }
            }}
        >
            <DialogTitle sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textAlign: 'center',
                py: 3,
                fontSize: '1.5rem',
                fontWeight: 'bold'
            }}>
                🅿️ Chi tiết chỗ đỗ xe - {spot.spot_id}
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ 
                    borderBottom: 1, 
                    borderColor: "divider",
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': {
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                py: 2,
                                '&.Mui-selected': {
                                    color: 'primary.main'
                                }
                            }
                        }}
                    >
                        <Tab label="🎯 Đặt chỗ" />
                        <Tab label="📊 Lịch sử" />
                        <Tab label="🚗 Loại xe" />
                    </Tabs>
                </Box>

                {/* TAB 0: Reservation */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ 
                            mb: 3, 
                            p: 3, 
                            backgroundColor: 'primary.light', 
                            color: 'white',
                            borderRadius: 2,
                            textAlign: 'center'
                        }}>
                            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                                🎯 Đặt chỗ đỗ xe
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                Chọn thời gian bạn muốn đỗ xe tại vị trí này
                            </Typography>
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                gap: 2,
                                flexWrap: 'wrap'
                            }}>
                                <Typography variant="body2" sx={{ 
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 1
                                }}>
                                    ⏱️ Tối đa 3 khoảng thời gian
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 1
                                }}>
                                    🕐 Tối đa 8 giờ/lần đặt
                                </Typography>
                            </Box>
                        </Box>
                        
                        <WeekPicker 
                            onIntervalsChange={(intervals) => setSelectedIntervals(intervals)}
                            maxReservationHours={8}
                            maxIntervals={3}
                            disabled={loadingReservation}
                        />
                        
                        {selectedIntervals.length > 0 && (
                            <Box sx={{ 
                                mt: 3, 
                                textAlign: 'center',
                                p: 3,
                                backgroundColor: 'success.light',
                                borderRadius: 2
                            }}>
                                <Button 
                                    variant="contained" 
                                    size="large"
                                    onClick={handleReserve}
                                    disabled={loadingReservation}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        borderRadius: 2,
                                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
                                        }
                                    }}
                                >
                                    {loadingReservation ? '⏳ Đang đặt chỗ...' : '✅ Xác nhận đặt chỗ'}
                                </Button>
                            </Box>
                        )}
                        
                        {error && (
                            <Box sx={{ 
                                mt: 2, 
                                p: 2, 
                                backgroundColor: 'error.light',
                                color: 'error.contrastText',
                                borderRadius: 1,
                                textAlign: 'center'
                            }}>
                                <Typography variant="body2">
                                    ❌ {error}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </TabPanel>

                {/* TAB 1: Usage History */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 3 }}>
                        {loadingHistory ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="h6" color="primary.main">
                                    ⏳ Đang tải lịch sử...
                                </Typography>
                            </Box>
                        ) : error ? (
                            <Box sx={{ 
                                textAlign: 'center', 
                                py: 4,
                                backgroundColor: 'error.light',
                                borderRadius: 2,
                                color: 'error.contrastText'
                            }}>
                                <Typography variant="h6">❌ {error}</Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ 
                                    mb: 3, 
                                    p: 3, 
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    borderRadius: 2,
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        📊 Lịch sử đặt chỗ
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                                        Tất cả các lần đặt chỗ tại vị trí này
                                    </Typography>
                                </Box>
                                
                                {reservations.length === 0 ? (
                                    <Box sx={{ 
                                        textAlign: 'center', 
                                        py: 6,
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: 2,
                                        border: '2px dashed #dee2e6'
                                    }}>
                                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                            📭 Chưa có lịch sử đặt chỗ
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Vị trí này chưa được ai đặt chỗ
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List sx={{ backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                        {reservations.map((r, index) => {
                                            const start = moment(r.startTime);
                                            const end = moment(r.endTime);
                                            const isOwnedByUser = user && String(user.id) === String(r.user.id);
                                            const duration = end.diff(start, 'hours', true);
                                            
                                            return (
                                                <React.Fragment key={r.id}>
                                                    <ListItem
                                                        sx={{
                                                            mb: 1,
                                                            backgroundColor: 'white',
                                                            borderRadius: 1,
                                                            border: '1px solid #e0e0e0',
                                                            '&:hover': {
                                                                backgroundColor: '#f5f5f5'
                                                            }
                                                        }}
                                                        secondaryAction={
                                                            (isOwnedByUser || isAdmin) && (
                                                                <IconButton 
                                                                    onClick={() => handleCancelReservation(r.id)}
                                                                    sx={{
                                                                        backgroundColor: 'error.light',
                                                                        color: 'error.main',
                                                                        '&:hover': {
                                                                            backgroundColor: 'error.main',
                                                                            color: 'white'
                                                                        }
                                                                    }}
                                                                >
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            )
                                                        }
                                                    >
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body1" sx={{ 
                                                                fontWeight: 'bold',
                                                                mb: 1,
                                                                color: isOwnedByUser ? 'primary.main' : 'text.primary'
                                                            }}>
                                                                {isOwnedByUser ? '👤 Của bạn' : '👥 Người khác'} - Đặt chỗ #{r.id}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                                📧 {r.user.email}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                                📅 {start.format("DD/MM/YYYY")} • ⏰ {start.format("HH:mm")} - {end.format("HH:mm")}
                                                            </Typography>
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    backgroundColor: 'primary.light',
                                                                    color: 'white',
                                                                    px: 1,
                                                                    py: 0.5,
                                                                    borderRadius: 1,
                                                                    fontWeight: 'bold'
                                                                }}
                                                            >
                                                                ⏱️ {duration.toFixed(1)} giờ
                                                            </Typography>
                                                        </Box>
                                                    </ListItem>
                                                    {index < reservations.length - 1 && <Divider sx={{ my: 1 }} />}
                                                </React.Fragment>
                                            );
                                        })}
                                    </List>
                                )}
                            </>
                        )}
                    </Box>
                </TabPanel>

                {/* TAB 2: Spot Type */}
                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ 
                            mb: 3, 
                            p: 3, 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            borderRadius: 2,
                            textAlign: 'center'
                        }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                🚗 Loại xe phù hợp
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Thông tin về loại xe có thể đỗ tại vị trí này
                            </Typography>
                        </Box>
                        
                        <Box sx={{ 
                            p: 3, 
                            backgroundColor: 'info.light',
                            color: 'info.contrastText',
                            borderRadius: 2,
                            mb: 3,
                            textAlign: 'center'
                        }}>
                            <Typography variant="h5" sx={{ 
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                🏷️ Loại hiện tại: <strong>{spot.type || "Xe hơi"}</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Vị trí này được thiết kế cho loại xe trên
                            </Typography>
                        </Box>
                        
                        {isAdmin && (
                            <Box sx={{ 
                                p: 3,
                                backgroundColor: 'warning.light',
                                borderRadius: 2,
                                mb: 3
                            }}>
                                <Typography variant="body1" sx={{ 
                                    mb: 2,
                                    fontWeight: 'medium',
                                    color: 'warning.contrastText'
                                }}>
                                    🔧 Quản trị viên có thể thay đổi loại xe:
                                </Typography>
                                <VehicleTypeSelector
                                    value={spot.type || "Car"}
                                    onChange={(newType) => {
                                        console.log("Thay đổi loại xe thành:", newType);
                                        // Có thể gọi API PUT để cập nhật loại xe
                                    }}
                                />
                            </Box>
                        )}
                        
                        <Box sx={{
                            p: 3,
                            backgroundColor: '#f8f9fa',
                            borderRadius: 2,
                            border: '1px solid #e9ecef'
                        }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                💡 <strong>Lưu ý:</strong> Vui lòng đảm bảo xe của bạn phù hợp với loại chỗ đỗ đã chọn
                                để tránh những bất tiện không mong muốn.
                            </Typography>
                        </Box>
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions sx={{ 
                p: 3, 
                backgroundColor: 'grey.100',
                justifyContent: 'center'
            }}>
                <Button 
                    onClick={onClose}
                    variant="contained"
                    size="large"
                    sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        backgroundColor: 'grey.600',
                        '&:hover': {
                            backgroundColor: 'grey.700'
                        }
                    }}
                >
                    🚪 Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SpotDetailsDialog;
