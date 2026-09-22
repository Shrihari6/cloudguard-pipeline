package com.cloudguard.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads key=value pairs from a {@code .env} file located at the project root
 * (two levels above the {@code backend/} working directory) into the Spring
 * {@link ConfigurableEnvironment} as the <em>lowest</em>-priority property source.
 *
 * <p>This means real OS environment variables (e.g. set on Render) always win,
 * while the {@code .env} file provides safe local defaults without being
 * committed to source control.
 *
 * <p>Registered via {@code META-INF/spring.factories} so Spring Boot picks it
 * up automatically before {@code @Value} injection happens.
 */
public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String PROPERTY_SOURCE_NAME = "dotenvFile";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {

        // Try both the backend working dir and the project root (one level up)
        File dotEnv = resolveEnvFile();
        if (dotEnv == null || !dotEnv.exists()) {
            System.out.println("[DotEnv] No .env file found — skipping dotenv loader.");
            return;
        }

        Map<String, Object> props = new HashMap<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(dotEnv))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                // Skip comments and blank lines
                if (line.isEmpty() || line.startsWith("#")) continue;
                int idx = line.indexOf('=');
                if (idx < 1) continue;
                String key   = line.substring(0, idx).trim();
                String value = line.substring(idx + 1).trim();
                // Strip surrounding quotes if present
                if ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                props.put(key, value);
            }
            System.out.println("[DotEnv] Loaded " + props.size()
                    + " variable(s) from: " + dotEnv.getAbsolutePath());
        } catch (Exception e) {
            System.err.println("[DotEnv] Failed to read .env file: " + e.getMessage());
        }

        if (!props.isEmpty()) {
            // Add as LAST source so OS env vars always take precedence
            environment.getPropertySources().addLast(
                    new MapPropertySource(PROPERTY_SOURCE_NAME, props));
        }
    }

    /** Searches for .env starting from CWD, then one and two levels up. */
    private File resolveEnvFile() {
        String[] searchPaths = {
            ".",          // backend/ (mvn spring-boot:run working dir)
            "..",         // project root  (d:\03_Cybersecurity\cloudgaurd-pipeleine)
            "../..",      // two levels up (unlikely but safe fallback)
        };
        for (String rel : searchPaths) {
            File f = new File(rel, ".env");
            try {
                f = f.getCanonicalFile();
            } catch (Exception ignored) {}
            if (f.exists()) return f;
        }
        return null;
    }
}
