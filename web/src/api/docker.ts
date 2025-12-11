import { get, post, del } from './client';

export interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'exited' | 'created';
  created: string;
  cpu?: number;
  memory?: { used: number; limit: number };
  ports?: string[];
  network?: string;
  command?: string;
  state?: string;
  size?: string;
  labels?: Record<string, string>;
}

export interface ContainerStats {
  cpu: number;
  memory: { used: number; limit: number };
  network: { rx: number; tx: number };
  blockIO: { read: number; write: number };
}

export interface CreateContainerRequest {
  name: string;
  image: string;
  ports?: Array<{ host: number; container: number; protocol?: string }>;
  network?: string;
  env?: Record<string, string>;
  volumes?: Array<{ host: string; container: string }>;
  command?: string[];
  restart?: string;
  autoRemove?: boolean;
}

export interface ContainerLogsOptions {
  tail?: number;
  follow?: boolean;
  since?: string;
  until?: string;
  timestamps?: boolean;
}

// List all containers
export async function listContainers(all = false): Promise<Container[]> {
  return get<Container[]>('/docker/containers', { all });
}

// Get container details
export async function getContainer(id: string): Promise<Container> {
  return get<Container>(`/docker/containers/${id}`);
}

// Create a new container
export async function createContainer(data: CreateContainerRequest): Promise<Container> {
  return post<Container>('/docker/containers', data);
}

// Start container
export async function startContainer(id: string): Promise<void> {
  return post<void>(`/docker/containers/${id}/start`);
}

// Stop container
export async function stopContainer(id: string): Promise<void> {
  return post<void>(`/docker/containers/${id}/stop`);
}

// Restart container
export async function restartContainer(id: string): Promise<void> {
  return post<void>(`/docker/containers/${id}/restart`);
}

// Remove container
export async function removeContainer(id: string, force = false): Promise<void> {
  return del<void>(`/docker/containers/${id}?force=${force}`);
}

// Get container logs
export async function getContainerLogs(
  id: string,
  options?: ContainerLogsOptions
): Promise<string> {
  const params: Record<string, unknown> = {};
  if (options?.tail) params.tail = options.tail;
  if (options?.follow) params.follow = options.follow;
  if (options?.since) params.since = options.since;
  if (options?.until) params.until = options.until;
  if (options?.timestamps) params.timestamps = options.timestamps;
  
  return get<string>(`/docker/containers/${id}/logs`, params);
}

// Get container stats
export async function getContainerStats(id: string): Promise<ContainerStats> {
  return get<ContainerStats>(`/docker/containers/${id}/stats`);
}
