package org.zakariafarih.parkingmanager.payload;

import lombok.Data;

@Data
public class PythonOccupancyDTO {
    private int spotId;
    private boolean occupied;
}
