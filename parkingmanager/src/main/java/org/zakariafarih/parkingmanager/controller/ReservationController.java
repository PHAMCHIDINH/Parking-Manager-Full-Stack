// AFFECTED CLASS
package org.zakariafarih.parkingmanager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.model.Reservation;
import org.zakariafarih.parkingmanager.payload.ReservationRequest;
import org.zakariafarih.parkingmanager.security.CustomUserDetails;
import org.zakariafarih.parkingmanager.service.AvailabilityService;
import org.zakariafarih.parkingmanager.service.ReservationService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private AvailabilityService availabilityService;

    /**
     * Create a new reservation for the authenticated user.
     * Applies role constraints for VIP/PERSONAL spots in the service layer.
     */
    @PostMapping
    public ResponseEntity<?> createReservation(
            Authentication authentication,
            @RequestBody ReservationRequest request
    ) {
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        Long userId = principal.getUser().getId();

        Reservation reservation = reservationService.createReservation(
                userId,
                request.getParkingSpotId(),
                request.getStartTime(),
                request.getEndTime()
        );
        return ResponseEntity.ok(reservation);
    }

    /**
     * Cancel a reservation (only if owned by user or if user is admin).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelReservation(Authentication authentication, @PathVariable Long id) {
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        Long requestingUserId = principal.getUser().getId();
        boolean isAdmin = principal.getUser().getRole().name().equals("ROLE_ADMIN");

        reservationService.cancelReservation(id, requestingUserId, isAdmin);
        return ResponseEntity.ok("Reservation cancelled successfully");
    }

    /**
     * Get all reservations in the system (for demonstration).
     */
    @GetMapping
    public ResponseEntity<List<Reservation>> getAllReservations() {
        return ResponseEntity.ok(reservationService.getAllReservations());
    }

    /**
     * GET reservations belonging to the currently logged-in user.
     * If user is admin, returns an empty list (or do your own logic).
     */
    @GetMapping("/mine")
    public ResponseEntity<?> getMyReservations(Authentication authentication) {
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        if (principal.getUser().getRole().name().equals("ROLE_ADMIN")) {
            return ResponseEntity.ok().body(List.of());
        }
        Long userId = principal.getId();
        List<Reservation> myList = reservationService.getReservationsByUserId(userId);
        return ResponseEntity.ok(myList);
    }

    /**
     * Return reservation history for a given spot (both past and future).
     */
    @GetMapping("/spot-history/{spotId}")
    public ResponseEntity<List<Reservation>> getSpotHistory(@PathVariable Long spotId) {
        List<Reservation> history = reservationService.findAllBySpot(spotId);
        return ResponseEntity.ok(history);
    }

    /**
     * Return free intervals for a specific parking spot between [start, end].
     */
    @GetMapping("/availability")
    public ResponseEntity<?> getAvailability(
            @RequestParam("spotId") Long spotId,
            @RequestParam("start") LocalDateTime start,
            @RequestParam("end") LocalDateTime end
    ) {
        if (end.isBefore(start)) {
            return ResponseEntity.badRequest().body("End time must be after start time");
        }
        var intervals = availabilityService.getAvailableIntervals(spotId, start, end);
        return ResponseEntity.ok(intervals);
    }

    /**
     * ADMIN: Force-cancel a reservation no matter who owns it.
     */
    @DeleteMapping("/admin/force-cancel/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> forceCancelReservation(@PathVariable Long id) {
        reservationService.cancelReservation(id, null, true);
        return ResponseEntity.ok("Reservation force-cancelled by admin");
    }

    /**
     * Get reservations for multiple spots in one call.
     * Example request:
     *   GET /api/reservations/multi-spot?spotIds=1,2,3
     * Response shape:
     *   {
     *     "1": [ {...}, {...} ],
     *     "2": [ {...} ],
     *     "3": []
     *   }
     */
    @GetMapping("/multi-spot")
    public ResponseEntity<Map<Long, List<Reservation>>> getReservationsForMultipleSpots(
            @RequestParam List<Long> spotIds
    ) {
        Map<Long, List<Reservation>> result = new HashMap<>();
        for (Long sid : spotIds) {
            List<Reservation> list = reservationService.findAllBySpot(sid);
            result.put(sid, list);
        }
        return ResponseEntity.ok(result);
    }
}
