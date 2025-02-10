import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Grid,
    Typography,
    Tooltip,
    IconButton,
    List,
    ListItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import moment, { Moment } from 'moment';

/** Represents a single selected interval. */
export interface TimeInterval {
    start: Moment;
    end: Moment;
}

/** Represents a busy/unavailable interval. */
export interface BusyInterval {
    start: Moment;
    end: Moment;
}

interface WeekPickerProps {
    /** Called whenever the user changes the selected intervals. */
    onIntervalsChange?: (intervals: TimeInterval[]) => void;
    /** Any intervals that should be treated as "busy" (unselectable). */
    busyIntervals?: BusyInterval[];
    /** The earliest hour of the day to show (0 = midnight, 8 = 8 AM, etc.). */
    startHour?: number;
    /** The latest hour of the day to show (24 = midnight, 20 = 8 PM, etc.). */
    endHour?: number;
}

/**
 * A robust week-based picker that allows multiple intervals across the selected week.
 * Includes "Prev Week" / "Next Week" navigation, multi-slot selection, and busy intervals.
 */
const WeekPicker: React.FC<WeekPickerProps> = ({
                                                   onIntervalsChange,
                                                   busyIntervals = [],
                                                   startHour = 8,
                                                   endHour = 20,
                                               }) => {
    // The user can navigate from week to week.
    const [weekStart, setWeekStart] = useState<Moment>(() =>
        moment().startOf('isoWeek')
    );

    /** Holds the list of final chosen intervals across the entire displayed week. */
    const [selectedIntervals, setSelectedIntervals] = useState<TimeInterval[]>([]);

    /** If we're in the middle of selecting an interval, this is the 'start'. */
    const [selectingStart, setSelectingStart] = useState<Moment | null>(null);

    /** Optional error message (e.g. if user picks an end time before start time). */
    const [error, setError] = useState('');

    // A list of days in the current displayed week (Monday...Sunday).
    const daysInWeek = Array.from({ length: 7 }, (_, i) =>
        weekStart.clone().add(i, 'days')
    );

    // Let the parent know whenever intervals change.
    useEffect(() => {
        if (onIntervalsChange) {
            onIntervalsChange(selectedIntervals);
        }
    }, [selectedIntervals, onIntervalsChange]);

    /** Move to the previous week. */
    const handlePrevWeek = () => {
        setWeekStart(prev => prev.clone().subtract(7, 'days'));
        setSelectingStart(null);
    };

    /** Move to the next week. */
    const handleNextWeek = () => {
        setWeekStart(prev => prev.clone().add(7, 'days'));
        setSelectingStart(null);
    };

    /**
     * Check if a given hour-slot in a day is busy (unavailable)
     * due to overlapping with any BusyInterval.
     */
    const isSlotBusy = (day: Moment, hour: number) => {
        const slotStart = day.clone().hour(hour).minute(0);
        const slotEnd = slotStart.clone().add(1, 'hour');
        return busyIntervals.some(interval => {
            // Overlap check
            return slotStart.isBefore(interval.end) && slotEnd.isAfter(interval.start);
        });
    };

    /**
     * Check if a dateTime is within one of the already selected intervals.
     * This helps us highlight "in-progress" range in the UI, if desired.
     */
    const isInSelectedInterval = (dateTime: Moment) => {
        for (const interval of selectedIntervals) {
            if (dateTime.isSameOrAfter(interval.start) && dateTime.isBefore(interval.end)) {
                return true;
            }
        }
        return false;
    };

    /**
     * User clicks a time slot (day + hour). We either:
     * - Start a new interval if none in progress.
     * - Complete the interval if we already have a start and the new time is after that start.
     */
    const handleSlotClick = (day: Moment, hour: number) => {
        const clickedTime = day.clone().hour(hour).minute(0);

        // If the slot is busy, do nothing.
        if (isSlotBusy(day, hour)) {
            return;
        }

        if (!selectingStart) {
            // Start a new selection
            setSelectingStart(clickedTime);
            setError('');
        } else {
            // Complete the selection
            if (clickedTime.isAfter(selectingStart)) {
                // Add a new interval
                const newInterval: TimeInterval = {
                    start: selectingStart,
                    end: clickedTime,
                };
                setSelectedIntervals(prev => [...prev, newInterval]);
                setSelectingStart(null);
                setError('');
            } else {
                setError('End time must be after start time.');
            }
        }
    };

    /** Remove an interval from the list of selected intervals. */
    const handleRemoveInterval = (index: number) => {
        setSelectedIntervals(prev => {
            const copy = [...prev];
            copy.splice(index, 1);
            return copy;
        });
    };

    /** Render a single hour slot box within a day column. */
    const renderTimeSlot = (day: Moment, hour: number) => {
        const slotStart = day.clone().hour(hour).minute(0);
        const slotEnd = slotStart.clone().add(1, 'hour');
        const busy = isSlotBusy(day, hour);

        const isSelectingStartSlot =
            selectingStart && slotStart.isSame(selectingStart, 'minute');

        // If user is picking a start, highlight hours after that as a "potential" range.
        let inActiveSelectionRange = false;
        if (selectingStart && slotStart.isAfter(selectingStart) && !busy) {
            // We highlight if it's between the start selection and the hovered slot
            // But to keep it simpler, we won't do "hover" logic here—just show normal.
            // If you want to highlight, you'd do so on mouse over, etc.
        }

        // See if it falls in any already selected interval
        const inSelectedInterval = isInSelectedInterval(slotStart);

        let bgColor = '#e0f7fa';
        if (busy) bgColor = '#ffebee';
        if (isSelectingStartSlot) bgColor = '#a5d6a7';
        if (inSelectedInterval) bgColor = '#80cbc4';

        return (
            <Tooltip
                key={`${day.format('YYYY-MM-DD')}-${hour}`}
                title={
                    busy
                        ? 'Busy'
                        : isSelectingStartSlot
                            ? 'Selected Start'
                            : inSelectedInterval
                                ? 'In Selected Interval'
                                : 'Available'
                }
                arrow
            >
                <Box
                    sx={{
                        height: 40,
                        backgroundColor: bgColor,
                        cursor: busy ? 'not-allowed' : 'pointer',
                        borderBottom: '1px solid #ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        '&:hover': {
                            opacity: busy ? 1 : 0.8,
                        },
                    }}
                    onClick={() => handleSlotClick(day, hour)}
                >
                    {hour}:00
                </Box>
            </Tooltip>
        );
    };

    return (
        <Box>
            {/* Week Navigation Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Button variant="outlined" onClick={handlePrevWeek}>
                    &laquo; Prev Week
                </Button>
                <Typography variant="h6" sx={{ mx: 2 }}>
                    {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
                </Typography>
                <Button variant="outlined" onClick={handleNextWeek}>
                    Next Week &raquo;
                </Button>
            </Box>

            {error && (
                <Typography color="error" sx={{ mb: 1 }}>
                    {error}
                </Typography>
            )}

            <Grid container spacing={1}>
                {daysInWeek.map(day => (
                    <Grid item xs={12 / 7} key={day.toString()}>
                        <Box
                            sx={{
                                textAlign: 'center',
                                mb: 1,
                                backgroundColor: '#f5f5f5',
                                p: 1,
                                borderBottom: '1px solid #ccc',
                            }}
                        >
                            <Typography variant="subtitle1">{day.format('ddd')}</Typography>
                            <Typography variant="body2">{day.format('DD MMM')}</Typography>
                        </Box>
                        {/* Hours from startHour to endHour */}
                        {Array.from({ length: endHour - startHour + 1 }, (_, i) => {
                            const hour = startHour + i;
                            return renderTimeSlot(day, hour);
                        })}


                    </Grid>
                ))}
            </Grid>

            {/* List of selected intervals */}
            <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2">Selected Intervals:</Typography>
                {selectedIntervals.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        None
                    </Typography>
                ) : (
                    <List dense>
                        {selectedIntervals.map((interval, idx) => (
                            <ListItem
                                key={`${interval.start.toISOString()}-${interval.end.toISOString()}`}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => handleRemoveInterval(idx)}>
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <Typography variant="body2">
                                    {interval.start.format('ddd DD MMM HH:mm')} -{' '}
                                    {interval.end.format('ddd DD MMM HH:mm')}
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
};

export default WeekPicker;
