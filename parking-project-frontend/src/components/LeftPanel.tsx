import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    styled
} from '@mui/material';

const LeftDrawerHeader = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    backgroundColor: theme.palette.secondary.dark,
    color: theme.palette.secondary.contrastText,
}));

const LeftDrawerContent = styled(Box)(({ theme }) => ({
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
}));

const PlaceholderCard = styled(Card)(({ theme }) => ({
    margin: theme.spacing(1, 0),
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    padding: theme.spacing(1),
    textAlign: 'center',
}));

interface LeftPanelProps {
    isOpen: boolean;
    leftTab: number;
    onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const statusPlaceholders = ["Reserved", "Currently Occupied", "Unavailable", "Under Maintenance"];
const vehicleTypes = ["Car", "Van", "Bike", "Government Vehicle", "Truck"];

const LeftPanel: React.FC<LeftPanelProps> = ({ isOpen, leftTab, onTabChange }) => {
    return (
        <Box>
            {isOpen && (
                <>
                    <LeftDrawerHeader>
                        <Typography variant="h6">Assignment Panel</Typography>
                    </LeftDrawerHeader>
                    <Tabs
                        value={leftTab}
                        onChange={onTabChange}
                        indicatorColor="secondary"
                        textColor="inherit"
                        variant="fullWidth"
                    >
                        <Tab label="Status" />
                        <Tab label="Type Vehicule" />
                    </Tabs>
                    <LeftDrawerContent>
                        {leftTab === 0 &&
                            statusPlaceholders.map((status) => (
                                <PlaceholderCard key={status}>
                                    <CardContent>
                                        <Typography variant="body1">{status}</Typography>
                                    </CardContent>
                                </PlaceholderCard>
                            ))}
                        {leftTab === 1 &&
                            vehicleTypes.map((type) => (
                                <PlaceholderCard key={type}>
                                    <CardContent>
                                        <Typography variant="body1">{type}</Typography>
                                    </CardContent>
                                </PlaceholderCard>
                            ))}
                    </LeftDrawerContent>
                </>
            )}
        </Box>
    );
};

export default LeftPanel;
