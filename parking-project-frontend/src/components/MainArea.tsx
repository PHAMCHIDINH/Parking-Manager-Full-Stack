import React from 'react';
import { Box, Typography, styled } from '@mui/material';
import Parking2DKonva from './Parking2DKonva';
import { SpotRecord } from '../types';

const KonvaHeader = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.light,
    borderRadius: theme.spacing(0.5),
    boxShadow: theme.shadows[2],
}));

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

const StyledKonvaContainer = styled(Box)(({ theme }) => ({
    width: 1160,
    height: 760,
    border: `2px solid ${theme.palette.divider}`,
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
                p: 4,
                backgroundColor: 'grey.100',
            }}
        >
            <KonvaHeader>
                <Typography variant="subtitle1" color="text.primary">
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
