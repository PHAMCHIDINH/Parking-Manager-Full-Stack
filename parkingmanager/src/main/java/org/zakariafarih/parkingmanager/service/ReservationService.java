package org.zakariafarih.parkingmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.*;
import org.zakariafarih.parkingmanager.repository.ParkingSpotRepository;
import org.zakariafarih.parkingmanager.repository.ReservationRepository;
import org.zakariafarih.parkingmanager.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Handles reservation creation, checks role constraints, overlapping times,
 * and manages the cancellation logic (including returning spot to AVAILABLE).
 */
@Service
public class ReservationService {

    private static final Logger logger = LoggerFactory.getLogger(ReservationService.class);

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ParkingSpotRepository parkingSpotRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Creates a reservation for a given user on a given spot, checking:
     *  - Time window is valid (end after start, start not in the past).
     *  - Role constraints if spot is VIP or PERSONAL.
     *  - Overlapping time with existing reservations.
     *  - If starting soon => mark spot as RESERVED immediately.
     */
    public Reservation createReservation(Long userId,
                                         Long parkingSpotId,
                                         LocalDateTime startTime,
                                         LocalDateTime endTime) {
        if (endTime.isBefore(startTime)) {
            throw new RuntimeException("End time cannot be before start time");
        }
        if (startTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a reservation that starts in the past");
        }

        // fetch user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID=" + userId));

        // fetch parking spot
        ParkingSpot spot = parkingSpotRepository.findById(parkingSpotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found with ID=" + parkingSpotId));

        ParkingSpotCategory category = spot.getCategory();
        if (category == ParkingSpotCategory.VIP &&
                !(user.getRole() == Role.ROLE_VIP || user.getRole() == Role.ROLE_ADMIN)) {
            throw new RuntimeException("Only VIP or Admin can reserve VIP spots");
        }
        if (category == ParkingSpotCategory.PERSONAL &&
                !(user.getRole() == Role.ROLE_PERSONNEL || user.getRole() == Role.ROLE_ADMIN)) {
            throw new RuntimeException("Only PERSONNEL or Admin can reserve PERSONAL spots");
        }

        if (hasOverlap(spot, startTime, endTime)) {
            throw new RuntimeException("Parking spot is already reserved in that time range");
        }

        Reservation reservation = Reservation.builder()
                .user(user)
                .parkingSpot(spot)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        if (startTime.isBefore(LocalDateTime.now().plusMinutes(5))) {
            spot.setStatus(ParkingStatus.RESERVED);
            parkingSpotRepository.save(spot);
        }

        Reservation created = reservationRepository.save(reservation);
        logger.info("Created reservation {} for user={} on spot={}", created.getId(), user.getEmail(), spot.getLabel());
        return created;
    }

    /**
     * Return all reservations in the database (for debugging or admin usage).
     */
    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public List<Reservation> getReservationsForSpot(Long spotId) {
        ParkingSpot spot = parkingSpotRepository.findById(spotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found"));
        return reservationRepository.findByParkingSpot(spot);
    }

    public List<Reservation> getReservationsByUserId(Long userId) {
        return reservationRepository.findAll().stream()
                .filter(r -> r.getUser().getId().equals(userId))
                .collect(Collectors.toList());
    }

    /**
     * Returns ALL reservations for a given spot ID (past & future), sorted by startTime ascending.
     */
    public List<Reservation> findAllBySpot(Long spotId) {
        ParkingSpot spot = parkingSpotRepository.findById(spotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found with ID=" + spotId));

        List<Reservation> all = reservationRepository.findAll();
        // filter and sort
        return all.stream()
                .filter(r -> r.getParkingSpot().getId().equals(spot.getId()))
                .sorted(Comparator.comparing(Reservation::getStartTime))
                .toList();
    }

    /**
     * Cancels a reservation if owned by user or if user is admin.
     * If the spot was marked RESERVED by this reservation, revert to AVAILABLE.
     */
    public Reservation cancelReservation(Long reservationId, Long requestingUserId, boolean isAdmin) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found with ID=" + reservationId));

        // check ownership or admin
        if (!isAdmin && !reservation.getUser().getId().equals(requestingUserId)) {
            throw new RuntimeException("You do not have permission to cancel this reservation");
        }

        // if currently 'RESERVED', revert spot to 'AVAILABLE'
        ParkingSpot spot = reservation.getParkingSpot();
        if (spot.getStatus() == ParkingStatus.RESERVED) {
            spot.setStatus(ParkingStatus.AVAILABLE);
            parkingSpotRepository.save(spot);
        }

        reservationRepository.delete(reservation);
        logger.info("Cancelled reservation with ID={}", reservationId);
        return reservation;
    }

    /**
     * Checks if [start, end) overlaps with any existing reservation for the same spot.
     */
    private boolean hasOverlap(ParkingSpot spot, LocalDateTime start, LocalDateTime end) {
        // get any reservation that ends after 'start' => potential overlap
        List<Reservation> futureReservations = reservationRepository.findByParkingSpotAndEndTimeAfter(spot, start);
        for (Reservation r : futureReservations) {
            LocalDateTime rStart = r.getStartTime();
            LocalDateTime rEnd = r.getEndTime();
            boolean overlap = !(end.isBefore(rStart) || start.isAfter(rEnd));
            if (overlap) return true;
        }
        return false;
    }

    /**
     * Helper to fetch the active reservation if the spot is occupied/reserved right now.
     */
    public Reservation getActiveReservationForSpot(Long spotId, LocalDateTime now) {
        ParkingSpot spot = parkingSpotRepository.findById(spotId)
                .orElseThrow(() -> new RuntimeException("Parking spot not found with ID=" + spotId));

        List<Reservation> future = reservationRepository.findByParkingSpotAndEndTimeAfter(spot, now);
        for (Reservation r : future) {
            if (r.getStartTime().isBefore(now) && r.getEndTime().isAfter(now)) {
                logger.info("Found active reservation={} for spot={}", r.getId(), spot.getId());
                return r;
            }
        }
        return null;
    }
}
