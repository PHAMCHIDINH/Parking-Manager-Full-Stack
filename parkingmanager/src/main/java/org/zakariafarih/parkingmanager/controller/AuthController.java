package org.zakariafarih.parkingmanager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.model.Role;
import org.zakariafarih.parkingmanager.payload.JwtAuthenticationResponse;
import org.zakariafarih.parkingmanager.payload.LoginRequest;
import org.zakariafarih.parkingmanager.payload.SignUpRequest;
import org.zakariafarih.parkingmanager.security.JwtTokenProvider;
import org.zakariafarih.parkingmanager.security.CustomUserDetails;
import org.zakariafarih.parkingmanager.service.UserService;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserService userService;

    @Operation(summary = "Authenticate user and return JWT token")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User authenticated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String jwt = tokenProvider.generateToken(userDetails.getUser());
        return ResponseEntity.ok(new JwtAuthenticationResponse(jwt, "Bearer"));
    }

    @Operation(summary = "Register a new user (default role: USER)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User registered successfully"),
            @ApiResponse(responseCode = "400", description = "Registration error")
    })
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest signUpRequest) {
        User user = userService.registerUser(signUpRequest.getEmail(), signUpRequest.getPassword(), Role.ROLE_USER);
        return ResponseEntity.ok(new JwtAuthenticationResponse("User registered successfully", "Success"));
    }
}
