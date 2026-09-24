import { NodeType } from '@/types';
import { NODE_REGISTRY } from './nodeRegistry';

export interface AddNodeIntentResult {
  isAddIntent: boolean;
  nodeType?: NodeType;
  label?: string;
}

const SERVICE_ALIASES: Record<string, NodeType> = {
  // Compute & Processing
  lambda: 'lambda',
  function: 'lambda',
  'serverless function': 'lambda',
  glue: 'glue',
  'glue etl': 'glue',
  etl: 'glue',
  emr: 'emr',
  spark: 'emr',
  ec2: 'ec2',
  'ec2 instance': 'ec2',
  ecs: 'ecs',
  'ecs service': 'ecs',
  container: 'ecs',
  fargate: 'ecs',
  eks: 'eks',
  kubernetes: 'eks',
  k8s: 'eks',

  // Storage & Databases
  s3: 's3',
  's3 bucket': 's3',
  bucket: 's3',
  rds: 'rds',
  'rds database': 'rds',
  'rds instance': 'rds',
  database: 'rds',
  db: 'rds',
  postgres: 'rds',
  mysql: 'rds',
  aurora: 'rds',
  dynamo: 'dynamodb',
  dynamodb: 'dynamodb',
  'dynamodb table': 'dynamodb',
  nosql: 'dynamodb',
  redshift: 'redshift',
  'data warehouse': 'redshift',
  warehouse: 'redshift',

  // Ingestion & Messaging
  kinesis: 'kinesis',
  'kinesis stream': 'kinesis',
  'data stream': 'kinesis',
  sqs: 'sqs',
  'sqs queue': 'sqs',
  queue: 'sqs',
  sns: 'sns',
  'sns topic': 'sns',
  topic: 'sns',
  eventbridge: 'eventbridge',
  'event bus': 'eventbridge',

  // Networking
  vpc: 'vpc',
  'vpc network': 'vpc',
  network: 'vpc',
  apigateway: 'apigateway',
  'api gateway': 'apigateway',
  api: 'apigateway',
  cloudfront: 'cloudfront',
  cdn: 'cloudfront',

  // Security & Observability
  iam: 'iam',
  'iam role': 'iam',
  role: 'iam',
  kms: 'kms',
  'kms key': 'kms',
  key: 'kms',
  'encryption key': 'kms',
  waf: 'waf',
  firewall: 'waf',
  cloudwatch: 'cloudwatch',
  'cloudwatch logs': 'cloudwatch',
  logs: 'cloudwatch',
  monitoring: 'cloudwatch',
  guardduty: 'guardduty',
  'guard duty': 'guardduty',
};

/**
 * Detects if the prompt is asking to add a service to the canvas.
 * E.g., "add an rds to the architecture", "create a lambda node", "place s3 bucket"
 */
export function detectAddNodeIntent(message: string): AddNodeIntentResult {
  if (!message || !message.trim()) {
    return { isAddIntent: false };
  }

  const lower = message.toLowerCase().trim();

  // Pattern matching creation phrases
  const hasAddKeyword =
    /\b(add|create|place|insert|put|spawn|drop|deploy|include)\b/i.test(lower) &&
    /\b(to\s+(the\s+)?(canvas|architecture|pipeline|graph)|node|service|instance|bucket|function|database|topic|queue|stream|cluster|table)\b/i.test(lower) ||
    /^(add|create|place|insert)\s+([a-z0-9_-]+)/i.test(lower);

  if (!hasAddKeyword) {
    return { isAddIntent: false };
  }

  // Find longest matching service alias first
  const sortedAliases = Object.keys(SERVICE_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of sortedAliases) {
    // Check whole word or phrase match
    const regex = new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(lower)) {
      const nodeType = SERVICE_ALIASES[alias];
      const registryItem = NODE_REGISTRY[nodeType];
      return {
        isAddIntent: true,
        nodeType,
        label: registryItem ? registryItem.label : alias.toUpperCase(),
      };
    }
  }

  return { isAddIntent: false };
}

/**
 * Detects if the prompt is asking to connect/remediate nodes to a 100% safe architecture.
 * E.g., "connect the things for 100% safe architecture", "connect nodes safely", "auto-fix"
 */
export function detectSafeConnectIntent(message: string): boolean {
  if (!message || !message.trim()) return false;
  const lower = message.toLowerCase().trim();

  return (
    /connect.*(safe|100%|architecture|nodes|services|pipeline|things)/i.test(lower) ||
    /make.*(100%|safe|compliant|secure)/i.test(lower) ||
    /(auto[- ]?fix|fix\s*(the\s*)?node|fix\s*architecture|fix\s*pipeline|remediate)/i.test(lower) ||
    /secure.*(connections|architecture|pipeline|nodes)/i.test(lower)
  );
}
