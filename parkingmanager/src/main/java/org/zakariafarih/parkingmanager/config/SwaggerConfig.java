package org.zakariafarih.parkingmanager.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI parkingManagerOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Parking Manager API")
                        .description("API documentation for the Parking Manager application")
                        .version("v1.0"));
    }
}
