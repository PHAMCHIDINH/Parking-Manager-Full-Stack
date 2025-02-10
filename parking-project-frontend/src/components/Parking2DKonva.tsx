import React, { useEffect, useState } from "react";
import { Stage, Layer, Line, Text } from "react-konva";
import { useTheme } from "@mui/material/styles";
import API from "../api";
import { CircularProgress, Box } from "@mui/material";

/**
 * The shape of a single feature in the local GeoJSON
 */
interface GeoJsonFeature {
    type: "Feature";
    geometry: {
        type: string;
        coordinates: any;
    };
    properties: {
        spot_id: string;
        type: string;
        occupied?: boolean;
        [key: string]: any;
    };
}

/**
 * The shape of the local GeoJSON collection
 */
interface GeoJson {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
}

/**
 * Props for the Konva component
 */
interface Parking2DKonvaProps {
    selectedSpotId?: string;
    onSpotSelect: (spotId: string) => void;
    width?: number;
    height?: number;
}

const Parking2DKonva: React.FC<Parking2DKonvaProps> = ({
                                                           selectedSpotId,
                                                           onSpotSelect,
                                                           width = 1000,
                                                           height = 800,
                                                       }) => {
    const theme = useTheme();

    // 1) Local GeoJSON data
    const [spotsData, setSpotsData] = useState<GeoJson | null>(null);
    const [linesData, setLinesData] = useState<GeoJson | null>(null);
    const [polysData, setPolysData] = useState<GeoJson | null>(null);

    // 2) Scale + offset for auto-fitting
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // 3) Loading state for initial geoJSON load
    const [loading, setLoading] = useState(false);

    // 4) Flag to know when geoJSON data has loaded
    const [geojsonLoaded, setGeojsonLoaded] = useState(false);

    // Load the local geoJSON files only once
    useEffect(() => {
        (async () => {
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
        })();
    }, []);

    // Set up a periodic occupancy fetch (runs only after geoJSON is loaded)
    useEffect(() => {
        if (!geojsonLoaded) return; // Wait until local geoJSON is loaded

        const fetchOccupancy = async () => {
            try {
                const resp = await API.get("/parking");
                // resp.data is expected to be like:
                // [ { label:"1", occupied:true }, { label:"2", occupied:false }, ... ]
                const backendList = resp.data as Array<{ label: string; occupied: boolean }>;
                const occupancyMap: Record<string, boolean> = {};
                backendList.forEach((s) => {
                    occupancyMap[s.label] = s.occupied;
                });
                // Clone and update the spotsData (do not mutate state directly)
                if (spotsData) {
                    const cloned = { ...spotsData, features: [...spotsData.features] };
                    cloned.features.forEach((feat) => {
                        const sid = feat.properties.spot_id;
                        feat.properties.occupied = occupancyMap[sid] ?? false;
                    });
                    setSpotsData(cloned);
                }
            } catch (err) {
                console.error("Error loading occupancy from backend:", err);
            }
        };

        // Immediately fetch once, then set up an interval
        fetchOccupancy();
        const intervalId = setInterval(fetchOccupancy, 30000); // every 30 seconds

        return () => clearInterval(intervalId);
    }, [geojsonLoaded]); // run this effect only when geojsonLoaded changes

    // 5) Compute bounding box => scale & offset
    useEffect(() => {
        if (!spotsData && !linesData && !polysData) return;

        const coords: [number, number][] = [];
        function gatherAll(input: any) {
            if (typeof input[0] === "number") {
                coords.push(input as [number, number]);
            } else {
                input.forEach((sub: any) => gatherAll(sub));
            }
        }
        [spotsData, linesData, polysData].forEach((fc) => {
            if (!fc || !fc.features) return;
            fc.features.forEach((feat) => gatherAll(feat.geometry.coordinates));
        });
        if (coords.length === 0) return;

        const xs = coords.map((c) => c[0]);
        const ys = coords.map((c) => c[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const dataWidth = maxX - minX;
        const dataHeight = maxY - minY;
        const scaleX = width / dataWidth;
        const scaleY = height / dataHeight;
        const newScale = Math.min(scaleX, scaleY) * 0.9;
        const offsetX = -minX * newScale + (width - dataWidth * newScale) / 2;
        const offsetY = +maxY * newScale + (height - dataHeight * newScale) / 2;
        setScale(newScale);
        setOffset({ x: offsetX, y: offsetY });
    }, [spotsData, linesData, polysData, width, height]);

    if (loading)
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    width: "100%",
                }}
            >
                <CircularProgress />
            </Box>
        );

    // 6) Render Parking Polygons
    function renderParkingPolygons() {
        if (!polysData?.features) return null;
        return polysData.features.map((feat, i) => {
            if (feat.geometry.type !== "Polygon") return null;
            const ring = feat.geometry.coordinates[0];
            const points = ring.map(([xx, yy]: number[]) => [
                xx * scale + offset.x,
                -yy * scale + offset.y,
            ]);
            return (
                <Line
                    key={`poly-${i}`}
                    points={points.flat()}
                    closed
                    fill="#ccc"
                    stroke="gray"
                    strokeWidth={1}
                />
            );
        });
    }

    // 7) Render Lines
    function renderLines() {
        if (!linesData?.features) return null;
        return linesData.features.map((feat, i) => {
            if (feat.geometry.type !== "LineString") return null;
            const pts = feat.geometry.coordinates.map(([xx, yy]: number[]) => [
                xx * scale + offset.x,
                -yy * scale + offset.y,
            ]);
            return (
                <Line
                    key={`line-${i}`}
                    points={pts.flat()}
                    stroke="green"
                    strokeWidth={1}
                />
            );
        });
    }

    // 8) Render Parking Spots
    function renderSpots() {
        if (!spotsData?.features) return null;
        return spotsData.features.map((feat) => {
            const spotId = feat.properties.spot_id || "";
            const isOccupied = !!feat.properties.occupied;
            const isSelected = spotId === selectedSpotId;
            let fillColor = isOccupied ? "rgba(255,0,0,0.4)" : "rgba(0,255,0,0.4)";
            if (isSelected) fillColor = "rgba(255,165,0,0.5)";
            const strokeColor = isSelected ? theme.palette.secondary.main : "gray";
            if (feat.geometry.type === "Polygon") {
                const ring = feat.geometry.coordinates[0];
                const points = ring.map(([xx, yy]: number[]) => [
                    xx * scale + offset.x,
                    -yy * scale + offset.y,
                ]);
                return (
                    <React.Fragment key={`spot-${spotId}`}>
                        <Line
                            points={points.flat()}
                            closed
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={2}
                            onClick={() => onSpotSelect(spotId)}
                        />
                    </React.Fragment>
                );
            }
            if (feat.geometry.type === "MultiPolygon") {
                const multi: number[][][] = feat.geometry.coordinates as number[][][];
                return multi.map((polyCoords, mpIndex) => {
                    const ring = polyCoords[0];
                    const points = ring.map(([xx, yy]: number[]) => [
                        xx * scale + offset.x,
                        -yy * scale + offset.y,
                    ]);
                    return (
                        <Line
                            key={`spot-${spotId}-mpoly-${mpIndex}`}
                            points={points.flat()}
                            closed
                            fill={fillColor}
                            stroke={strokeColor}
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
                {renderParkingPolygons()}
                {renderLines()}
                {renderSpots()}
            </Layer>
        </Stage>
    );
};

export default Parking2DKonva;
