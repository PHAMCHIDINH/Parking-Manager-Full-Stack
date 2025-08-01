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
    Badge,
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    borderLeft: `1px solid ${theme.palette.divider}`,
    position: 'relative',
}));

const RightDrawerHeader = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    flexShrink: 0,
    borderRadius: 0,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        zIndex: -1,
    }
}));

const FilterControls = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    '& .MuiTextField-root': {
        '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: theme.spacing(2),
            '& fieldset': {
                borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover fieldset': {
                borderColor: 'rgba(255,255,255,0.5)',
            },
            '&.Mui-focused fieldset': {
                borderColor: 'white',
            },
        },
        '& .MuiInputBase-input': {
            padding: theme.spacing(1.5),
        },
        '& .MuiInputBase-input::placeholder': {
            color: theme.palette.text.secondary,
            opacity: 0.7,
        }
    }
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
    borderRadius: theme.spacing(2),
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    border: isSelected
        ? `3px solid ${theme.palette.secondary.main}`
        : `1px solid ${theme.palette.divider}`,
    background: isSelected
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        : occupied 
            ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    color: isSelected ? 'white' : occupied ? 'white' : theme.palette.text.primary,
    boxShadow: isSelected 
        ? '0 8px 32px rgba(102, 126, 234, 0.4)' 
        : occupied
            ? '0 4px 20px rgba(255, 107, 107, 0.3)'
            : '0 2px 12px rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    "&:hover": {
        transform: "translateY(-4px) scale(1.02)",
        boxShadow: isSelected 
            ? '0 12px 48px rgba(102, 126, 234, 0.6)' 
            : occupied
                ? '0 8px 32px rgba(255, 107, 107, 0.5)'
                : '0 8px 32px rgba(0,0,0,0.15)',
    },
    "&::before": {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255,255,255,0.1)',
        opacity: isSelected ? 1 : 0,
        transition: 'opacity 0.3s ease',
    },
    "&:hover::before": {
        opacity: 0.2,
    }
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
                        <LocalParkingIcon sx={{ fontSize: 32 }} />
                        <Typography variant="h5" sx={{ fontWeight: 'bold', flex: 1 }}>
                            Parking Spots
                        </Typography>
                        <Badge 
                            badgeContent={statistics.occupied} 
                            color="error"
                            sx={{
                                '& .MuiBadge-badge': {
                                    backgroundColor: '#ff4757',
                                    color: 'white',
                                    fontWeight: 'bold',
                                }
                            }}
                        >
                            <Badge 
                                badgeContent={statistics.available} 
                                color="success"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        backgroundColor: '#2ed573',
                                        color: 'white',
                                        fontWeight: 'bold',
                                    }
                                }}
                            >
                                <Box sx={{ 
                                    backgroundColor: 'rgba(255,255,255,0.2)', 
                                    borderRadius: 2, 
                                    p: 1,
                                    minWidth: 40,
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        {statistics.total}
                                    </Typography>
                                </Box>
                            </Badge>
                        </Badge>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Tooltip title="Total spots">
                            <Paper sx={{ 
                                p: 1.5, 
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                textAlign: 'center',
                                minWidth: 60
                            }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Total
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {statistics.total}
                                </Typography>
                            </Paper>
                        </Tooltip>
                        
                        <Tooltip title="Available spots">
                            <Paper sx={{ 
                                p: 1.5, 
                                backgroundColor: 'rgba(46, 213, 115, 0.2)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                textAlign: 'center',
                                minWidth: 60
                            }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Free
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {statistics.available}
                                </Typography>
                            </Paper>
                        </Tooltip>
                        
                        <Tooltip title="Occupied spots">
                            <Paper sx={{ 
                                p: 1.5, 
                                backgroundColor: 'rgba(255, 71, 87, 0.2)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                textAlign: 'center',
                                minWidth: 60
                            }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Busy
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {statistics.occupied}
                                </Typography>
                            </Paper>
                        </Tooltip>
                    </Box>

                    <FilterControls>
                        <TextField
                            variant="outlined"
                            placeholder="🔍 Search by Spot ID..."
                            size="medium"
                            value={filterText}
                            onChange={onFilterChange}
                            fullWidth
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'rgba(0,0,0,0.5)' }} />,
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
                                                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                                    <Box
                                                        display="flex"
                                                        justifyContent="space-between"
                                                        alignItems="center"
                                                        mb={2}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <LocalParkingIcon sx={{ 
                                                                fontSize: 24,
                                                                opacity: 0.8 
                                                            }} />
                                                            <Typography variant="h6" sx={{ 
                                                                fontWeight: 'bold',
                                                                letterSpacing: '0.5px'
                                                            }}>
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
                                                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                                                    color: 'inherit',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                                                        transform: 'scale(1.1)',
                                                                    },
                                                                    transition: 'all 0.2s ease',
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
                                                            opacity: 0.9,
                                                            fontWeight: 500
                                                        }}>
                                                            Type: {spot.type}
                                                        </Typography>
                                                        <Chip
                                                            label={spot.occupied ? "Occupied" : "Available"}
                                                            color={spot.occupied ? "error" : "success"}
                                                            size="small"
                                                            sx={{ 
                                                                fontWeight: 'bold',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: spot.occupied 
                                                                    ? 'rgba(255,255,255,0.2)' 
                                                                    : 'rgba(255,255,255,0.2)',
                                                                color: 'inherit',
                                                                border: '1px solid rgba(255,255,255,0.3)',
                                                                '& .MuiChip-label': {
                                                                    px: 2
                                                                }
                                                            }}
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
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        borderRadius: 3,
                                        m: 2,
                                        backdropFilter: 'blur(10px)',
                                    }}>
                                        <LocalParkingIcon sx={{ 
                                            fontSize: 64, 
                                            color: 'rgba(0,0,0,0.3)',
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
