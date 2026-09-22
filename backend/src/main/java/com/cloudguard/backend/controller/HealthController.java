package com.cloudguard.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/")
    public String rootHealthCheck() {
        return "CloudGuard Pipeline API is live and operational!";
    }

    @GetMapping("/api/health")
    public String apiHealthCheck() {
        return "CloudGuard Backend is running!";
    }
}
