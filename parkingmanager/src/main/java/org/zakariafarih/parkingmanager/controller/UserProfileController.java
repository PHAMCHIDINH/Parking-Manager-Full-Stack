package org.zakariafarih.parkingmanager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.payload.ApiResponse;
import org.zakariafarih.parkingmanager.repository.UserRepository;
import org.springframework.security.core.Authentication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
public class UserProfileController {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Autowired
    private UserRepository userRepository;

    // GET profile endpoint
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            Authentication authentication,
            @RequestParam("name") String name,
            @RequestParam("vehicleType") String vehicleType,
            @RequestParam("carInfo") String carInfo,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage,
            @RequestPart(value = "licensePlateImage", required = false) MultipartFile licensePlateImage
    ) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(name);
        user.setVehicleType(vehicleType);
        user.setCarInfo(carInfo);

        try {
            if (profileImage != null && !profileImage.isEmpty()) {
                String profileImageFilename = UUID.randomUUID().toString() + "_" + profileImage.getOriginalFilename();
                Path profileImagePath = Paths.get(uploadDir, profileImageFilename);
                Files.createDirectories(profileImagePath.getParent());
                profileImage.transferTo(profileImagePath.toFile());
                user.setProfileImageUrl("/uploads/" + profileImageFilename);
            }
            if (licensePlateImage != null && !licensePlateImage.isEmpty()) {
                String licensePlateImageFilename = UUID.randomUUID().toString() + "_" + licensePlateImage.getOriginalFilename();
                Path licensePlateImagePath = Paths.get(uploadDir, licensePlateImageFilename);
                Files.createDirectories(licensePlateImagePath.getParent());
                licensePlateImage.transferTo(licensePlateImagePath.toFile());
                user.setLicensePlateImageUrl("/uploads/" + licensePlateImageFilename);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "File upload failed: " + e.getMessage()));
        }

        userRepository.save(user);
        return ResponseEntity.ok(new ApiResponse(true, "Profile updated successfully"));
    }
}
