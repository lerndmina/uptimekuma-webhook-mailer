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

export function isUptimeKumaWebhook(data: unknown): data is UptimeKumaWebhook {
  if (!data || typeof data !== "object") return false;
  const webhook = data as Partial<UptimeKumaWebhook>;

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
