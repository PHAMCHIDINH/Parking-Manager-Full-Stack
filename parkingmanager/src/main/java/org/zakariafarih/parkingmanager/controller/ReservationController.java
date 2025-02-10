package org.zakariafarih.parkingmanager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.model.Reservation;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.payload.ReservationRequest;
import org.zakariafarih.parkingmanager.service.ReservationService;
import org.zakariafarih.parkingmanager.repository.UserRepository;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private UserRepository userRepository;

    @Operation(summary = "Create a new reservation for the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation created successfully"),
            @ApiResponse(responseCode = "400", description = "Error creating reservation")
    })
    @PostMapping
    public ResponseEntity<Reservation> createReservation(Authentication authentication, @RequestBody ReservationRequest reservationRequest) {
        String userEmail = authentication.getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Reservation reservation = reservationService.createReservation(user, reservationRequest.getParkingSpotId(),
                reservationRequest.getStartTime(), reservationRequest.getEndTime());
        return ResponseEntity.ok(reservation);
    }

    @Operation(summary = "Get all reservations")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservations retrieved successfully")
    })
    @GetMapping
    public ResponseEntity<List<Reservation>> getAllReservations() {
        List<Reservation> reservations = reservationService.getAllReservations();
        return ResponseEntity.ok(reservations);
    }

    @Operation(summary = "Cancel a reservation by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation cancelled successfully"),
            @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id) {
        reservationService.cancelReservation(id);
        return ResponseEntity.ok("Reservation cancelled successfully");
    }
}
