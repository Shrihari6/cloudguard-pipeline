package com.cloudguard.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler — ensures ALL unhandled errors return a structured
 * JSON payload instead of Spring's default HTML error page or an empty 500 body.
 *
 * This is especially important for Render deployments where opaque 500 responses
 * make Groq/API errors very hard to debug from Vercel's frontend perspective.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles bean validation failures (@Valid on request bodies).
     * Returns 400 with a list of field-level validation errors.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex) {

        String fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));

        log.warn("[VALIDATION] Request body validation failed: {}", fieldErrors);

        return buildErrorResponse(HttpStatus.BAD_REQUEST,
                "Request validation failed", fieldErrors);
    }

    /**
     * Catch-all handler for any unhandled runtime exception.
     * Logs the full stack trace so it appears in Render logs, then returns
     * a structured 500 JSON body the frontend can parse and display.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("[ERROR] Unhandled exception in request: {}", ex.getMessage());
        ex.printStackTrace(); // Full stack trace → Render / local console logs

        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal server error", ex.getMessage());
    }

    // ─── Helper ──────────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> buildErrorResponse(
            HttpStatus status, String error, String detail) {

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("detail", detail != null ? detail : "No additional detail");

        return ResponseEntity.status(status).body(body);
    }
}
