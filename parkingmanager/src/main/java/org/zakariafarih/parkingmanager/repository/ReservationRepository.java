package org.zakariafarih.parkingmanager.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.zakariafarih.parkingmanager.model.Reservation;
import org.zakariafarih.parkingmanager.model.ParkingSpot;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByParkingSpotAndEndTimeAfter(ParkingSpot parkingSpot, LocalDateTime now);
    List<Reservation> findByParkingSpot(ParkingSpot parkingSpot);
}
