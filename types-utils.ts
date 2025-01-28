export interface UptimeKumaHeartbeat {
  monitorID: number;
  status: number;
  time: string;
  msg: string;
  important: boolean;
  duration: number;
  retries: number;
  timezone: string;
  timezoneOffset: string;
  localDateTime: string;
}

export interface UptimeKumaMonitor {
  id: number;
  name: string;
  description: null | string;
  path: (string | null)[];
  pathName: string;
  parent: null | number;
  childrenIDs: number[];
  url: string;
  method: string;
  hostname: null | string;
  port: null | number;
  maxretries: number;
  weight: number;
  active: boolean;
  forceInactive: boolean;
  type: string;
  timeout: number;
  interval: number;
  retryInterval: number;
  resendInterval: number;
  keyword: null | string;
  invertKeyword: boolean;
  expiryNotification: boolean;
  ignoreTls: boolean;
  upsideDown: boolean;
  packetSize: number;
  maxredirects: number;
  accepted_statuscodes: string[];
  dns_resolve_type: string;
  dns_resolve_server: string;
  dns_last_result: null | string;
  docker_container: string;
  docker_host: null | string;
  proxyId: null | number;
  notificationIDList: Record<string, boolean>;
  tags: string[];
  maintenance: boolean;
  mqttTopic: string;
  mqttSuccessMessage: string;
  mqttCheckType: string;
  databaseQuery: null | string;
  authMethod: null | string;
  grpcUrl: null | string;
  grpcProtobuf: null | string;
  grpcMethod: null | string;
  grpcServiceName: null | string;
  grpcEnableTls: boolean;
  radiusCalledStationId: null | string;
  radiusCallingStationId: null | string;
  game: null | string;
  gamedigGivenPortOnly: boolean;
  httpBodyEncoding: null | string;
  jsonPath: string;
  expectedValue: null | string;
  kafkaProducerTopic: null | string;
  kafkaProducerBrokers: string[];
  kafkaProducerSsl: boolean;
  kafkaProducerAllowAutoTopicCreation: boolean;
  kafkaProducerMessage: null | string;
  screenshot: null | string;
  cacheBust: boolean;
  remote_browser: null | string;
  snmpOid: null | string;
  jsonPathOperator: string;
  snmpVersion: string;
  rabbitmqNodes: unknown[];
  conditions: unknown[];
  includeSensitiveData: boolean;
}

export interface UptimeKumaWebhook {
  heartbeat: UptimeKumaHeartbeat;
  monitor: UptimeKumaMonitor;
  msg: string;
}

type RequiredCredential = {
  env: string | undefined;
  name: string;
  help: string;
  optional?: never;
  default?: never;
  validator?: (value: string) => [boolean, string];
};

type OptionalCredential = {
  env: string | undefined;
  name: string;
  help: string;
  optional: true;
  default: string;
  validator?: (value: string) => [boolean, string];
};

export type CredentialConfig = RequiredCredential | OptionalCredential;

export type CredentialDefinition = {
  [key: string]: CredentialConfig;
};

export function isUptimeKumaWebhook(data: unknown): boolean | "TESTING" {
  if (!data || typeof data !== "object") return false;

  const webhook = data as Partial<UptimeKumaWebhook>;

  if (webhook.msg?.endsWith(" Testing")) return "TESTING";

  if (!webhook.heartbeat || !webhook.monitor || typeof webhook.msg !== "string") {
    return false;
  }

  // Validate required heartbeat fields
  const requiredHeartbeatFields = ["monitorID", "status", "time", "msg", "important", "duration", "retries", "timezone", "timezoneOffset", "localDateTime"] satisfies (keyof UptimeKumaHeartbeat)[];

  for (const field of requiredHeartbeatFields) {
    if (!(field in webhook.heartbeat)) return false;
  }

  // Validate required monitor fields
  const requiredMonitorFields = ["id", "name", "url", "type", "active"] satisfies (keyof UptimeKumaMonitor)[];

  for (const field of requiredMonitorFields) {
    if (!(field in webhook.monitor)) return false;
  }

  return true;
}

export function validateSingleEmail(email: string, permitSenderString?: boolean): [boolean, string] {
  // If the email is the sender string, we validate it is the following format: "'Sender Name' <email@address>"
  if (permitSenderString && email.startsWith("'") && email.endsWith(">")) {
    const senderStringRegex = /^'[^']+' <[^\s@]+@[^\s@]+\.[^\s@]+>$/;
    if (senderStringRegex.test(email)) return [true, ""];
    return [false, `Invalid email address: ${email}, expected format: "'Sender Name' <email@address>"`];
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return [emailRegex.test(email), `Invalid email address: ${email}`];
}

export function validateMultipleEmails(emails: string): [boolean, string] {
  const emailList = emails.split(",");
  for (const email of emailList) {
    const [valid, message] = validateSingleEmail(email.trim());
    if (!valid) return [false, message];
  }
  return [true, ""];
}
