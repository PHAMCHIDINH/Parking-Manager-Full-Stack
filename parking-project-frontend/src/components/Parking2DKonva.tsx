import React, { useEffect, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { useTheme } from "@mui/material/styles";
import { CircularProgress, Box } from "@mui/material";
import API from "../api";

interface GeoJsonFeature {
    type: "Feature";
    geometry: {
        type: string;
        coordinates: any;
    };
    properties: {
        spot_id?: string;
        status?: string;
        occupied?: boolean;
        type?: string;
        reservations?: Reservation[];
    };
}

interface GeoJson {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
}

interface Reservation {
    id: number;
    startTime: string;
    endTime: string;
}

export interface Parking2DKonvaProps {
    selectedSpotId?: string;
    onSpotSelect: (spotId: string) => void;
    width?: number;
    height?: number;
}

// Define status colors for different occupancy states.
const STATUS_COLORS: Record<string, string> = {
    available: "rgba(0,255,0,0.4)",
    reserved: "rgba(255,165,0,0.4)",
    occupied: "rgba(255,0,0,0.4)",
    under_maintenance: "rgba(128,128,128,0.4)",
    personal_use: "rgba(0,0,255,0.4)",
};

const Parking2DKonva: React.FC<Parking2DKonvaProps> = ({
                                                           selectedSpotId,
                                                           onSpotSelect,
                                                           width = 1000,
                                                           height = 800,
                                                       }) => {
    const theme = useTheme();

    const [spotsData, setSpotsData] = useState<GeoJson | null>(null);
    const [linesData, setLinesData] = useState<GeoJson | null>(null);
    const [polysData, setPolysData] = useState<GeoJson | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [geojsonLoaded, setGeojsonLoaded] = useState<boolean>(false);

    const [scale, setScale] = useState<number>(1);
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        const loadGeojson = async () => {
            setLoading(true);
            try {
                const [spotsRes, linesRes, polysRes] = await Promise.all([
                    fetch("/Parking_Spots_Layer.geojson"),
                    fetch("/Parking_Lines.geojson"),
                    fetch("/Parking_Polygon.geojson"),
                ]);
                const [spots, lines, polys] = await Promise.all([
                    spotsRes.json(),
                    linesRes.json(),
                    polysRes.json(),
                ]);
                setSpotsData(spots);
                setLinesData(lines);
                setPolysData(polys);
                setGeojsonLoaded(true);
            } catch (err) {
                console.error("Error loading local geojson:", err);
            } finally {
                setLoading(false);
            }
        };
        loadGeojson();
    }, []);

    // 2) Once the GeoJSON is loaded, fetch occupancy and reservations
    useEffect(() => {
        if (!geojsonLoaded || !spotsData) return;

        const fetchStatusesAndReservations = async () => {
            try {
                // a) Get occupancy data from /parking
                const resp = await API.get("/parking");
                const backendList: Array<{
                    label: string;
                    status: string;
                    occupied?: boolean;
                    category?: string;
                }> = resp.data;
                const statusMap: Record<string, { status: string; occupied?: boolean; type?: string }> = {};
                backendList.forEach((s) => {
                    statusMap[s.label] = {
                        status: s.status.toLowerCase(),
                        occupied: s.occupied,
                        type: s.category ? s.category.toLowerCase() : "normal",
                    };
                });

                // b) Gather all numeric spotIds from the local GeoJSON
                const numericSpotIds: number[] = [];
                spotsData.features.forEach((feat) => {
                    const sid = feat.properties.spot_id;
                    if (sid && /^\d+$/.test(sid)) {
                        numericSpotIds.push(parseInt(sid, 10));
                    }
                });

                // c) If numeric IDs exist, make a single call to the multi-spot endpoint.
                let multiSpotReservations: Record<string, Reservation[]> = {};
                if (numericSpotIds.length > 0) {
                    const joined = numericSpotIds.join(",");
                    const multiResp = await API.get(`/reservations/multi-spot?spotIds=${joined}`);
                    multiSpotReservations = multiResp.data;
                }

                // d) Merge occupancy and reservations info into the local spotsData features.
                const now = new Date();
                const updatedFeatures: GeoJsonFeature[] = spotsData.features.map((feat) => {
                    const label = feat.properties.spot_id || "";
                    // default values:
                    let newStatus = "available";
                    let newOccupied = false;
                    let newType = "normal";
                    if (statusMap[label]) {
                        newStatus = statusMap[label].status;
                        newOccupied = !!statusMap[label].occupied;
                        newType = statusMap[label].type || "normal";
                    }

                    let reservations: Reservation[] = [];
                    const parsedId = parseInt(label, 10);
                    if (!isNaN(parsedId) && multiSpotReservations[parsedId]) {
                        reservations = multiSpotReservations[parsedId];
                    }

                    // Override status to 'reserved' if any reservation is still active.
                    const hasFutureReservation = reservations.some((r) => new Date(r.endTime) > now);
                    if (hasFutureReservation && newStatus === "available") {
                        newStatus = "reserved";
                    }

                    return {
                        ...feat,
                        properties: {
                            ...feat.properties,
                            status: newStatus,
                            occupied: newOccupied,
                            type: newType,
                            reservations,
                        },
                    };
                });

                // Update spotsData with the merged features.
                setSpotsData((prev) => (prev ? { ...prev, features: updatedFeatures } : prev));
            } catch (error) {
                console.error("Error fetching occupancy/reservations:", error);
            }
        };

        // Call the function only once
        fetchStatusesAndReservations();
    }, [geojsonLoaded]);

    useEffect(() => {
        if (!spotsData && !linesData && !polysData) return;

        const coords: [number, number][] = [];
        const gatherAll = (input: any) => {
            if (Array.isArray(input) && typeof input[0] === "number") {
                coords.push(input as [number, number]);
            } else if (Array.isArray(input)) {
                input.forEach((sub: any) => gatherAll(sub));
            }
        };

        [spotsData, linesData, polysData].forEach((fc) => {
            if (!fc?.features) return;
            fc.features.forEach((feat) => gatherAll(feat.geometry.coordinates));
        });

        if (coords.length === 0) return;

        const xs = coords.map((c) => c[0]);
        const ys = coords.map((c) => c[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const dataWidth = maxX - minX || 1;
        const dataHeight = maxY - minY || 1;
        const scaleX = width / dataWidth;
        const scaleY = height / dataHeight;
        const newScale = Math.min(scaleX, scaleY) * 0.9;
        const offsetX = -minX * newScale + (width - dataWidth * newScale) / 2;
        const offsetY = maxY * newScale + (height - dataHeight * newScale) / 2;

        setScale(newScale);
        setOffset({ x: offsetX, y: offsetY });
    }, [spotsData, linesData, polysData, width, height]);

    if (loading) {
        return (
            <Box
                sx={{
                    width,
                    height,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    // Helper: get fill color for a spot using its status
    function getFillColor(spotStatus?: string, isSelected?: boolean) {
        if (isSelected) return "rgba(255,255,0,0.6)";
        if (!spotStatus) return "rgba(0,255,0,0.4)";
        const c = STATUS_COLORS[spotStatus.toLowerCase()];
        return c || "rgba(0,255,0,0.4)";
    }

    // Render polygons
    function renderPolygons() {
        if (!polysData?.features) return null;
        return polysData.features.map((feat, idx) => {
            if (feat.geometry.type !== "Polygon") return null;
            const ring = feat.geometry.coordinates[0];
            const points = ring.map((pt: number[]) => [
                pt[0] * scale + offset.x,
                -pt[1] * scale + offset.y,
            ]);
            return (
                <Line
                    key={`poly-${idx}`}
                    points={points.flat()}
                    closed
                    fill="#ccc"
                    stroke="gray"
                    strokeWidth={1}
                />
            );
        });
    }

    // Render lines
    function renderLines() {
        if (!linesData?.features) return null;
        return linesData.features.map((feat, idx) => {
            if (feat.geometry.type !== "LineString") return null;
            const pts = feat.geometry.coordinates.map((pt: number[]) => [
                pt[0] * scale + offset.x,
                -pt[1] * scale + offset.y,
            ]);
            return (
                <Line key={`line-${idx}`} points={pts.flat()} stroke="green" strokeWidth={1} />
            );
        });
    }

    function renderSpots() {
        if (!spotsData?.features) return null;
        return spotsData.features.map((feat, idx) => {
            const spotId = feat.properties.spot_id || "";
            const status = feat.properties.status || "available";
            const isSelected = spotId === selectedSpotId;

            if (feat.geometry.type === "Polygon") {
                const ring = feat.geometry.coordinates[0];
                const points = ring.map((pt: number[]) => [
                    pt[0] * scale + offset.x,
                    -pt[1] * scale + offset.y,
                ]);
                return (
                    <Line
                        key={`spot-poly-${spotId}-${idx}`}
                        points={points.flat()}
                        closed
                        fill={isSelected ? "rgba(255,255,0,0.6)" : getFillColor(status)}
                        stroke={isSelected ? "yellow" : "gray"}
                        strokeWidth={2}
                        onClick={() => onSpotSelect(spotId)}
                    />
                );
            } else if (feat.geometry.type === "MultiPolygon") {
                const multi = feat.geometry.coordinates as number[][][];
                return multi.map((poly, mpIdx) => {
                    const ring = poly[0];
                    const points = ring.map((pt: number[]) => [
                        pt[0] * scale + offset.x,
                        -pt[1] * scale + offset.y,
                    ]);
                    return (
                        <Line
                            key={`spot-mpoly-${spotId}-${idx}-${mpIdx}`}
                            points={points.flat()}
                            closed
                            fill={isSelected ? "rgba(255,255,0,0.6)" : getFillColor(status)}
                            stroke={isSelected ? "yellow" : "gray"}
                            strokeWidth={2}
                            onClick={() => onSpotSelect(spotId)}
                        />
                    );
                });
            }
            return null;
        });
    }

    return (
        <Stage width={width} height={height} style={{ background: theme.palette.grey[300] }}>
            <Layer>
                {renderPolygons()}
                {renderLines()}
            </Layer>
            <Layer>{renderSpots()}</Layer>
        </Stage>
    );
};

export default Parking2DKonva;
