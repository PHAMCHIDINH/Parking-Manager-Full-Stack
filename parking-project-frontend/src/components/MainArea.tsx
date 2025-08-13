import React from 'react';
import { Box, Typography, styled } from '@mui/material';
import Parking2DKonva from './Parking2DKonva';
import { SpotRecord } from '../types';

const KonvaHeader = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
}));

const KanvaWrapper = styled(Box)(({ theme }) => ({
    width: 1200,
    height: 800,
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledKonvaContainer = styled(Box)(({ theme }) => ({
    width: 1160,
    height: 760,
    border: `1px solid ${theme.palette.divider}`,
}));

interface MainAreaProps {
    spots: SpotRecord[];
    selectedSpotId?: string;
    onSpotSelect: (spotId: string) => void;
}

const MainArea: React.FC<MainAreaProps> = ({
                                               spots,
                                               selectedSpotId,
                                               onSpotSelect
                                           }) => {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                backgroundColor: 'background.default',
            }}
        >
            <KonvaHeader>
                <Typography variant="subtitle2" color="text.secondary">
                    Select or filter parking spots using the side panels, or click on a spot in the map.
                </Typography>
            </KonvaHeader>
            <KanvaWrapper>
                <StyledKonvaContainer>
                    <Parking2DKonva
                        spots={spots}
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
