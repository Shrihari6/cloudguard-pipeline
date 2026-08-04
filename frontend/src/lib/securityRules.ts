import { NodeType, SecurityCheck } from '@/types';

export const SECURITY_RULES: Record<
  NodeType,
  Array<{ id: string; category: 'IAM' | 'Encryption' | 'Threat Detection'; label: string; description: string }>
> = {
  kinesis: [
    { id: 'iam-1', category: 'IAM', label: 'Least-Privilege IAM Producer/Consumer Policy', description: 'Ensure Kinesis stream access is limited to specific actions.' },
    { id: 'enc-1', category: 'Encryption', label: 'KMS Server-Side Encryption (SSE)', description: 'Encrypt data at rest in stream using AWS KMS CMK.' },
    { id: 'det-1', category: 'Threat Detection', label: 'CloudWatch Enhanced Monitoring', description: 'Enable shard-level CloudWatch metrics for stream anomalies.' },
  ],
  s3: [
    { id: 'iam-2', category: 'IAM', label: 'S3 Bucket Policy & Block Public Access', description: 'Enforce strict IAM policies and block all public access.' },
    { id: 'enc-2', category: 'Encryption', label: 'KMS Customer Managed Key Encryption', description: 'Require KMS Encryption (aws:kms) on put object.' },
    { id: 'det-2', category: 'Threat Detection', label: 'S3 Server Access & CloudTrail Data Events', description: 'Log object-level API calls to CloudTrail.' },
  ],
  sqs: [
    { id: 'iam-3', category: 'IAM', label: 'SQS Queue Access Policy', description: 'Restrict queue sending and receiving to authorized IAM roles.' },
    { id: 'enc-3', category: 'Encryption', label: 'KMS Server-Side Encryption', description: 'Enable SSE-KMS for messages at rest in the queue.' },
    { id: 'det-3', category: 'Threat Detection', label: 'Dead Letter Queue (DLQ) & Alarms', description: 'Configure DLQ to catch malformed or malicious messages.' },
  ],
  lambda: [
    { id: 'iam-4', category: 'IAM', label: 'Dedicated Execution Role', description: 'Use dedicated IAM execution role with zero wildcard permissions.' },
    { id: 'enc-4', category: 'Encryption', label: 'Environment Variable KMS Encryption', description: 'Encrypt environment variables using custom KMS key.' },
    { id: 'det-4', category: 'Threat Detection', label: 'VPC Binding & CloudWatch Logs', description: 'Attach function to private VPC subnet and enable execution logs.' },
  ],
  glue: [
    { id: 'iam-5', category: 'IAM', label: 'Glue Service Role Least Privilege', description: 'Grant access only to source and target data locations.' },
    { id: 'enc-5', category: 'Encryption', label: 'Glue Security Configuration Encryption', description: 'Encrypt ETL job bookmarks, logs, and target data.' },
    { id: 'det-5', category: 'Threat Detection', label: 'CloudWatch ETL Job Alarm', description: 'Alert on failed runs or unusual data throughput spikes.' },
  ],
  emr: [
    { id: 'iam-6', category: 'IAM', label: 'EMR EC2 & Service Roles', description: 'Enforce fine-grained IAM roles for cluster instances.' },
    { id: 'enc-6', category: 'Encryption', label: 'In-Transit & At-Rest Encryption', description: 'Enable TLS for cluster nodes and KMS for EBS volumes.' },
    { id: 'det-6', category: 'Threat Detection', label: 'Private Subnet Placement & GuardDuty', description: 'Keep EMR nodes in private subnets with continuous monitoring.' },
  ],
  rds: [
    { id: 'iam-7', category: 'IAM', label: 'IAM Database Authentication', description: 'Use IAM DB authentication instead of hardcoded passwords.' },
    { id: 'enc-7', category: 'Encryption', label: 'Storage & Transport Encryption', description: 'Enable KMS storage encryption and force SSL/TLS connections.' },
    { id: 'det-7', category: 'Threat Detection', label: 'RDS GuardDuty & Enhanced Monitoring', description: 'Enable GuardDuty RDS Protection for suspicious login attempts.' },
  ],
  dynamodb: [
    { id: 'iam-8', category: 'IAM', label: 'Fine-Grained IAM Control', description: 'Restrict access by partition key using IAM condition keys.' },
    { id: 'enc-8', category: 'Encryption', label: 'KMS Customer Managed Key Encryption', description: 'Encrypt DynamoDB table at rest with custom KMS key.' },
    { id: 'det-8', category: 'Threat Detection', label: 'CloudTrail Audit Logging & PITR', description: 'Log control-plane calls and enable Point-In-Time Recovery.' },
  ],
  redshift: [
    { id: 'iam-9', category: 'IAM', label: 'Redshift IAM Database Credentials', description: 'Use IAM temporary credentials for cluster connections.' },
    { id: 'enc-9', category: 'Encryption', label: 'Cluster KMS Encryption & SSL', description: 'Encrypt data blocks in cluster and enforce SSL in transit.' },
    { id: 'det-9', category: 'Threat Detection', label: 'Audit Logging to S3', description: 'Enable user activity logging and connection logging.' },
  ],
  iam: [
    { id: 'iam-10', category: 'IAM', label: 'MFA Enforced & No Wildcards', description: 'Require MFA for privilege escalation and prohibit Action: "*".' },
    { id: 'enc-10', category: 'Encryption', label: 'Credential Rotation Policy', description: 'Rotate access keys every 90 days.' },
    { id: 'det-10', category: 'Threat Detection', label: 'Access Analyzer Integration', description: 'Enable IAM Access Analyzer to detect external resource sharing.' },
  ],
  kms: [
    { id: 'iam-11', category: 'IAM', label: 'Key Policy Delegation', description: 'Restrict Key Admin vs Key User roles in KMS key policy.' },
    { id: 'enc-11', category: 'Encryption', label: 'Automatic Key Rotation', description: 'Enable annual automatic rotation of KMS customer keys.' },
    { id: 'det-11', category: 'Threat Detection', label: 'KMS CloudTrail Alarm', description: 'Alert on unauthorized Decrypt or ScheduleKeyDeletion attempts.' },
  ],
  waf: [
    { id: 'iam-12', category: 'IAM', label: 'WAF Rule Ownership Policy', description: 'Restrict WebACL modification permissions.' },
    { id: 'enc-12', category: 'Encryption', label: 'HTTPS Traffic Inspection', description: 'Inspect encrypted HTTPS payloads at edge.' },
    { id: 'det-12', category: 'Threat Detection', label: 'WAF Sampled Logs & Rate Limiting', description: 'Enable rate-based rules to block brute-force & DDoS attacks.' },
  ],
  cloudwatch: [
    { id: 'iam-13', category: 'IAM', label: 'Log Group Access Control', description: 'Restrict access to log streams containing sensitive payloads.' },
    { id: 'enc-13', category: 'Encryption', label: 'Log Group KMS Encryption', description: 'Encrypt stored log streams using KMS keys.' },
    { id: 'det-13', category: 'Threat Detection', label: 'Metric Filters & SNS Alarms', description: 'Configure log metric filters for security exceptions.' },
  ],
  guardduty: [
    { id: 'iam-14', category: 'IAM', label: 'GuardDuty Admin IAM Policy', description: 'Restrict GuardDuty configuration changes.' },
    { id: 'enc-14', category: 'Encryption', label: 'Finding Export KMS Encryption', description: 'Encrypt exported findings in S3 destination bucket.' },
    { id: 'det-14', category: 'Threat Detection', label: 'S3, RDS, & EKS Protection Enabled', description: 'Activate all continuous threat detection coverage options.' },
  ],
};

export function getChecksForNode(type: NodeType): SecurityCheck[] {
  const rules = SECURITY_RULES[type] || [];
  return rules.map((r) => ({
    id: r.id,
    category: r.category,
    label: r.label,
    checked: false,
    description: r.description,
  }));
}
