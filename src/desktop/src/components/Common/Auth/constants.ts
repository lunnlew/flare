import { AuthType } from "../../../constants/http";

export const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: "无",
  bearer: "Bearer",
  basic: "Basic",
  apiKey: "API Key",
  oauth2: "OAuth 2.0",
  aws: "AWS",
};

export const DEFAULT_AWS_REGION = "us-east-1";

export const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "eu-west-1", label: "EU (Ireland)" },
  { value: "eu-central-1", label: "EU (Frankfurt)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

export const BEARER_PREFIXES = [
  { value: "Bearer", label: "Bearer" },
  { value: "JWT", label: "JWT" },
  { value: "BearerJWT", label: "BearerJWT" },
  { value: "Token", label: "Token" },
  { value: "Custom", label: "自定义" },
];