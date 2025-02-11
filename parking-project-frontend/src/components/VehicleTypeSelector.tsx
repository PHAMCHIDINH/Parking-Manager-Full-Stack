import React from "react";
import { Box, Typography, IconButton, styled } from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import AirportShuttleIcon from "@mui/icons-material/AirportShuttle";
import LocalPoliceIcon from "@mui/icons-material/LocalPolice";
import EmojiFlagsIcon from "@mui/icons-material/EmojiFlags";
import { grey, blue } from "@mui/material/colors";

interface VehicleTypeSelectorProps {
    value: string;
    onChange: (newType: string) => void;
}

const VEHICLE_TYPES = [
    { label: "Car", icon: <DirectionsCarIcon /> },
    { label: "Van", icon: <AirportShuttleIcon /> },
    { label: "Taxi", icon: <LocalTaxiIcon /> },
    { label: "Bus", icon: <DirectionsBusIcon /> },
    { label: "Police", icon: <LocalPoliceIcon /> },
    { label: "Government", icon: <EmojiFlagsIcon /> },
];

const IconContainer = styled(Box)<{ selected?: boolean }>(({ theme, selected }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    cursor: "pointer",
    backgroundColor: selected ? blue[50] : "transparent",
    border: selected ? `2px solid ${blue[400]}` : `1px solid ${grey[300]}`,
    transition: "all 0.2s ease",
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: theme.shadows[2],
    },
}));

const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({ value, onChange }) => {
    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {VEHICLE_TYPES.map((typeObj) => {
                const isSelected = value.toLowerCase() === typeObj.label.toLowerCase();

                return (
                    <IconContainer
                        key={typeObj.label}
                        selected={isSelected}
                        onClick={() => onChange(typeObj.label)}
                    >
                        <IconButton color={isSelected ? "primary" : "default"}>
                            {typeObj.icon}
                        </IconButton>
                        <Typography
                            variant="caption"
                            color={isSelected ? "primary" : "text.secondary"}
                        >
                            {typeObj.label}
                        </Typography>
                    </IconContainer>
                );
            })}
        </Box>
    );
};

export default VehicleTypeSelector;
