package org.zakariafarih.parkingmanager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.model.ParkingSpot;
import org.zakariafarih.parkingmanager.model.ParkingStatus;
import org.zakariafarih.parkingmanager.payload.ParkingStatusUpdateRequest;
import org.zakariafarih.parkingmanager.payload.PythonOccupancyDTO;
import org.zakariafarih.parkingmanager.payload.SpotCornerDTO;
import org.zakariafarih.parkingmanager.service.ParkingSpotService;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/parking")
public class ParkingSpotController {

    @Autowired
    private ParkingSpotService parkingSpotService;

    @GetMapping("/geo-ids")
    public ResponseEntity<List<String>> getNextGeoSpotIds(@RequestParam int limit) {
        List<ParkingSpot> all = parkingSpotService.getAllParkingSpots();
        List<String> numericLabels = new ArrayList<>();
        for (ParkingSpot sp : all) {
            String lbl = sp.getLabel();
            if (lbl.matches("\\d+")) {
                numericLabels.add(lbl);
            }
        }
        numericLabels.sort(Comparator.comparingInt(Integer::parseInt));

        if (numericLabels.size() > limit) {
            numericLabels = numericLabels.subList(0, limit);
        }
        return ResponseEntity.ok(numericLabels);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ParkingSpot> createParkingSpot(@RequestBody ParkingSpot parkingSpot) {
        ParkingSpot created = parkingSpotService.createParkingSpot(parkingSpot);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/auto")
    public ResponseEntity<ParkingSpot> autoCreateParkingSpot(@RequestBody ParkingSpot parkingSpot) {
        ParkingSpot created = parkingSpotService.createParkingSpot(parkingSpot);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<ParkingSpot>> getAllParkingSpots() {
        return ResponseEntity.ok(parkingSpotService.getAllParkingSpots());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ParkingSpot> updateParkingSpotStatus(@PathVariable Long id,
                                                               @RequestParam ParkingStatus status) {
        ParkingSpot updated = parkingSpotService.updateParkingSpotStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/update-status")
    public ResponseEntity<?> updateParkingStatus(@RequestBody ParkingStatusUpdateRequest request) {
        Set<String> occupied = request.getOccupiedSpots();
        parkingSpotService.updateParkingSpotStatuses(occupied);
        return ResponseEntity.ok("Parking spot statuses updated successfully.");
    }

    // Python occupancy approach
    @PostMapping("/python-occupancies")
    public ResponseEntity<?> updatePythonOccupancies(@RequestBody List<PythonOccupancyDTO> occupancyList) {
        parkingSpotService.updatePythonOccupancies(occupancyList);
        return ResponseEntity.ok("Python occupancy updates processed.");
    }

    @PostMapping("/define-corners")
    public ResponseEntity<?> defineCorners(@RequestBody List<SpotCornerDTO> cornerList) {
        parkingSpotService.saveImageCorners(cornerList);
        return ResponseEntity.ok("Corners saved successfully.");
    }
}
