import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Tabs,
    Tab,
    Typography,
    useTheme,
    List,
    ListItem,
    IconButton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import moment, { Moment } from "moment";
import { SpotRecord } from "../types";
import VehicleTypeSelector from "./VehicleTypeSelector";
import WeekPicker, { TimeInterval } from "./WeekPicker";
import SpotUsageHistory, { UsageRecord } from "./SpotUsageHistory"; // <--- Import new component

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}
function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        </div>
    );
}

interface SpotDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    spot: SpotRecord | null;
}

// Example usage history data
const placeholderUsageData: UsageRecord[] = [
    {
        id: 1,
        user: "John Doe",
        start: new Date(2025, 1, 10, 8, 0),
        end: new Date(2025, 1, 10, 12, 0),
        color: "#2196F3",
    },
    {
        id: 2,
        user: "Jane Smith",
        start: new Date(2025, 1, 9, 9, 30),
        end: new Date(2025, 1, 9, 11, 30),
        color: "#F44336",
    },
    {
        id: 3,
        user: "Alice Brown",
        start: new Date(2025, 1, 8, 14, 0),
        end: new Date(2025, 1, 8, 15, 0),
        color: "#4CAF50",
    },
];

const generateCurrentWeek = (): Moment[] => {
    const start = moment().startOf("isoWeek"); // Monday
    return Array.from({ length: 7 }, (_, i) => start.clone().add(i, "days"));
};

const SpotDetailsDialog: React.FC<SpotDetailsDialogProps> = ({ open, onClose, spot }) => {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);

    // Vehicle type
    const [selectedVehicle, setSelectedVehicle] = useState<string>("Car");

    // Reservation intervals from WeekPicker
    const [selectedIntervals, setSelectedIntervals] = useState<TimeInterval[]>([]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleReserve = () => {
        console.log("Reserving spot:", {
            spotId: spot?.spot_id,
            vehicleType: selectedVehicle,
            intervals: selectedIntervals.map((interval) => ({
                start: interval.start.toDate(),
                end: interval.end.toDate(),
            })),
        });
        setSelectedIntervals([]);
        onClose();
    };

    if (!spot) return null;

    const weekRange = generateCurrentWeek();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Spot Details - {spot.spot_id}</DialogTitle>
            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab label="Spot Type" />
                        <Tab label="Reservation" />
                        <Tab label="Usage History" />
                        <Tab label="Extra Info" />
                    </Tabs>
                </Box>

                {/* TAB 0: Spot Type */}
                <TabPanel value={tabValue} index={0}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Choose the vehicle type for this spot by clicking an icon below.
                    </Typography>
                    <VehicleTypeSelector
                        value={selectedVehicle}
                        onChange={(newType) => setSelectedVehicle(newType)}
                    />
                </TabPanel>

                {/* TAB 1: Reservation */}
                <TabPanel value={tabValue} index={1}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Reserve this spot. Select one or multiple available time frames below.
                    </Typography>
                    <Box
                        sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 2,
                            minHeight: 400,
                        }}
                    >
                        <WeekPicker
                            currRange={weekRange}
                            busyIntervals={[]} // your busy intervals
                            onSelectionsChange={(selections: TimeInterval[]) =>
                                setSelectedIntervals(selections)
                            }
                        />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Selected Intervals:</Typography>
                        {selectedIntervals.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No intervals selected
                            </Typography>
                        ) : (
                            <List dense>
                                {selectedIntervals.map((interval, i) => (
                                    <ListItem
                                        key={`${interval.start.toISOString()}-${interval.end.toISOString()}`}
                                        secondaryAction={
                                            <IconButton
                                                edge="end"
                                                onClick={() => {
                                                    const newIntervals = [...selectedIntervals];
                                                    newIntervals.splice(i, 1);
                                                    setSelectedIntervals(newIntervals);
                                                }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <Typography variant="body2">
                                            {interval.start.format("HH:mm")} - {interval.end.format("HH:mm")}
                                        </Typography>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={selectedIntervals.length === 0}
                            onClick={handleReserve}
                        >
                            Reserve
                        </Button>
                    </Box>
                </TabPanel>

                {/* TAB 2: Usage History */}
                <TabPanel value={tabValue} index={2}>
                    <SpotUsageHistory usageData={placeholderUsageData} />
                </TabPanel>

                {/* TAB 3: Extra Info */}
                <TabPanel value={tabValue} index={3}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Here you can display additional details or logs:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: "1em" }}>
                        <li>Maintenance logs</li>
                        <li>Security notes</li>
                        <li>Any other metadata</li>
                    </ul>
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SpotDetailsDialog;
