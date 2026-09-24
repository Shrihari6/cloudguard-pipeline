package com.cloudguard.backend.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * RateLimiterService — in-memory sliding window rate limiter.
 *
 * <p>Protects LLM API token budget and prevents denial-of-service or bot scraping.
 * Limits users to a configurable number of chat requests per minute (default: 30 req/min).
 */
@Service
public class RateLimiterService {

    private static final int MAX_REQUESTS_PER_MINUTE = 30;
    private final ConcurrentHashMap<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    /**
     * Checks if a request from the given client key (e.g. IP address or session) is allowed.
     *
     * @param clientKey identifier for the caller
     * @return {@code true} if allowed; {@code false} if rate limit exceeded.
     */
    public boolean allowRequest(String clientKey) {
        if (clientKey == null || clientKey.isBlank()) {
            clientKey = "default-client";
        }

        long currentMinute = System.currentTimeMillis() / 60000;
        RequestCounter counter = requestCounts.compute(clientKey, (k, existing) -> {
            if (existing == null || existing.minute != currentMinute) {
                return new RequestCounter(currentMinute, new AtomicInteger(1));
            } else {
                existing.count.incrementAndGet();
                return existing;
            }
        });

        // Periodic cleanup of stale entries if map gets large
        if (requestCounts.size() > 5000) {
            requestCounts.entrySet().removeIf(entry -> entry.getValue().minute < currentMinute - 2);
        }

        return counter.count.get() <= MAX_REQUESTS_PER_MINUTE;
    }

    public String getRateLimitExceededMessage() {
        return """
                ⚠️ **Rate Limit Exceeded**

                You have submitted more than 30 AI Copilot requests in the last minute.

                Please wait a few seconds before submitting another query to preserve LLM token capacity and ensure service availability.
                """;
    }

    private static class RequestCounter {
        final long minute;
        final AtomicInteger count;

        RequestCounter(long minute, AtomicInteger count) {
            this.minute = minute;
            this.count = count;
        }
    }
}
