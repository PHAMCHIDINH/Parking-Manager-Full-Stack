export interface SpotRecord {
    spot_id: string;              // e.g. "1","2","69"
    type: string;                 // e.g. "VIP","NORMAL","PERSONAL"
    geometry?: {
        type: string;
        coordinates: number[][][] | number[];
    };
    occupied?: boolean;  // true => red highlight, false => green highlight
}

export interface GeoJsonFeature {
    type: "Feature";
    geometry: {
        type: string;
        coordinates: number[][][] | number[];
    };
    properties: {
        spot_id: string;
        type: string;
        [key: string]: any;
    };
}

export interface GeoJson {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
}

export interface Parking2DKonvaProps {
    selectedSpotId?: string;
    onSpotSelect: (id: string) => void;
    width?: number;
    height?: number;
}
