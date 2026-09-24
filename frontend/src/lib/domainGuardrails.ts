/**
 * Client-side domain guardrail validator for CloudGuard AI Copilot.
 * Intercepts off-topic queries instantly before network request to save tokens and latency.
 */

const EXPLICIT_OFF_TOPIC_REGEX =
  /\b(salman khan|shah rukh|actor|actress|bollywood|hollywood|movie|cinema|height of|weight of|age of|girlfriend|wife of|husband of|cricket|football|fifa|messi|ronaldo|recipe|cook|baking|joke|sing a song|weather in|capital of|president of|prime minister)\b/i;

const GREETING_REGEX =
  /^(hi|hello|hey|greetings|help|who are you|what can you do|what is cloudguard|how to use|commands|start|clear|status)[!?.]*$/i;

const DOMAIN_KEYWORDS = [
  'aws', 'amazon', 'kinesis', 's3', 'sqs', 'sns', 'eventbridge',
  'lambda', 'glue', 'emr', 'ec2', 'ecs', 'eks', 'rds', 'dynamodb',
  'redshift', 'vpc', 'apigateway', 'api gateway', 'cloudfront', 'iam',
  'kms', 'waf', 'cloudwatch', 'guardduty', 'shield', 'secrets manager',
  'cloudformation', 'cloudtrail', 'athena', 'fargate', 'aurora',
  'route53', 'elb', 'alb', 'nlb', 'cognito', 'security', 'posture',
  'compliance', 'identity', 'role', 'policy', 'least privilege',
  'encryption', 'at-rest', 'in-transit', 'threat', 'vulnerability',
  'nist', 'cis', 'audit', 'mfa', 'zero trust', 'pipeline', 'canvas',
  'architecture', 'topology', 'node', 'edge', 'connection', 'dag',
  'autofix', 'auto-fix', 'fix', 'remediate', 'remediation', 'validate',
  'score', 'check', 'layer', 'cloud', 'infrastructure', 'terraform',
  'docker', 'kubernetes', 'container'
];

export function isQueryDomainRelevant(message: string): boolean {
  if (!message || !message.trim()) return false;
  const trimmed = message.trim();

  // 1. Allow greetings
  if (GREETING_REGEX.test(trimmed)) return true;

  // 2. Reject explicit off-topic terms
  if (EXPLICIT_OFF_TOPIC_REGEX.test(trimmed)) return false;

  // 3. Check for domain keyword presence
  const lower = trimmed.toLowerCase();
  for (const kw of DOMAIN_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  // If query does not match any cloud or security keywords, reject to save tokens
  return false;
}

export const GUARDRAIL_REFUSAL_MESSAGE = `
                **Ayy why broo, can't you ask me about:**
                • **AWS Architecture & Services**
                • **3-Layer Security Posture** (Identity Control, Data Encryption, Threat Observability)
                • **Canvas Pipeline Remediation** (Resolving failing checks or Auto-Fixing safe connections)
                • **Security Standards** (NIST SP 800-53, CIS AWS Foundations Benchmark)

                **I am sorry for that, Its not a problem for me to answer such questions n all, but my token limit will exhaust off**
                ** If something seems problem, then its not a bug its just an undocumented feature **  

**You can ask me about:**
• **AWS Services & Architecture** (\`S3\`, \`Lambda\`, \`RDS\`, \`KMS\`, \`IAM\`, \`CloudWatch\`, etc.)
• **3-Layer Security Posture** (Identity Control, Data Encryption, Threat Observability)
• **Canvas Remediation & Auto-Fix** (Resolving failing checks, 100% safe architecture)
• **Compliance Benchmarks** (NIST SP 800-53, CIS AWS Foundations)`;
