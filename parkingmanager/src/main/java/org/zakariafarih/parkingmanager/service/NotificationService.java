package org.zakariafarih.parkingmanager.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.Notification;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.repository.NotificationRepository;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Notification sendNotification(User recipient, String message) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .message(message)
                .readStatus(false)
                .build();
        Notification savedNotification = notificationRepository.save(notification);
        // Send notification via WebSocket to the specific user.
        messagingTemplate.convertAndSendToUser(recipient.getId().toString(), "/queue/notifications", savedNotification);
        return savedNotification;
    }

    // Broadcast an alert to admin clients.
    public void sendNotificationToAdmins(String message) {
        // This sends the alert to a topic that admin dashboards subscribe to.
        messagingTemplate.convertAndSend("/topic/admin-alerts", message);
    }
}
