// src/pages/MyReservationsPage.tsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, CircularProgress } from "@mui/material";
import API from "../api";

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

    useEffect(() => {
        const loadMyReservations = async () => {
            setLoading(true);
            setError(null);
            try {
                const resp = await API.get("/reservations/mine");
                setReservations(resp.data);
            } catch (err: any) {
                console.error("Failed to load my reservations:", err);
                setError("Could not load reservations.");
            } finally {
                setLoading(false);
            }
        };
        loadMyReservations();
    }, []);

    if (loading) {
        return (
            <Box sx={{ p: 4, textAlign: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    if (reservations.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography>You have no reservations.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                My Reservations
            </Typography>
            {reservations.map((res) => {
                return (
                    <Card key={res.id} sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="h6">
                                Reservation #{res.id} for Spot {res.parkingSpot.label}
                            </Typography>
                            <Typography>
                                Start: {new Date(res.startTime).toLocaleString()}
                            </Typography>
                            <Typography>
                                End: {new Date(res.endTime).toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );
};

export default MyReservationsPage;
