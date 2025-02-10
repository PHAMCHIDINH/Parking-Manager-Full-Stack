// src/main/java/org/zakariafarih/parkingmanager/payload/ParkingStatusUpdateRequest.java
package org.zakariafarih.parkingmanager.payload;

import lombok.Data;
import java.util.Set;

@Data
public class ParkingStatusUpdateRequest {
    private Set<String> occupiedSpots;
}
