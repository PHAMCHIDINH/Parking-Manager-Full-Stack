package org.zakariafarih.parkingmanager.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.ParkingSpot;
import org.zakariafarih.parkingmanager.model.Reservation;
import org.zakariafarih.parkingmanager.repository.ParkingSpotRepository;
import org.zakariafarih.parkingmanager.repository.ReservationRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Service to compute availability (free time slots) for a given ParkingSpot
 * within a specified time range.
 */
@Service
public class AvailabilityService {

    @Autowired
    private ParkingSpotRepository parkingSpotRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    /**
     * Returns a list of free intervals (start->end pairs) for the given parking spot
     * between windowStart and windowEnd, after considering all existing reservations.
     */
    public List<TimeInterval> getAvailableIntervals(Long parkingSpotId,
                                                    LocalDateTime windowStart,
                                                    LocalDateTime windowEnd) {

        ParkingSpot spot = parkingSpotRepository.findById(parkingSpotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found"));

        List<Reservation> reservations = reservationRepository.findByParkingSpotAndEndTimeAfter(spot, windowStart);

        reservations.sort(Comparator.comparing(Reservation::getStartTime));

        List<TimeInterval> availableIntervals = new ArrayList<>();
        LocalDateTime currentStart = windowStart;

        for (Reservation res : reservations) {
            LocalDateTime resStart = res.getStartTime();
            LocalDateTime resEnd = res.getEndTime();

            if (resStart.isAfter(currentStart)) {
                LocalDateTime gapEnd = resStart.isBefore(windowEnd) ? resStart : windowEnd;
                if (gapEnd.isAfter(currentStart)) {
                    availableIntervals.add(new TimeInterval(currentStart, gapEnd));
                }
            }
            if (resEnd.isAfter(currentStart)) {
                currentStart = resEnd;
            }
            if (currentStart.isAfter(windowEnd)) {
                break;
            }
        }

        if (currentStart.isBefore(windowEnd)) {
            availableIntervals.add(new TimeInterval(currentStart, windowEnd));
        }

        return availableIntervals;
    }

    /**
     * Simple DTO representing a start-end time interval.
     */
    public static class TimeInterval {
        private LocalDateTime start;
        private LocalDateTime end;

        public TimeInterval(LocalDateTime start, LocalDateTime end) {
            this.start = start;
            this.end = end;
        }

        public LocalDateTime getStart() {
            return start;
        }

        public LocalDateTime getEnd() {
            return end;
        }
    }
}
