import React, { useState, useMemo } from "react";
import {
    Box,
    Typography,
    List,
    ListItem,
    Chip,
    Divider,
    TextField
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

// A single usage record
export interface UsageRecord {
    id: number;
    user: string;
    start: Date;
    end: Date;
    color?: string;
}

// Props for the SpotUsageHistory component
interface SpotUsageHistoryProps {
    usageData: UsageRecord[];
}

const SpotUsageHistory: React.FC<SpotUsageHistoryProps> = ({ usageData }) => {
    // Start and End Date filters using Dayjs
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, "days"));
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());

    // Filter usageData based on startDate and endDate
    const filteredHistory = useMemo(() => {
        if (!startDate || !endDate) return usageData;
        return usageData.filter((record) => {
            const recStart = dayjs(record.start);
            const recEnd = dayjs(record.end);
            return recEnd.isAfter(startDate, "day") && recStart.isBefore(endDate, "day");
        });
    }, [usageData, startDate, endDate]);

    return (
        <Box>
            {/* Heading */}
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Usage History (Filtered)
            </Typography>

            {/* Date Filters */}
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <DatePicker
                    label="From Date"
                    value={startDate}
                    onChange={setStartDate}
                    slotProps={{ textField: { variant: "outlined", size: "small", fullWidth: true } }}
                />
                <DatePicker
                    label="To Date"
                    value={endDate}
                    onChange={setEndDate}
                    slotProps={{ textField: { variant: "outlined", size: "small", fullWidth: true } }}
                />
            </Box>

            {/* Filtered History List */}
            {filteredHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No usage records in this date range.
                </Typography>
            ) : (
                <List>
                    {filteredHistory.map((res, index) => {
                        const start = dayjs(res.start);
                        const end = dayjs(res.end);
                        const durationHrs = end.diff(start, "hour");

                        return (
                            <Box key={res.id}>
                                <ListItem
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Chip
                                        label={res.user}
                                        sx={{
                                            backgroundColor: res.color || "#9E9E9E",
                                            color: "white",
                                            fontWeight: "bold",
                                            mr: 2,
                                        }}
                                    />
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        {start.format("DD MMM YYYY")} | {start.format("HH:mm")} - {end.format("HH:mm")} ({durationHrs} hrs)
                                    </Typography>
                                </ListItem>
                                {index < filteredHistory.length - 1 && <Divider sx={{ my: 1 }} />}
                            </Box>
                        );
                    })}
                </List>
            )}
        </Box>
    );
};

export default SpotUsageHistory;
