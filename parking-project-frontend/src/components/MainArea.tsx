import React, { useMemo } from 'react';
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
    width: '100%',
    maxWidth: 1400,
    aspectRatio: '3 / 2',
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledKonvaContainer = styled(Box)(({ theme }) => ({
    width: '96%',
    height: '92%',
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
    const dims = useMemo(() => {
        // Maintain 3:2 aspect within container
        return { width: 1160, height: 760 };
    }, []);

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
                <Typography variant="subtitle2" color="text.secondary">Chọn vị trí trên bản đồ hoặc dùng bộ lọc ở panel bên.</Typography>
            </KonvaHeader>
            <KanvaWrapper>
                <StyledKonvaContainer>
                    <Parking2DKonva
                        spots={spots}
                        selectedSpotId={selectedSpotId}
                        onSpotSelect={onSpotSelect}
                        width={dims.width}
                        height={dims.height}
                    />
                </StyledKonvaContainer>
            </KanvaWrapper>
        </Box>
    );
};

export default React.memo(MainArea);
