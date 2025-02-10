package org.zakariafarih.parkingmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.Reservation;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.model.ParkingSpot;
import org.zakariafarih.parkingmanager.model.ParkingSpotCategory;
import org.zakariafarih.parkingmanager.model.Role;
import org.zakariafarih.parkingmanager.repository.ReservationRepository;
import org.zakariafarih.parkingmanager.repository.ParkingSpotRepository;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReservationService {

    private static final Logger logger = LoggerFactory.getLogger(ReservationService.class);

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ParkingSpotRepository parkingSpotRepository;

    public Reservation createReservation(User user, Long parkingSpotId, LocalDateTime startTime, LocalDateTime endTime) {
        ParkingSpot parkingSpot = parkingSpotRepository.findById(parkingSpotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found"));

        // Enforce reservation restrictions based on spot category.
        if (parkingSpot.getCategory() == org.zakariafarih.parkingmanager.model.ParkingSpotCategory.VIP) {
            if (!(user.getRole().equals(Role.ROLE_VIP) || user.getRole().equals(Role.ROLE_ADMIN))) {
                throw new RuntimeException("Only VIP users or Admins can reserve VIP spots");
            }
        } else if (parkingSpot.getCategory() == org.zakariafarih.parkingmanager.model.ParkingSpotCategory.PERSONAL) {
            if (!(user.getRole().equals(Role.ROLE_PERSONNEL) || user.getRole().equals(Role.ROLE_ADMIN))) {
                throw new RuntimeException("Only personnel or Admins can reserve personal spots");
            }
        }
        // Check if the spot is available in the given timeframe.
        List<Reservation> existingReservations = reservationRepository.findByParkingSpotAndEndTimeAfter(parkingSpot, LocalDateTime.now());
        if (!existingReservations.isEmpty()) {
            throw new RuntimeException("Parking spot is already reserved or occupied");
        }

        Reservation reservation = Reservation.builder()
                .user(user)
                .parkingSpot(parkingSpot)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        // Mark parking spot as reserved.
        parkingSpot.setStatus(org.zakariafarih.parkingmanager.model.ParkingStatus.RESERVED);
        parkingSpotRepository.save(parkingSpot);
        Reservation created = reservationRepository.save(reservation);
        logger.info("Created reservation {} for user {} on spot {}", created.getId(), user.getEmail(), parkingSpot.getLabel());
        return created;
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public Reservation cancelReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        // Mark parking spot as available.
        ParkingSpot parkingSpot = reservation.getParkingSpot();
        parkingSpot.setStatus(org.zakariafarih.parkingmanager.model.ParkingStatus.AVAILABLE);
        parkingSpotRepository.save(parkingSpot);
        reservationRepository.delete(reservation);
        logger.info("Cancelled reservation with ID {}", reservationId);
        return reservation;
    }

    public Reservation getActiveReservationForSpot(Long spotId, LocalDateTime now) {
        ParkingSpot spot = parkingSpotRepository.findById(spotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found"));
        List<Reservation> reservations = reservationRepository.findByParkingSpotAndEndTimeAfter(spot, now);
        for (Reservation r : reservations) {
            if (r.getStartTime().isBefore(now) && r.getEndTime().isAfter(now)) {
                logger.info("Found active reservation {} for spot {}", r.getId(), spot.getId());
                return r;
            }
        }
        return null;
    }
}
