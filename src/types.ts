export interface Provider {
  id: string;
  name: string;
  type: "token_free" | "api_key";
  status: "active" | "inactive";
  api_key: string | null;
  base_url: string | null;
  models: string[];
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestLog {
  id: string;
  provider: string;
  model: string | null;
  status: "success" | "error";
  response_time: number | null;
  tokens_used: number;
  error_message: string | null;
  created_at: string;
}

export interface UsageStat {
  id: string;
  provider: string;
  date: string;
  requests_count: number;
  success_count: number;
  error_count: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface GatewayUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  status: "active" | "disabled";
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  performed_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

export type Page = "dashboard" | "providers" | "requestLogs" | "settings" | "apiDocs" | "playground" | "users" | "auditLogs";
