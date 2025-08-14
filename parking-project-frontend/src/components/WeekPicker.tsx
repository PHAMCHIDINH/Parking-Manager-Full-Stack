import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Grid,
    Typography,
    Tooltip,
    List,
    ListItem,
    Paper,
    Card,
    CardContent,
    styled,
} from '@mui/material';
import moment, { Moment } from 'moment';

// Styled Components
const WeekPickerContainer = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: theme.spacing(2),
    background: theme.palette.background.paper,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
}));

const WeekNavigationCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: theme.spacing(2),
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
}));

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
    onIntervalsChange: (intervals: TimeInterval[]) => void;
    busyIntervals?: BusyInterval[];
    startHour?: number;
    endHour?: number;
    maxReservationHours?: number; // Giới hạn tổng số giờ đặt
    maxIntervals?: number; // Giới hạn số khoảng thời gian
    disabled?: boolean; // Disable toàn bộ picker
}

/**
 * A robust week-based picker that allows multiple intervals across the selected week.
 * Includes "Prev Week" / "Next Week" navigation, multi-slot selection, and busy intervals.
 * Enhanced with validation and booking limits.
 */
const WeekPicker: React.FC<WeekPickerProps> = ({
                                                   onIntervalsChange,
                                                   busyIntervals = [],
                                                   startHour = 8,
                                                   endHour = 20,
                                                   maxReservationHours = 24, // Mặc định 24 giờ
                                                   maxIntervals = 5, // Mặc định 5 khoảng thời gian
                                                   disabled = false,
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

    /** Slot is in the past relative to now (slotEnd <= now). Disable and gray out. */
    const isPastSlot = (day: Moment, hour: number) => {
        const now = moment();
        const slotStart = day.clone().hour(hour).minute(0);
        const slotEnd = slotStart.clone().add(1, 'hour');
        return slotEnd.isSameOrBefore(now);
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
     * Calculate total hours across all selected intervals
     */
    const getTotalReservationHours = () => {
        return selectedIntervals.reduce((total, interval) => {
            const hours = interval.end.diff(interval.start, 'hours', true);
            return total + hours;
        }, 0);
    };

    /**
     * Check if adding a new interval would exceed the maximum reservation hours
     */
    const wouldExceedMaxHours = (newStart: Moment, newEnd: Moment) => {
        const newHours = newEnd.diff(newStart, 'hours', true);
        const currentTotal = getTotalReservationHours();
        return currentTotal + newHours > maxReservationHours;
    };

    /**
     * User clicks a time slot (day + hour). We either:
     * - Start a new interval if none in progress.
     * - Complete the interval if we already have a start and the new time is after that start.
     */
    const handleSlotClick = (day: Moment, hour: number) => {
        const clickedTime = day.clone().hour(hour).minute(0);

        // If disabled or the slot is busy, do nothing.
        if (disabled || isSlotBusy(day, hour)) {
            return;
        }

        if (!selectingStart) {
            // Check if we can start a new selection (max intervals limit)
            if (selectedIntervals.length >= maxIntervals) {
                setError(`Maximum ${maxIntervals} intervals allowed.`);
                return;
            }
            // Start a new selection
            setSelectingStart(clickedTime);
            setError('');
        } else {
            // Complete the selection
            if (clickedTime.isAfter(selectingStart)) {
                // Check if this would exceed maximum hours
                if (wouldExceedMaxHours(selectingStart, clickedTime)) {
                    const remainingHours = maxReservationHours - getTotalReservationHours();
                    setError(`This selection would exceed the maximum ${maxReservationHours} hours limit. You have ${remainingHours.toFixed(1)} hours remaining.`);
                    return;
                }

                // Add a new interval
                const newInterval: TimeInterval = {
                    start: selectingStart,
                    end: clickedTime,
                };
                
                console.log("WeekPicker - Adding interval:", {
                    startSlot: selectingStart.format('YYYY-MM-DD HH:mm:ss'),
                    endSlot: clickedTime.format('YYYY-MM-DD HH:mm:ss'),
                    duration: clickedTime.diff(selectingStart, 'hours', true)
                });
                
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
        const busy = isSlotBusy(day, hour);
        const past = isPastSlot(day, hour);

        const isSelectingStartSlot =
            selectingStart && slotStart.isSame(selectingStart, 'minute');

        // See if it falls in any already selected interval
        const inSelectedInterval = isInSelectedInterval(slotStart);

        // Check if we're at max intervals and this isn't part of current selection
        const atMaxIntervals = selectedIntervals.length >= maxIntervals && !selectingStart && !inSelectedInterval;

        // Blue theme colors
        let bgColor = '#e3f2fd'; // default available slot (light blue)
        let cursor = 'pointer';
        let opacity = 1;
        let borderColor = '#bbdefb';
        let hoverBg = '#bbdefb';

        if (disabled) {
            bgColor = '#f5f5f5';
            cursor = 'not-allowed';
            opacity = 0.6;
            borderColor = '#e0e0e0';
        } else if (past) {
            // Past slots are gray and non-interactive
            bgColor = '#eeeeee';
            cursor = 'not-allowed';
            borderColor = '#e0e0e0';
            opacity = 0.8;
        } else if (busy) {
            bgColor = '#ffebee';
            cursor = 'not-allowed';
            borderColor = '#ffcdd2';
        } else if (atMaxIntervals) {
            bgColor = '#e3f2fd';
            cursor = 'not-allowed';
            opacity = 0.7;
            borderColor = '#bbdefb';
        } else if (isSelectingStartSlot) {
            bgColor = '#bbdefb';
            borderColor = '#64b5f6';
            hoverBg = '#90caf9';
        } else if (inSelectedInterval) {
            bgColor = '#90caf9';
            borderColor = '#64b5f6';
            hoverBg = '#64b5f6';
        }

        const getTooltipTitle = () => {
            if (disabled) return 'Đã khóa';
            if (past) return 'Đã qua thời gian hiện tại';
            if (busy) return 'Đã có người đặt';
            if (atMaxIntervals) return `Đã đạt tối đa ${maxIntervals} khoảng thời gian`;
            if (isSelectingStartSlot) return 'Thời gian bắt đầu';
            if (inSelectedInterval) return 'Đã chọn';
            return 'Có thể đặt';
        };

        return (
            <Tooltip
                key={`${day.format('YYYY-MM-DD')}-${hour}`}
                title={getTooltipTitle()}
                arrow
            >
                <Box
                    sx={{
                        height: 50,
                        backgroundColor: bgColor,
                        cursor: cursor,
                        border: `2px solid ${borderColor}`,
                        borderRadius: 1,
                        margin: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 'bold',
                        opacity: opacity,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        '&:hover': {
                            opacity: (disabled || busy || atMaxIntervals) ? opacity : 0.9,
                            backgroundColor: (disabled || busy || atMaxIntervals) ? bgColor : hoverBg,
                            transform: (disabled || busy || atMaxIntervals) ? 'none' : 'translateY(-1px)',
                            boxShadow: (disabled || busy || atMaxIntervals) ? '0 1px 3px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.15)',
                        },
                    }}
                    onClick={() => { if (!disabled && !past && !busy && !atMaxIntervals) handleSlotClick(day, hour); }}
                >
                    {hour}:00
                </Box>
            </Tooltip>
        );
    };

    return (
        <WeekPickerContainer elevation={3}>
            {/* Week Navigation Header */}
            <WeekNavigationCard elevation={0}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Button 
                            variant="contained"
                            onClick={handlePrevWeek}
                            disabled={disabled}
                            sx={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                minWidth: 140,
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.35)' },
                                '&:disabled': { opacity: 0.6 }
                            }}
                        >
                            Tuần trước
                        </Button>

                        <Box sx={{ textAlign: 'center', flex: 1, mx: 3 }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Chọn thời gian đặt chỗ
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button 
                                variant="contained"
                                onClick={handleNextWeek}
                                disabled={disabled}
                                sx={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    minWidth: 140,
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.35)' },
                                    '&:disabled': { opacity: 0.6 }
                                }}
                            >
                                Tuần sau
                            </Button>
                            <Button
                                variant="outlined"
                                color="inherit"
                                disabled={disabled || selectedIntervals.length === 0}
                                onClick={() => setSelectedIntervals([])}
                                sx={{ ml: 1, borderColor: 'rgba(255,255,255,0.6)', color: 'white' }}
                            >
                                Xóa tất cả
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </WeekNavigationCard>

            {error && (
                <Box sx={{ 
                    mb: 2,
                    p: 2,
                    backgroundColor: 'rgba(33,150,243,0.08)',
                    color: 'primary.main',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'primary.light'
                }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {error}
                    </Typography>
                </Box>
            )}

            {/* Usage Statistics */}
            <Box sx={{ 
                mb: 3,
                p: 2.5,
                backgroundColor: '#e3f2fd',
                borderRadius: 2,
                color: 'primary.dark',
                border: '1px solid #bbdefb'
            }}>
                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 'bold', textAlign: 'center', color: 'primary.main' }}>
                    Thống kê đặt chỗ
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                Khoảng thời gian
                            </Typography>
                            <Typography variant="h5" sx={{ 
                                color: selectedIntervals.length >= maxIntervals ? 'warning.main' : 'primary.main',
                                fontWeight: 'bold'
                            }}>
                                {selectedIntervals.length} / {maxIntervals}
                            </Typography>
                            {selectedIntervals.length >= maxIntervals && (
                                <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                    Đã đạt tối đa
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                Tổng thời gian
                            </Typography>
                            <Typography variant="h5" sx={{ 
                                color: getTotalReservationHours() >= maxReservationHours ? 'warning.main' : 'primary.main',
                                fontWeight: 'bold'
                            }}>
                                {getTotalReservationHours().toFixed(1)} / {maxReservationHours}h
                            </Typography>
                            {getTotalReservationHours() >= maxReservationHours && (
                                <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                    Đã đạt giới hạn
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                Trạng thái
                            </Typography>
                            <Typography variant="h5" sx={{ 
                                color: disabled ? 'warning.main' : 'primary.main',
                                fontWeight: 'bold'
                            }}>
                                {disabled ? 'Khóa' : 'Hoạt động'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            <Grid container spacing={1} sx={{ 
                backgroundColor: 'white', 
                borderRadius: 2, 
                p: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                {daysInWeek.map(day => (
                    <Grid item xs={12 / 7} key={day.toString()}>
            <Box
                            sx={{
                                textAlign: 'center',
                                mb: 1,
                backgroundColor: '#1976d2',
                color: 'white',
                p: 1,
                                borderRadius: 1,
                fontWeight: 'bold'
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {day.format('dddd')}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                {day.format('DD/MM')}
                            </Typography>
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
            <Box sx={{ 
                mt: 4,
                p: 2.5,
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid #e0e0e0'
            }}>
                <Typography variant="h6" sx={{ 
                    mb: 2,
                    fontWeight: 'bold',
                    color: 'primary.main'
                }}>
                    Danh sách thời gian đã chọn
                </Typography>
                {selectedIntervals.length === 0 ? (
                    <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 1,
                        border: '2px dashed #dee2e6'
                    }}>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                            Chưa chọn thời gian nào
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Nhấp vào các ô thời gian để bắt đầu đặt chỗ
                        </Typography>
                    </Box>
                ) : (
                    <List dense sx={{ backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                        {selectedIntervals.map((interval, idx) => {
                            const duration = interval.end.diff(interval.start, 'hours', true);
                            return (
                                <ListItem
                                    key={`${interval.start.toISOString()}-${interval.end.toISOString()}`}
                                    sx={{ 
                                        mb: 1,
                                        backgroundColor: 'white',
                                        borderRadius: 1,
                                        border: '1px solid #e0e0e0',
                                        '&:hover': { backgroundColor: '#f5f5f5' }
                                    }}
                                    secondaryAction={
                                        <Button
                                            onClick={() => handleRemoveInterval(idx)}
                                            disabled={disabled}
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                        >
                                            Xóa
                                        </Button>
                                    }
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body1" sx={{ 
                                            opacity: disabled ? 0.6 : 1,
                                            fontWeight: 500,
                                            mb: 0.5
                                        }}>
                                            Khoảng {idx + 1}: {interval.start.format('dddd, DD/MM/YYYY')}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {interval.start.format('HH:mm')} - {interval.end.format('HH:mm')}
                                            <Typography 
                                                component="span" 
                                                variant="caption" 
                                                sx={{ 
                                                    ml: 2, 
                                                    px: 1,
                                                    py: 0.5,
                                                    backgroundColor: '#e3f2fd',
                                                    color: 'primary.main',
                                                    borderRadius: 1,
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {duration.toFixed(1)} giờ
                                            </Typography>
                                        </Typography>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </Box>
        </WeekPickerContainer>
    );
};

export default WeekPicker;
