import React, { useState, useMemo } from "react";
import {
    Box,
    Typography,
    List,
    ListItem,
    Chip,
    Divider,
} 
from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface UsageRecord {
    id: number;
    user: string;
    start: Date;
    end: Date;
    color?: string;
}

interface SpotUsageHistoryProps {
    usageData: UsageRecord[];
}

const SpotUsageHistory: React.FC<SpotUsageHistoryProps> = ({ usageData }) => {
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, "days"));
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());

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
  // Use a real timezone (recommended)
  const start = dayjs(res.start).tz('Asia/Ho_Chi_Minh');
  const end = dayjs(res.end).tz('Asia/Asia/Ho_Chi_Minh');

  // Or, if you prefer a fixed offset: const start = dayjs(res.start).utcOffset(7, true); const end = dayjs(res.end).utcOffset(7, true);

  const durationHrs = end.diff(start, 'hour');

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
                                        {start.format("DD MM YYYY")} | {start.format("HH:mm")} - {end.format("HH:mm")} ({durationHrs} hrs)
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
