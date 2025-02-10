package org.zakariafarih.parkingmanager.payload;

import lombok.Data;
import java.util.List;

@Data
public class SpotCornerDTO {
    private long spotId;
    private List<List<Integer>> corners;
}
