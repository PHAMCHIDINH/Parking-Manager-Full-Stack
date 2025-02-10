import React, { ChangeEvent, memo, useEffect, useRef, useState } from 'react';
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
    Autocomplete,
    Divider,
    IconButton,
    styled
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { SpotRecord } from '../types';
import SpotDetailsDialog from "./SpotDetailsDialog";

const RightPanelRoot = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100%",
    overflow: "hidden",
    backgroundColor: theme.palette.background.default,
    borderLeft: `1px solid ${theme.palette.divider}`,
}));

const RightDrawerHeader = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.primary.contrastText,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    flexShrink: 0,
}));

const FilterControls = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0, 2),
}));

const SpotCardsContainer = styled(Box)(({ theme }) => ({
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    '&::-webkit-scrollbar': {
        width: '8px',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.grey[300],
        borderRadius: '4px',
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: theme.palette.grey[100],
    },
}));

const SpotCard = styled(Card, {
    shouldForwardProp: (prop) => prop !== "isSelected",
})<{ isSelected?: boolean }>(({ theme, isSelected }) => ({
    margin: theme.spacing(1, 0),
    borderRadius: theme.spacing(1),
    transition: "all 0.2s ease",
    border: isSelected
        ? `2px solid ${theme.palette.secondary.main}`
        : `1px solid ${theme.palette.divider}`,
    backgroundColor: isSelected
        ? theme.palette.secondary.light
        : theme.palette.background.paper,
    boxShadow: isSelected ? theme.shadows[4] : theme.shadows[1],
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: theme.shadows[6],
    },
}));

interface RightPanelProps {
    isOpen: boolean;
    spots: SpotRecord[];
    selectedSpotId?: string;
    filterText: string;
    selectedTypes: string[];
    onFilterChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSelectedTypesChange: (newTypes: string[]) => void;
    onSpotSelect: (spotId: string) => void;
    isLoading: boolean;
    error: string | null;
}

const RightPanel: React.FC<RightPanelProps> = memo(({
                                                        isOpen,
                                                        spots,
                                                        selectedSpotId,
                                                        filterText,
                                                        selectedTypes,
                                                        onFilterChange,
                                                        onSelectedTypesChange,
                                                        onSpotSelect,
                                                        isLoading,
                                                        error,
                                                    }) => {
    const allTypes = Array.from(new Set(spots.map((spot) => spot.type)));
    const spotCardsContainerRef = useRef<HTMLDivElement>(null);

    // Local state for dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<SpotRecord | null>(null);

    const handleOpenDialog = (spot: SpotRecord) => {
        setSelectedSpot(spot);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedSpot(null);
    };

    // Filter logic
    const filteredSpots = spots.filter((spot) => {
        const matchId = spot.spot_id.toLowerCase().includes(filterText.toLowerCase());
        const matchType =
            selectedTypes.length === 0 || selectedTypes.includes(spot.type.toLowerCase());
        return matchId && matchType;
    });

    // Auto-scroll selected spot into view
    useEffect(() => {
        if (selectedSpotId && isOpen && !isLoading && !error) {
            const selectedElement = document.getElementById(`spot-${selectedSpotId}`);
            if (selectedElement && spotCardsContainerRef.current) {
                setTimeout(() => {
                    selectedElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }
        }
    }, [selectedSpotId, isOpen, isLoading, error]);

    return (
        <RightPanelRoot>
            {isOpen && (
                <>
                    <RightDrawerHeader>
                        <Typography variant="h6">Parking Spots</Typography>
                        <Typography variant="body2">{spots.length} spots</Typography>
                        <FilterControls>
                            <TextField
                                variant="outlined"
                                placeholder="Filter by Spot ID"
                                size="small"
                                value={filterText}
                                onChange={onFilterChange}
                                fullWidth
                                sx={{ backgroundColor: "#ffffff", borderRadius: 1 }}
                            />
                            <Autocomplete
                                multiple
                                options={allTypes}
                                getOptionLabel={(option) => option}
                                value={selectedTypes}
                                onChange={(_, newValue) =>
                                    onSelectedTypesChange(newValue.map((t) => t.toLowerCase()))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        variant="outlined"
                                        placeholder="Filter by Type"
                                        size="small"
                                    />
                                )}
                                sx={{ backgroundColor: "#ffffff", borderRadius: 1 }}
                            />
                        </FilterControls>
                        <Divider sx={{ backgroundColor: "#cccccc" }} />
                    </RightDrawerHeader>

                    {isLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" flex={1} p={4}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Box display="flex" flex={1} p={2}>
                            <Alert severity="error" sx={{ width: '100%' }}>
                                {error}
                            </Alert>
                        </Box>
                    ) : (
                        <SpotCardsContainer ref={spotCardsContainerRef}>
                            <List sx={{ overflow: 'auto', height: '100%' }}>
                                {filteredSpots.map((spot) => (
                                    <ListItem key={spot.spot_id} disablePadding sx={{ mb: 1 }}>
                                        <SpotCard
                                            id={`spot-${spot.spot_id}`}
                                            isSelected={spot.spot_id === selectedSpotId}
                                            sx={{ width: "100%", cursor: "pointer" }}
                                            onClick={() => {
                                                // FULL card click should also highlight/focus the spot
                                                onSpotSelect(spot.spot_id);
                                            }}
                                        >
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="h6">
                                                        Spot {spot.spot_id}
                                                    </Typography>
                                                    {/* Icon button just for opening dialog + focusing too */}
                                                    <IconButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSpotSelect(spot.spot_id);
                                                            handleOpenDialog(spot);
                                                        }}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Type: {spot.type}
                                                    </Typography>
                                                    <Chip
                                                        label={spot.type}
                                                        color={spot.spot_id === selectedSpotId ? "secondary" : "default"}
                                                        size="small"
                                                    />
                                                </Box>
                                            </CardContent>
                                        </SpotCard>
                                    </ListItem>
                                ))}
                                {filteredSpots.length === 0 && (
                                    <Typography sx={{ p: 2 }} variant="body2" color="text.secondary">
                                        No spots match your filter.
                                    </Typography>
                                )}
                            </List>
                        </SpotCardsContainer>
                    )}
                </>
            )}

            {/* Dialog for editing spot details and reservations */}
            <SpotDetailsDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                spot={selectedSpot}
            />
        </RightPanelRoot>
    );
});

RightPanel.displayName = 'RightPanel';
export default RightPanel;
