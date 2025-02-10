package org.zakariafarih.parkingmanager.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.zakariafarih.parkingmanager.model.Notification;
import org.zakariafarih.parkingmanager.model.User;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientAndReadStatusFalse(User recipient);
}
