import { get, post, del, put } from './client';

export interface FirewallStatus {
  enabled: boolean;
  activeRules: number;
  blockedIPs: number;
  lastUpdated?: string;
}

export interface FirewallRule {
  id: string;
  node_id: string;
  name: string;
  direction: 'in' | 'out';
  action: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  port: string;
  source: string;
  destination: string;
  priority: number;
  enabled: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFirewallRuleRequest {
  node_id: string;
  name: string;
  direction: 'in' | 'out';
  action: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  port?: string;
  source?: string;
  destination?: string;
  priority?: number;
  enabled?: boolean;
  description?: string;
}

export interface UpdateFirewallRuleRequest extends Partial<CreateFirewallRuleRequest> {
  id: string;
}

export interface Fail2BanStatus {
  enabled: boolean;
  activeJails: number;
  bannedIPs: number;
}

export interface Fail2BanJail {
  name: string;
  enabled: boolean;
  bannedIPs: number;
  maxRetry: number;
  findTime: number;
  banTime: number;
}

// Get firewall status
export async function getFirewallStatus(nodeId?: string): Promise<FirewallStatus> {
  const params = nodeId ? { node_id: nodeId } : {};
  return get<FirewallStatus>('/firewall/status', params);
}

// Enable firewall
export async function enableFirewall(nodeId?: string): Promise<void> {
  return post<void>('/firewall/enable', nodeId ? { node_id: nodeId } : {});
}

// Disable firewall
export async function disableFirewall(nodeId?: string): Promise<void> {
  return post<void>('/firewall/disable', nodeId ? { node_id: nodeId } : {});
}

// List firewall rules
export async function listFirewallRules(nodeId?: string): Promise<FirewallRule[]> {
  const params = nodeId ? { node_id: nodeId } : {};
  return get<FirewallRule[]>('/firewall/rules', params);
}

// Create firewall rule
export async function createFirewallRule(data: CreateFirewallRuleRequest): Promise<FirewallRule> {
  return post<FirewallRule>('/firewall/rules', data);
}

// Update firewall rule
export async function updateFirewallRule(id: string, data: Partial<CreateFirewallRuleRequest>): Promise<FirewallRule> {
  return put<FirewallRule>(`/firewall/rules/${id}`, data);
}

// Delete firewall rule
export async function deleteFirewallRule(id: string): Promise<void> {
  return del<void>(`/firewall/rules/${id}`);
}

// Get Fail2Ban status
export async function getFail2BanStatus(nodeId?: string): Promise<Fail2BanStatus> {
  const params = nodeId ? { node_id: nodeId } : {};
  return get<Fail2BanStatus>('/firewall/fail2ban/status', params);
}

// List Fail2Ban jails
export async function listFail2BanJails(nodeId?: string): Promise<Fail2BanJail[]> {
  const params = nodeId ? { node_id: nodeId } : {};
  return get<Fail2BanJail[]>('/firewall/fail2ban/jails', params);
}

// Unban IP from Fail2Ban jail
export async function unbanIP(jailName: string, ip: string, nodeId?: string): Promise<void> {
  return post<void>(`/firewall/fail2ban/jails/${jailName}/unban`, { ip, node_id: nodeId });
}
