package org.zakariafarih.parkingmanager.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String name;
    private String profileImageUrl;          // URL/path of the profile picture
    private String vehicleType;              // e.g., Car, Van, etc.
    private String licensePlateImageUrl;     // URL/path of the license plate image
    @Column(length = 1000)
    private String carInfo;                  // Additional info about the car
}
