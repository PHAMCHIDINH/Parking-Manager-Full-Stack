package org.zakariafarih.parkingmanager.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.zakariafarih.parkingmanager.model.ParkingSpot;
import org.zakariafarih.parkingmanager.model.ParkingSpotCategory;
import org.zakariafarih.parkingmanager.model.ParkingStatus;
import org.zakariafarih.parkingmanager.repository.ParkingSpotRepository;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Component
public class DatabaseInitializer {

    @Autowired
    private ParkingSpotRepository parkingSpotRepository;

    private static final int maxControlled = 69;

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("Parking_Spots_Layer.geojson");
            InputStream inputStream = resource.getInputStream();
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(inputStream);
            JsonNode features = root.get("features");

            if (features == null || !features.isArray()) {
                System.out.println("No features array in GeoJSON. Aborting.");
                return;
            }

            // Collect them
            List<JsonNode> pending = new ArrayList<>();
            for (JsonNode feat : features) {
                JsonNode props = feat.get("properties");
                if (props != null && props.has("spot_id")) {
                    pending.add(feat);
                }
            }

            // Sort by integer spot_id ascending
            Collections.sort(pending, new Comparator<JsonNode>() {
                @Override
                public int compare(JsonNode o1, JsonNode o2) {
                    return Integer.compare(
                            parseOrZero(o1.get("properties").get("spot_id").asText()),
                            parseOrZero(o2.get("properties").get("spot_id").asText())
                    );
                }
                private int parseOrZero(String s) {
                    try {
                        return Integer.parseInt(s);
                    } catch (NumberFormatException ex) {
                        return 0;
                    }
                }
            });

            for (JsonNode feat : pending) {
                JsonNode props = feat.get("properties");
                String geoSpotId = props.get("spot_id").asText(); // e.g. "1","2","69"

                // Determine if controlled
                boolean controlled = false;
                try {
                    int numericId = Integer.parseInt(geoSpotId);
                    if (numericId <= maxControlled) {
                        controlled = true;
                    }
                } catch (NumberFormatException ignored) {}

                // Convert "type" => Category
                String typeStr = props.has("type") ? props.get("type").asText() : "Normal";
                ParkingSpotCategory category;
                try {
                    category = ParkingSpotCategory.valueOf(typeStr.toUpperCase());
                } catch (IllegalArgumentException ex) {
                    category = ParkingSpotCategory.NORMAL;
                }

                // geometry
                String geometryJson = mapper.writeValueAsString(feat.get("geometry"));

                // Insert if not exists
                boolean exists = parkingSpotRepository.findAll().stream()
                        .anyMatch(sp -> geoSpotId.equals(sp.getLabel()));
                if (!exists) {
                    ParkingSpot spot = ParkingSpot.builder()
                            .label(geoSpotId)
                            .category(category)
                            .status(ParkingStatus.AVAILABLE)
                            .occupied(false)
                            .controlled(controlled)
                            .coordinates(geometryJson)
                            .build();
                    parkingSpotRepository.save(spot);
                }
            }
            System.out.println("DB init complete: inserted all spots in ascending order.");
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
