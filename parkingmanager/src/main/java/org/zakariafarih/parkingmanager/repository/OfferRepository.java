package org.zakariafarih.parkingmanager.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.zakariafarih.parkingmanager.model.Offer;
import org.zakariafarih.parkingmanager.model.User;
import java.util.List;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByUser(User user);
}
