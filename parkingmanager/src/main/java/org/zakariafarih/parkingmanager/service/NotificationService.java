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
        messagingTemplate.convertAndSendToUser(recipient.getId().toString(), "/queue/notifications", savedNotification);
        return savedNotification;
    }

    public void sendNotificationToAdmins(String message) {
        messagingTemplate.convertAndSend("/topic/admin-alerts", message);
    }
}
