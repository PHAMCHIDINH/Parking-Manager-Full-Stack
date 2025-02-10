// src/main/java/org/zakariafarih/parkingmanager/model/ParkingSpot.java
package org.zakariafarih.parkingmanager.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_spots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The label from GeoJSON (e.g. "1","2","13", etc.).
     */
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParkingStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParkingSpotCategory category;

    /**
     * The original GeoJSON geometry for that spot (from the file).
     * We'll keep this for map-based usage or reference.
     */
    @Column(columnDefinition = "json", nullable = false)
    private String coordinates;

    /**
     * Whether it is under some "controlled" zone or not
     */
    @Column(nullable = false)
    private boolean controlled;

    /**
     * True if physically occupied (detected), false otherwise.
     */
    @Column(nullable = false)
    private boolean occupied;

    /**
     * NEW: The corners that the Python GUI defines for the aerial image.
     * We'll store them as JSON: e.g. "[ [x1,y1], [x2,y2], [x3,y3], [x4,y4] ]"
     * If the user hasn't defined them, it can be null or empty.
     */
    @Column(columnDefinition = "json")
    private String imageCoordinates;

    public String getLabel() {
        return label;
    }

    public static ParkingSpotBuilder builder() {
        return new ParkingSpotBuilder();
    }
}
