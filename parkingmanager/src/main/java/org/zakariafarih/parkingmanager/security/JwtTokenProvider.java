package org.zakariafarih.parkingmanager.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.util.Date;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.zakariafarih.parkingmanager.model.User;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final String SECRET_KEY = "dd1bbba51c6e4ac40ac7e01c8778691583c14384bbec8292718efb3d67fbb3d24df8429f7d8d99b643327d70e4ddddf97c065dfd95053a0ac56cf2a4af9a45b22cbf6b6d5ca681969abe8fc33e276a26dfe3c2f5b99f04fbe326dc67aee98b27332e75f847c5ed8b83b6370dd8918b623ba12007d8c5be7efcc3fc1b2c3b4369a683fd553972b9f19869d09b55fe18e20b599c57368b8aed43d7d0f967797f356d6c1f01590b4dbcea7baf568e81dd597a7a15b6cb17386db215f15c1598a4c062581d323b7c8cd3d12ce18a8a9d739f8ff897b9b98e10cbcba5f788d28b7e3b714bd18426ebb868a2140c3a426b1095378d1a9491b4b6774167bd37a55f852dc2768ac717f9645e228d0191aa5ca5d44d0ac81a1029f418ab7b9ea2225c0caffc11235249b5708c50cb2c1a5fb1d586d23fda0742ca952a4a884c21a3ecec4d953939f0be1583e054e1281205e5ea33013fe5c30feca66feedc2230ad7431ca7dc4e324c6fd58c97c382b9fd8620d3ba8b873cdab24a6a2d5eb627d2d02c7ac7f2af06330eb1dc8aadd778c292f01d508b270ae99416c09b44e7f09d829d0c58a49b8aebdd4982425c74e4ee289c309c91a8515e1df11f74ea16a81b233e6191ab9afd386d7ab5c4f64de36ca4238ad27c632157f792b5a8c0e2af24100196125103f130938e9c04059f2277df059ea3f0b43d59e645f7b551782725689f423";

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    /**
     * Generates a JWT token for the given user.
     * The subject is set to the user’s ID (as a string) and additional claims for email and role are added.
     *
     * @param user The user for whom to generate the token.
     * @return The signed JWT token.
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + 604800000L); // 7 days expiration

        return Jwts.builder()
                .setSubject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey()) // uses HS256 by default
                .compact();
    }

    /**
     * Extracts the user’s ID from the token.
     *
     * @param token the JWT token.
     * @return the user ID as a Long.
     */
    public Long getUserIdFromJWT(String token) {
        Claims claims = Jwts.parser()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        // Here the subject is the user id (as a string)
        return Long.parseLong(claims.getSubject());
    }

    /**
     * Validates the JWT token.
     *
     * @param token the token to validate.
     * @return true if the token is valid; false otherwise.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(getSigningKey()).build().parseClaimsJws(token);
            return true;
        } catch (Exception ex) {
            logger.error("Invalid JWT Token: {}", ex.getMessage());
            return false;
        }
    }
}
