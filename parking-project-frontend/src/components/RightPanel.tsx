import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Alert,
    List,
    ListItem,
    Typography,
    TextField,
    IconButton,
    styled,
    Tooltip,
    Fade,
    Paper,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import SearchIcon from "@mui/icons-material/Search";
import { SpotRecord } from "../types";
import SpotDetailsDialog from "./SpotDetailsDialog";

const RightPanelRoot = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100%",
    overflow: "hidden",
    background: theme.palette.background.default,
    borderLeft: `1px solid ${theme.palette.divider}`,
    position: 'relative',
}));

const RightDrawerHeader = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2.5),
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    flexShrink: 0,
    borderRadius: 0,
    boxShadow: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const FilterControls = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    '& .MuiTextField-root': {
        '& .MuiOutlinedInput-root': {
            borderRadius: theme.spacing(1),
        },
    },
}));

const SpotCardsContainer = styled(Box)(({ theme }) => ({
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    background: 'transparent',
    '&::-webkit-scrollbar': {
        width: '8px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '4px',
        '&:hover': {
            background: 'rgba(0,0,0,0.5)',
        },
    },
}));

const SpotCard = styled(Card, {
    shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'occupied'
})<{ isSelected?: boolean; occupied?: boolean }>(({ theme, isSelected, occupied }) => ({
    margin: theme.spacing(1, 0),
    borderRadius: theme.shape.borderRadius,
    transition: "box-shadow 0.2s ease, transform 0.15s ease",
    border: isSelected
        ? `2px solid ${theme.palette.primary.main}`
        : `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
    ...(occupied ? { borderLeft: `4px solid ${theme.palette.error.main}` } : {}),
}));

interface RightPanelProps {
    isOpen: boolean;
    spots: SpotRecord[];
    selectedSpotId?: string;
    filterText: string;
    onFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSpotSelect: (spotId: string) => void;
    isLoading: boolean;
    error: string | null;
    isAdmin?: boolean;
}

const RightPanel: React.FC<RightPanelProps> = ({
                                                   isOpen,
                                                   spots,
                                                   selectedSpotId,
                                                   filterText,
                                                   onFilterChange,
                                                   onSpotSelect,
                                                   isLoading,
                                                   error,
                                                   isAdmin = false
                                               }) => {
    const spotCardsContainerRef = useRef<HTMLDivElement>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<SpotRecord | null>(null);

    // Memoize filtered spots để tối ưu performance
    const filteredSpots = useMemo(() => {
        if (!filterText.trim()) return spots;
        return spots.filter(spot => 
            spot.spot_id.toLowerCase().includes(filterText.toLowerCase())
        );
    }, [spots, filterText]);

    // Memoize statistics
    const statistics = useMemo(() => {
        const total = filteredSpots.length;
        const occupied = filteredSpots.filter(spot => spot.occupied).length;
        const available = total - occupied;
        return { total, occupied, available };
    }, [filteredSpots]);

    // Optimize scroll behavior
    useEffect(() => {
        if (selectedSpotId && isOpen && !isLoading && !error) {
            const selectedElement = document.getElementById(`spot-${selectedSpotId}`);
            if (selectedElement && spotCardsContainerRef.current) {
                const timeoutId = setTimeout(() => {
                    selectedElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 150);
                
                return () => clearTimeout(timeoutId);
            }
        }
    }, [selectedSpotId, isOpen, isLoading, error]);

    // Optimize dialog handlers with useCallback
    const handleOpenDialog = useCallback((spot: SpotRecord) => {
        setSelectedSpot(spot);
        setDialogOpen(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogOpen(false);
        setSelectedSpot(null);
    }, []);

    // Optimize spot selection with useCallback
    const handleSpotClick = useCallback((spotId: string) => {
        onSpotSelect(spotId);
    }, [onSpotSelect]);

    return (
        <RightPanelRoot>
            {isOpen && (
                <>
                <RightDrawerHeader elevation={0}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <LocalParkingIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                            Parking Spots
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Chip label={`Total: ${statistics.total}`} variant="outlined" size="small" />
                            <Chip label={`Free: ${statistics.available}`} color="success" variant="outlined" size="small" />
                            <Chip label={`Busy: ${statistics.occupied}`} color="error" variant="outlined" size="small" />
                        </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', minWidth: 80 }}>
                            <Typography variant="caption" color="text.secondary">Total</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{statistics.total}</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', minWidth: 80 }}>
                            <Typography variant="caption" color="text.secondary">Free</Typography>
                            <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 700 }}>{statistics.available}</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', minWidth: 80 }}>
                            <Typography variant="caption" color="text.secondary">Busy</Typography>
                            <Typography variant="subtitle1" color="error.main" sx={{ fontWeight: 700 }}>{statistics.occupied}</Typography>
                        </Paper>
                    </Box>

                    <FilterControls>
                        <TextField
                            variant="outlined"
                            placeholder="Search by Spot ID"
                            size="medium"
                            value={filterText}
                            onChange={onFilterChange}
                            fullWidth
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                            }}
                        />
                    </FilterControls>
                </RightDrawerHeader>

                    {isLoading ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                flex: 1,
                                p: 4,
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Box sx={{ display: "flex", flex: 1, p: 2 }}>
                            <Alert severity="error" sx={{ width: "100%" }}>
                                {error}
                            </Alert>
                        </Box>
                    ) : (
                        <SpotCardsContainer ref={spotCardsContainerRef}>
                            <List sx={{ overflow: "auto", height: "100%", p: 0 }}>
                                {filteredSpots.map((spot) => (
                                    <Fade in={true} timeout={300} key={spot.spot_id}>
                                        <ListItem disablePadding sx={{ mb: 2 }}>
                                            <SpotCard
                                                id={`spot-${spot.spot_id}`}
                                                isSelected={spot.spot_id === selectedSpotId}
                                                occupied={spot.occupied}
                                                sx={{ width: "100%" }}
                                                onClick={() => handleSpotClick(spot.spot_id)}
                                            >
                                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                                    <Box
                                                        display="flex"
                                                        justifyContent="space-between"
                                                        alignItems="center"
                                                        mb={2}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <LocalParkingIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                                Spot {spot.spot_id}
                                                            </Typography>
                                                        </Box>
                                                        <Tooltip title={isAdmin ? "Edit spot details" : "View spot details"}>
                                                            <IconButton
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSpotClick(spot.spot_id);
                                                                    handleOpenDialog(spot);
                                                                }}
                                                                sx={{
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    backgroundColor: 'background.paper',
                                                                    color: 'text.primary',
                                                                    '&:hover': {
                                                                        backgroundColor: 'action.hover',
                                                                    },
                                                                    transition: 'background-color 0.2s ease',
                                                                }}
                                                            >
                                                                <EditIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    
                                                    <Box
                                                        display="flex"
                                                        justifyContent="space-between"
                                                        alignItems="center"
                                                        gap={2}
                                                    >
                                                        <Typography variant="body1" sx={{ 
                                                            color: 'text.secondary',
                                                            fontWeight: 500
                                                        }}>
                                                            Type: {spot.type}
                                                        </Typography>
                                                        <Chip
                                                            label={spot.occupied ? "Occupied" : "Available"}
                                                            color={spot.occupied ? "error" : "success"}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                    </Box>
                                                </CardContent>
                                            </SpotCard>
                                        </ListItem>
                                    </Fade>
                                ))}
                                {filteredSpots.length === 0 && !isLoading && (
                                    <Box sx={{ 
                                        textAlign: 'center',
                                        p: 4,
                                        backgroundColor: 'background.paper',
                                        borderRadius: 2,
                                        m: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}>
                                        <LocalParkingIcon sx={{ 
                                            fontSize: 56,
                                            color: 'text.disabled',
                                            mb: 2 
                                        }} />
                                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                            No spots found
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {filterText ? `No spots match "${filterText}"` : 'No parking spots available'}
                                        </Typography>
                                    </Box>
                                )}
                            </List>
                        </SpotCardsContainer>
                    )}
                </>
            )}

            {/* Spot Details Dialog */}
            <SpotDetailsDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                spot={selectedSpot}
                isAdmin={isAdmin}
            />
        </RightPanelRoot>
    );
};

export default RightPanel;
