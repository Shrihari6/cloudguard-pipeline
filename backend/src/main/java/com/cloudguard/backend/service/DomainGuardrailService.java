package com.cloudguard.backend.service;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * DomainGuardrailService — deterministic, zero-token guardrail engine.
 *
 * <p>Validates incoming prompts against the CloudGuard AWS & Cybersecurity domain
 * BEFORE forwarding them to the LLM / Groq API.
 *
 * <p>If a prompt is off-topic (e.g. celebrity trivia, pop culture, sports, cooking, politics),
 * it is intercepted instantly, saving 100% of API tokens and preventing model hallucinations.
 */
@Service
public class DomainGuardrailService {

    // Common greetings and system questions that are valid for the assistant
    private static final Pattern GREETING_PATTERN = Pattern.compile(
            "^(hi|hello|hey|greetings|help|who are you|what can you do|what is cloudguard|how to use|commands|start|clear|status)[!?.]*$",
            Pattern.CASE_INSENSITIVE
    );

    // Explicit off-topic blacklist patterns (celebrities, movies, sports, recipes, general trivia)
    private static final Pattern EXPLICIT_OFF_TOPIC_PATTERN = Pattern.compile(
            "\\b(salman khan|shah rukh|actor|actress|bollywood|hollywood|movie|cinema|height of|weight of|age of|girlfriend|wife of|husband of|cricket|football|fifa|messi|ronaldo|recipe|cook|baking|joke|sing a song|weather in|capital of|president of|prime minister)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Comprehensive Cloud, AWS, DevOps, & Cybersecurity domain keywords
    private static final Set<String> DOMAIN_KEYWORDS = Set.of(
            // AWS Services
            "aws", "amazon", "kinesis", "s3", "sqs", "sns", "eventbridge",
            "lambda", "glue", "emr", "ec2", "ecs", "eks", "rds", "dynamodb",
            "redshift", "vpc", "apigateway", "api gateway", "cloudfront", "iam",
            "kms", "waf", "cloudwatch", "guardduty", "shield", "secrets manager",
            "cloudformation", "cloudtrail", "athena", "fargate", "aurora",
            "route53", "elb", "alb", "nlb", "cognito", "step functions",

            // Cybersecurity & IAM Concepts
            "security", "posture", "compliance", "identity", "role", "policy",
            "least privilege", "encryption", "cmk", "sse", "tls", "ssl",
            "certificate", "cipher", "at-rest", "in-transit", "threat", "vulnerability",
            "nist", "cis", "soc2", "hipaa", "gdpr", "audit", "mfa", "access key",
            "secret", "token", "zero trust", "firewall", "ddos", "cve", "exploit",

            // Architecture & Pipeline Concepts
            "pipeline", "canvas", "architecture", "topology", "node", "edge",
            "connection", "dag", "dagre", "layout", "flow", "etl", "data lake",
            "data warehouse", "stream", "queue", "serverless", "microservices",
            "event-driven", "compute", "storage", "database", "nosql", "sql",
            "failover", "high availability", "disaster recovery", "backup",

            // CloudGuard Features & Actions
            "autofix", "auto-fix", "fix", "remediate", "remediation", "validate",
            "score", "check", "checklist", "pass", "fail", "layer1", "layer2",
            "layer3", "l1", "l2", "l3", "metric", "cloudguard"
    );

    /**
     * Checks whether the user's message is relevant to AWS, Cloud Computing, or Cybersecurity.
     *
     * @param message the raw user input prompt
     * @return {@code true} if allowed to proceed to LLM / Copilot; {@code false} if off-topic.
     */
    public boolean isDomainRelevant(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String trimmed = message.trim();

        // 1. Fast check for greetings / help
        if (GREETING_PATTERN.matcher(trimmed).matches()) {
            return true;
        }

        // 2. Reject explicit off-topic terms (e.g. "whats the height of salman khan")
        if (EXPLICIT_OFF_TOPIC_PATTERN.matcher(trimmed).find()) {
            return false;
        }

        // 3. Normalize text and check for domain keyword presence
        String normalized = trimmed.toLowerCase(Locale.ROOT);

        for (String keyword : DOMAIN_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }

        // 4. If message contains technical question patterns about cloud/systems
        if (normalized.contains("cloud") || normalized.contains("infrastructure")
                || normalized.contains("deploy") || normalized.contains("terraform")
                || normalized.contains("container") || normalized.contains("kubernetes")
                || normalized.contains("docker") || normalized.contains("linux")
                || normalized.contains("latency") || normalized.contains("throughput")
                || normalized.contains("subnets") || normalized.contains("cidr")) {
            return true;
        }

        // If no domain connection found, treat as out-of-scope to protect API token budget
        return false;
    }

    /**
     * Generates a standardized, user-friendly off-topic guardrail refusal response.
     */
    public String getOffTopicRefusalMessage() {
        return """

                **Ayy why broo, can't you ask me about:**
                • **AWS Architecture & Services**
                • **3-Layer Security Posture** (Identity Control, Data Encryption, Threat Observability)
                • **Canvas Pipeline Remediation** (Resolving failing checks or Auto-Fixing safe connections)
                • **Security Standards** (NIST SP 800-53, CIS AWS Foundations Benchmark)

                **I am sorry for that, Its not a problem for me to answer such questions n all, but my token limit will exhaust off**
                ** If something seems problem, then its not a bug its just an undocumented feature **   
                """;
    }
}
