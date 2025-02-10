package org.zakariafarih.parkingmanager.payload;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
public class ReservationRequest {
    @NotNull
    private Long parkingSpotId;

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    private LocalDateTime endTime;
}
