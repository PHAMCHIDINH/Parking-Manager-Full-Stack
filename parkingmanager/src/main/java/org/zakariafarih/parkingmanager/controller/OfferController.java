package org.zakariafarih.parkingmanager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.model.Offer;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.repository.UserRepository;
import org.zakariafarih.parkingmanager.service.OfferService;
import java.util.List;

@RestController
@RequestMapping("/api/offers")
public class OfferController {

    @Autowired
    private OfferService offerService;

    @Autowired
    private UserRepository userRepository;

    @Operation(summary = "Create a new offer (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Offer created successfully"),
            @ApiResponse(responseCode = "400", description = "Error creating offer")
    })
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Offer> createOffer(@RequestBody Offer offer) {
        Offer createdOffer = offerService.createOffer(offer);
        return ResponseEntity.ok(createdOffer);
    }

    @Operation(summary = "Retrieve offers for a specific user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Offers retrieved successfully")
    })
    @GetMapping
    public ResponseEntity<List<Offer>> getOffers(@RequestParam Long userId) {
        // Retrieve the user from the database
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Fetch offers associated with the user
        List<Offer> offers = offerService.getOffersForUser(user);
        return ResponseEntity.ok(offers);
    }

}
