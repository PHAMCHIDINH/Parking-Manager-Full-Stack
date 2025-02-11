package org.zakariafarih.parkingmanager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.service.ReservationService;

@RestController
@RequestMapping("/api/admin/reservations")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminReservationController {

    @Autowired
    private ReservationService reservationService;

    /**
     * Admin force-cancel a reservation (no user ownership check).
     */
    @DeleteMapping("/force-cancel/{id}")
    public ResponseEntity<?> forceCancelReservation(@PathVariable Long id) {
        reservationService.cancelReservation(id, null, true);
        return ResponseEntity.ok("Reservation cancelled by admin");
    }

}
