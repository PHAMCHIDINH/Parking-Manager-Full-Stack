package org.zakariafarih.parkingmanager.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "offers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Offer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;

    private int discountPercentage;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}
