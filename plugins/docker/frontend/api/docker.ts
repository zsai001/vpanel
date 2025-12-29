import { get, post, del } from '@/api/client';

export interface DockerInfo {
  containers: number;
  containers_running: number;
  containers_paused: number;
  containers_stopped: number;
  images: number;
  server_version: string;
  os: string;
  architecture: string;
  memory: number;
  cpus: number;
  name: string;
}

// Get Docker daemon info
export async function getDockerInfo(): Promise<DockerInfo> {
  return get<DockerInfo>('/docker/info');
}

// Check if Docker is available
export async function checkDockerStatus(): Promise<{ available: boolean; info?: DockerInfo; error?: string }> {
  try {
    const info = await getDockerInfo();
    return { available: true, info };
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : 'Docker is not available' 
    };
  }
}

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

// Log line from container
export interface LogLine {
  time?: string;
  stream: 'stdout' | 'stderr';
  content: string;
}

// Container group interfaces
export interface ContainerGroup {
  type: 'compose' | 'standalone' | 'status';
  name: string;
  path?: string;
  status: 'running' | 'stopped' | 'partial';
  count: number;
  running: number;
  stopped: number;
  containers: Container[];
  is_compose: boolean;
}

export interface GroupedContainersResponse {
  groups: ContainerGroup[];
  standalone: Container[];
}

// List all containers
export async function listContainers(all = false, grouped = false): Promise<Container[] | GroupedContainersResponse> {
  if (grouped) {
    return get<GroupedContainersResponse>('/docker/containers', { all, grouped: true });
  }
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
): Promise<LogLine[]> {
  const params: Record<string, unknown> = {};
  if (options?.tail) params.tail = options.tail;
  if (options?.follow) params.follow = options.follow;
  if (options?.since) params.since = options.since;
  if (options?.until) params.until = options.until;
  if (options?.timestamps) params.timestamps = options.timestamps;
  
  return get<LogLine[]>(`/docker/containers/${id}/logs`, params);
}

// Get WebSocket URL for streaming container logs
export function getContainerLogsStreamUrl(id: string, options?: { tail?: number; timestamps?: boolean }): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const params = new URLSearchParams();
  
  if (options?.tail) params.set('tail', String(options.tail));
  if (options?.timestamps) params.set('timestamps', 'true');
  
  const token = localStorage.getItem('token');
  if (token) params.set('token', token);
  
  return `${protocol}//${host}/api/docker/containers/${id}/logs/stream?${params.toString()}`;
}

// Get container stats
export async function getContainerStats(id: string): Promise<ContainerStats> {
  return get<ContainerStats>(`/docker/containers/${id}/stats`);
}

// Image interfaces
export interface Image {
  id: string;
  tags: string[];
  size: number;
  created: string;
}

export interface PullImageRequest {
  image: string;
}

// List all images
export async function listImages(): Promise<Image[]> {
  return get<Image[]>('/docker/images');
}

// Pull an image
export async function pullImage(image: string): Promise<void> {
  return post<void>('/docker/images/pull', { image });
}

// Remove an image
export async function removeImage(id: string, force = false): Promise<void> {
  return del<void>(`/docker/images/${id}?force=${force}`);
}

// Network interfaces
export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  created: string;
}

export interface CreateNetworkRequest {
  name: string;
  driver?: string;
}

// List all networks
export async function listNetworks(): Promise<Network[]> {
  return get<Network[]>('/docker/networks');
}

// Create a network
export async function createNetwork(data: CreateNetworkRequest): Promise<Network> {
  return post<Network>('/docker/networks', data);
}

// Remove a network
export async function removeNetwork(id: string): Promise<void> {
  return del<void>(`/docker/networks/${id}`);
}

// Volume interfaces
export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  created: string;
}

export interface CreateVolumeRequest {
  name: string;
  driver?: string;
}

// List all volumes
export async function listVolumes(): Promise<Volume[]> {
  return get<Volume[]>('/docker/volumes');
}

// Create a volume
export async function createVolume(data: CreateVolumeRequest): Promise<Volume> {
  return post<Volume>('/docker/volumes', data);
}

// Remove a volume
export async function removeVolume(name: string, force = false): Promise<void> {
  return del<void>(`/docker/volumes/${name}?force=${force}`);
}

// Compose interfaces
export interface ComposeServiceInfo {
  name: string;
  container_id: string;
  container_name: string;
  container_number?: string;
  image: string;
  state: string;
  status: string;
  ports: string[];
}

export interface ComposeProject {
  id: string;
  name: string;
  path: string;
  config_files?: string;
  description?: string;
  status: 'running' | 'stopped' | 'partial' | 'unknown';
  container_count: number;
  running_count: number;
  stopped_count: number;
  services: ComposeServiceInfo[];
  created_at: string;
  updated_at: string;
  is_auto_detected: boolean;
}

export interface CreateComposeProjectRequest {
  name: string;
  path: string;
  content: string;
  description?: string;
}

// List all compose projects
export async function listComposeProjects(): Promise<ComposeProject[]> {
  return get<ComposeProject[]>('/docker/compose');
}

// Create a compose project
export async function createComposeProject(data: CreateComposeProjectRequest): Promise<ComposeProject> {
  return post<ComposeProject>('/docker/compose', data);
}

// Remove a compose project
export async function removeComposeProject(id: string): Promise<void> {
  return del<void>(`/docker/compose/${id}`);
}

// Start compose project
export async function composeUp(id: string): Promise<void> {
  return post<void>(`/docker/compose/${id}/up`);
}

// Stop compose project
export async function composeDown(id: string): Promise<void> {
  return post<void>(`/docker/compose/${id}/down`);
}

// Container file browser interfaces
export interface ContainerFile {
  name: string;
  path: string;
  size: number;
  mode: string;
  mod_time: string;
  is_dir: boolean;
  is_link: boolean;
}

export interface ContainerFileContent {
  content: string;
  size: number;
  name: string;
  path: string;
}

// List files in a container directory
export async function listContainerFiles(containerId: string, path = '/'): Promise<ContainerFile[]> {
  return get<ContainerFile[]>(`/docker/containers/${containerId}/files`, { path });
}

// Get file content for viewing
export async function getContainerFileContent(containerId: string, path: string): Promise<ContainerFileContent> {
  return get<ContainerFileContent>(`/docker/containers/${containerId}/files/content`, { path });
}

// Download a file from container
export function getContainerFileDownloadUrl(containerId: string, path: string): string {
  return `/api/docker/containers/${containerId}/files/download?path=${encodeURIComponent(path)}`;
}

// Upload a file to container
export async function uploadContainerFile(containerId: string, destPath: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/docker/containers/${containerId}/files/upload?path=${encodeURIComponent(destPath)}`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Upload failed');
  }
}

// Delete a file from container
export async function deleteContainerFile(containerId: string, path: string): Promise<void> {
  const { del } = await import('@/api/client');
  return del<void>(`/docker/containers/${containerId}/files?path=${encodeURIComponent(path)}`);
}

// Create a directory in container
export async function createContainerDirectory(containerId: string, path: string): Promise<void> {
  return post<void>(`/docker/containers/${containerId}/files/mkdir`, { path });
}


