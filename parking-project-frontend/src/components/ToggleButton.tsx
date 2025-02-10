import React from 'react';
import { IconButton, Box, styled } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';

interface ToggleButtonProps {
    side: 'left' | 'right';
    isOpen: boolean;
    onToggle: () => void;
}

interface ToggleButtonContainerProps {
    side: 'left' | 'right';
}

const ToggleButtonContainer = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'side',
})<ToggleButtonContainerProps>(({ theme, side }) => ({
    position: "absolute",
    top: "50%",
    [side]: -20,
    transform: "translateY(-50%)",
    zIndex: theme.zIndex.drawer + 2,
}));

const ToggleButton: React.FC<ToggleButtonProps> = ({ side, isOpen, onToggle }) => {
    const getIcon = () => {
        if (side === 'left') {
            return isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />;
        } else {
            return isOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />;
        }
    };

    return (
        <ToggleButtonContainer side={side}>
            <IconButton
                onClick={onToggle}
                sx={{
                    backgroundColor: side === 'left' ? 'secondary.main' : 'primary.main',
                    color: side === 'left' ? 'secondary.contrastText' : 'primary.contrastText',
                    "&:hover": {
                        backgroundColor: side === 'left' ? 'secondary.dark' : 'primary.dark',
                    },
                }}
            >
                {getIcon()}
            </IconButton>
        </ToggleButtonContainer>
    );
};

export default ToggleButton;
