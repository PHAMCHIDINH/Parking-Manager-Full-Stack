package org.zakariafarih.parkingmanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.ParkingSpot;
import org.zakariafarih.parkingmanager.model.ParkingStatus;
import org.zakariafarih.parkingmanager.model.Reservation;
import org.zakariafarih.parkingmanager.payload.PythonOccupancyDTO;
import org.zakariafarih.parkingmanager.payload.SpotCornerDTO;
import org.zakariafarih.parkingmanager.repository.ParkingSpotRepository;
import org.zakariafarih.parkingmanager.model.ParkingSpotCategory;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ParkingSpotService {
    private static final Logger logger = LoggerFactory.getLogger(ParkingSpotService.class);

    @Autowired
    private ParkingSpotRepository parkingSpotRepository;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final Random random = new Random();

    public ParkingSpot createParkingSpot(ParkingSpot parkingSpot) {
        if (parkingSpot.getCategory() == null) {
            parkingSpot.setCategory(ParkingSpotCategory.NORMAL);
        }
        parkingSpot.setStatus(ParkingStatus.AVAILABLE);
        parkingSpot.setOccupied(false);
        ParkingSpot created = parkingSpotRepository.save(parkingSpot);
        logger.info("Created parking spot label={} (DB ID={})", created.getLabel(), created.getId());
        return created;
    }

    public List<ParkingSpot> getAllParkingSpots() {
        return parkingSpotRepository.findAll();
    }

    public ParkingSpot getParkingSpotById(Long id) {
        return parkingSpotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parking spot not found"));
    }

    public ParkingSpot updateParkingSpotStatus(Long id, ParkingStatus status) {
        ParkingSpot spot = getParkingSpotById(id);
        spot.setStatus(status);
        spot.setOccupied(status == ParkingStatus.OCCUPIED);
        parkingSpotRepository.save(spot);

        messagingTemplate.convertAndSend("/topic/parking-updates", spot);
        return spot;
    }

    public void updateParkingSpotStatuses(Set<String> occupiedSpotLabels) {
        logger.info("Received occupancy update: {}", occupiedSpotLabels);
        List<ParkingSpot> all = parkingSpotRepository.findAll();
        for (ParkingSpot sp : all) {
            if (occupiedSpotLabels.contains(sp.getLabel())) {
                sp.setStatus(ParkingStatus.OCCUPIED);
                sp.setOccupied(true);
            } else {
                sp.setStatus(ParkingStatus.AVAILABLE);
                sp.setOccupied(false);
            }
        }
        parkingSpotRepository.saveAll(all);
        messagingTemplate.convertAndSend("/topic/parking-updates", all);

        validateReservations(all);
    }

    public void updatePythonOccupancies(List<PythonOccupancyDTO> occupancyList) {
        // Convert each {spotId: X, occupied: bool} => label="X"
        Map<String, Boolean> occMap = new HashMap<>();
        for (PythonOccupancyDTO dto : occupancyList) {
            String label = String.valueOf(dto.getSpotId());
            occMap.put(label, dto.isOccupied());
        }

        List<ParkingSpot> all = parkingSpotRepository.findAll();

        // for each spot that is mentioned => set occupancy
        for (ParkingSpot sp : all) {
            if (occMap.containsKey(sp.getLabel())) {
                boolean isOcc = occMap.get(sp.getLabel());
                sp.setOccupied(isOcc);
                sp.setStatus(isOcc ? ParkingStatus.OCCUPIED : ParkingStatus.AVAILABLE);
            }
        }

        for (ParkingSpot sp : all) {
            if (!occMap.containsKey(sp.getLabel())) {
                boolean randomOcc = new Random().nextBoolean();
                sp.setOccupied(randomOcc);
                sp.setStatus(randomOcc ? ParkingStatus.OCCUPIED : ParkingStatus.AVAILABLE);
            }
        }

        parkingSpotRepository.saveAll(all);
        // broadcast via WebSocket
        // messagingTemplate.convertAndSend("/topic/parking-updates", all);
    }

    private void validateReservations(List<ParkingSpot> spots) {
        LocalDateTime now = LocalDateTime.now();
        for (ParkingSpot sp : spots) {
            if (sp.getStatus() == ParkingStatus.OCCUPIED) {
                Reservation activeRes = reservationService.getActiveReservationForSpot(sp.getId(), now);
                if (activeRes == null) {
                    String alert = "Alert: Spot " + sp.getLabel() + " is occupied with no active reservation!";
                    logger.warn(alert);
                    notificationService.sendNotificationToAdmins(alert);
                }
            }
        }
    }

    public void saveImageCorners(List<SpotCornerDTO> cornerList) {
        for (SpotCornerDTO dto : cornerList) {
            ParkingSpot spot = getParkingSpotById(dto.getSpotId());
            try {
                String cornersJson = new ObjectMapper().writeValueAsString(dto.getCorners());
                spot.setImageCoordinates(cornersJson);
                parkingSpotRepository.save(spot);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
