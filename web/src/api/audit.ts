import { get } from './client';

export interface AuditLog {
  id: number;
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failed';
  created_at: string;
}

export interface AuditLogQuery {
  page?: number;
  page_size?: number;
  user_id?: string;
  username?: string;
  action?: string;
  resource?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  search?: string;
}

export interface AuditLogResult {
  logs: AuditLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditStats {
  total_logs: number;
  today_logs: number;
  failed_actions: number;
  unique_users: number;
  action_distribution: Record<string, number>;
  resource_distribution: Record<string, number>;
}

// List audit logs with pagination and filtering
export async function listAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResult> {
  const params: Record<string, unknown> = {};
  
  if (query.page) params.page = query.page;
  if (query.page_size) params.page_size = query.page_size;
  if (query.user_id) params.user_id = query.user_id;
  if (query.username) params.username = query.username;
  if (query.action) params.action = query.action;
  if (query.resource) params.resource = query.resource;
  if (query.status) params.status = query.status;
  if (query.start_date) params.start_date = query.start_date;
  if (query.end_date) params.end_date = query.end_date;
  if (query.ip_address) params.ip_address = query.ip_address;
  if (query.search) params.search = query.search;
  
  return get<AuditLogResult>('/logs/audit', params);
}

// Get audit log statistics
export async function getAuditStats(): Promise<AuditStats> {
  return get<AuditStats>('/logs/audit/stats');
}

// Get distinct actions for filtering
export async function getAuditActions(): Promise<string[]> {
  return get<string[]>('/logs/audit/actions');
}

// Get distinct resources for filtering
export async function getAuditResources(): Promise<string[]> {
  return get<string[]>('/logs/audit/resources');
}



