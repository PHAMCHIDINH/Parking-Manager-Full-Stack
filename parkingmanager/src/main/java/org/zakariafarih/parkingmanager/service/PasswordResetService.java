package org.zakariafarih.parkingmanager.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.PasswordResetToken;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.repository.PasswordResetTokenRepository;
import org.zakariafarih.parkingmanager.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetService {
    private static final int EXPIRATION_MINUTES = 60;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    public void createPasswordResetToken(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (!userOpt.isPresent()) {
            throw new RuntimeException("User with given email does not exist");
        }

        User user = userOpt.get();

        // Check if a token already exists for this user
        Optional<PasswordResetToken> existingToken = tokenRepository.findByUser(user);
        existingToken.ifPresent(tokenRepository::delete);  // Delete old token if exists

        // Generate new token
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(EXPIRATION_MINUTES))
                .build();

        tokenRepository.save(resetToken);

        // Construct a reset URL – adjust the URL as needed (this example uses the frontend port)
        String resetUrl = "http://localhost:5173/reset-password?token=" + token;
        String subject = "Password Reset Request";
        String message = "To reset your password, please click the following link:\n" + resetUrl;
        emailService.sendSimpleMessage(user.getEmail(), subject, message);
    }

    public User validatePasswordResetToken(String token) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (!tokenOpt.isPresent()) {
            throw new RuntimeException("Invalid password reset token");
        }
        PasswordResetToken resetToken = tokenOpt.get();
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Password reset token has expired");
        }
        return resetToken.getUser();
    }

    public void resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (!tokenOpt.isPresent()) {
            throw new RuntimeException("Invalid password reset token");
        }
        PasswordResetToken resetToken = tokenOpt.get();
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Password reset token has expired");
        }
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.delete(resetToken);
    }
}
