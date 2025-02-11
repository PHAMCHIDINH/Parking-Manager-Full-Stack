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

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    /** Create reservations from the selected intervals. */
    const handleReserve = async () => {
        if (!spot) return;
        if (selectedIntervals.length === 0) return;

        for (const interval of selectedIntervals) {
            try {
                await API.post("/reservations", {
                    parkingSpotId: Number(spot.spot_id),
                    startTime: interval.start.toISOString(),
                    endTime: interval.end.toISOString(),
                });
            } catch (e) {
                console.error("Failed to create reservation", e);
            }
        }
        // Clear intervals, refresh
        setSelectedIntervals([]);
        fetchSpotHistory(spot.spot_id);
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
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Spot Details - {spot.spot_id}</DialogTitle>
            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab label="Reservation" />
                        <Tab label="Usage History" />
                        <Tab label="Spot Type" />
                    </Tabs>
                </Box>

                {/* TAB 0: Reservation */}
                <TabPanel value={tabValue} index={0}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Reserve this spot by selecting intervals below:
                    </Typography>
                    <WeekPicker onIntervalsChange={(intervals) => setSelectedIntervals(intervals)} />
                    {selectedIntervals.length > 0 && (
                        <Button sx={{ mt: 2 }} variant="contained" onClick={handleReserve}>
                            Reserve
                        </Button>
                    )}
                </TabPanel>

                {/* TAB 1: Usage History */}
                <TabPanel value={tabValue} index={1}>
                    {loadingHistory ? (
                        <Typography>Loading...</Typography>
                    ) : error ? (
                        <Typography color="error">{error}</Typography>
                    ) : (
                        <>
                            <Typography variant="subtitle2">Reservation History</Typography>
                            <Divider sx={{ mb: 2 }} />
                            {reservations.length === 0 ? (
                                <Typography>No reservations found for this spot.</Typography>
                            ) : (
                                <List>
                                    {reservations.map((r) => {
                                        const start = moment(r.startTime);
                                        const end = moment(r.endTime);
                                        const isOwnedByUser = user && String(user.id) === String(r.user.id);
                                        return (
                                            <React.Fragment key={r.id}>
                                                <ListItem
                                                    secondaryAction={
                                                        (isOwnedByUser || isAdmin) && (
                                                            <IconButton onClick={() => handleCancelReservation(r.id)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        )
                                                    }
                                                >
                                                    <Box>
                                                        <Typography variant="body2">
                                                            Reservation #{r.id} by {r.user.email}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {start.format("YYYY-MM-DD HH:mm")} - {end.format("YYYY-MM-DD HH:mm")}
                                                        </Typography>
                                                    </Box>
                                                </ListItem>
                                                <Divider />
                                            </React.Fragment>
                                        );
                                    })}
                                </List>
                            )}
                        </>
                    )}
                </TabPanel>

                {/* TAB 2: Spot Type */}
                <TabPanel value={tabValue} index={2}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Current category: <strong>{spot.type}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        If you're an admin, you might be able to update this (not fully implemented):
                    </Typography>
                    <VehicleTypeSelector
                        value={spot.type || "Car"}
                        onChange={(newType) => {
                            console.log("Change type to:", newType);
                            // If needed, do an API PUT to update the spot's category
                        }}
                    />
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SpotDetailsDialog;
