import React from 'react';
import { Box, Typography, styled } from '@mui/material';
import Parking2DKonva from './Parking2DKonva';

const KonvaHeader = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.light,
    borderRadius: theme.spacing(0.5),
    boxShadow: theme.shadows[2],
}));

// Increase the overall wrapper size
const KanvaWrapper = styled(Box)(({ theme }) => ({
    width: 1200,
    height: 800,
    backgroundColor: theme.palette.grey[300],
    borderRadius: theme.spacing(1),
    boxShadow: theme.shadows[3],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

// Increase the container that holds the Konva canvas
const StyledKonvaContainer = styled(Box)(({ theme }) => ({
    width: 1160, // Slightly smaller than KanvaWrapper to account for padding/borders
    height: 760,
    border: `2px solid ${theme.palette.divider}`,
}));

interface MainAreaProps {
    selectedSpotId?: string;
    onSpotSelect: (spotId: string) => void;
}

const MainArea: React.FC<MainAreaProps> = ({ selectedSpotId, onSpotSelect }) => {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                backgroundColor: 'grey.100',
            }}
        >
            <KonvaHeader>
                <Typography variant="subtitle1" color="text.primary">
                    Use the side panels to filter/select parking spots and assign statuses/types.
                </Typography>
            </KonvaHeader>
            <KanvaWrapper>
                <StyledKonvaContainer>
                    <Parking2DKonva
                        selectedSpotId={selectedSpotId}
                        onSpotSelect={onSpotSelect}
                        width={1160}
                        height={760}
                    />
                </StyledKonvaContainer>
            </KanvaWrapper>
        </Box>
    );
};

export default MainArea;
