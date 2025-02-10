package org.zakariafarih.parkingmanager.controller;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.payload.ApiResponse;
import org.zakariafarih.parkingmanager.service.PasswordResetService;

@RestController
@RequestMapping("/api/auth")
public class ForgotPasswordController {

    @Autowired
    private PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam @Email @NotBlank String email) {
        try {
            passwordResetService.createPasswordResetToken(email);
            return ResponseEntity.ok(new ApiResponse(true, "Password reset email sent"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // Request payload for resetting the password.
    public static class ResetPasswordRequest {
        @NotBlank
        public String token;
        @NotBlank
        public String newPassword;
        @NotBlank
        public String confirmPassword;
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        if (!request.newPassword.equals(request.confirmPassword)) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Passwords do not match"));
        }
        try {
            passwordResetService.resetPassword(request.token, request.newPassword);
            return ResponseEntity.ok(new ApiResponse(true, "Password reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }
}
