import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Terminal,
  FileText,
  MoreVertical,
  RefreshCw,
  Network,
  Grid3x3,
  List,
  Info,
  Copy,
  ChevronDown,
  ChevronRight,
  Layers,
  Folder,
  FolderOpen,
  File,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  SearchInput,
  Dropdown,
  DropdownItem,
  DropdownDivider,
  Modal,
  ConfirmModal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Progress,
  Empty,
  Spinner,
  Input,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import * as dockerApi from '../api/docker';
import type { Container, CreateContainerRequest, ContainerGroup, GroupedContainersResponse } from '../api/docker';

function ContainerCard({ 
  container, 
  onAction 
}: { 
  container: Container; 
  onAction: (action: string, container: Container) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const statusColors: Record<string, 'success' | 'gray' | 'warning' | 'info'> = {
    running: 'success',
    stopped: 'gray',
    paused: 'warning',
    restarting: 'info',
    exited: 'gray',
    created: 'info',
  };

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      await onAction(action, container);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card p-4 hover:border-dark-600/50 transition-all"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <div 
              className="min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/docker/containers/${container.id}`);
              }}
            >
              <h3 className="font-medium text-dark-100 truncate">{container.name}</h3>
              <p className="text-sm text-dark-500 truncate">{container.image}</p>
            </div>
          </div>
          <Dropdown
            trigger={
              <button 
                className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded-lg transition-colors flex-shrink-0"
                disabled={isLoading}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem 
              icon={<FileText className="w-4 h-4" />} 
              onClick={() => onAction('logs', container)}
            >
              View Logs
            </DropdownItem>
            <DropdownItem 
              icon={<Info className="w-4 h-4" />} 
              onClick={() => onAction('inspect', container)}
            >
              Inspect
            </DropdownItem>
            <DropdownItem 
              icon={<Terminal className="w-4 h-4" />} 
              onClick={() => onAction('terminal', container)}
            >
              Terminal
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem 
              icon={<Trash2 className="w-4 h-4" />} 
              danger 
              onClick={() => setShowDelete(true)}
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant={statusColors[container.status] || 'gray'} dot>
            {container.status}
          </Badge>
          <span className="text-xs text-dark-500">• {container.created}</span>
        </div>

        {/* Stats */}
        {container.status === 'running' && container.cpu !== undefined && container.memory && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-dark-900/50 rounded-lg p-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-dark-500">CPU</span>
                <span className="text-dark-300">{container.cpu.toFixed(1)}%</span>
              </div>
              <Progress value={container.cpu} max={100} size="sm" />
            </div>
            <div className="bg-dark-900/50 rounded-lg p-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-dark-500">Memory</span>
                <span className="text-dark-300">{formatBytes(container.memory.used * 1024 * 1024)}</span>
              </div>
              <Progress 
                value={container.memory.used} 
                max={container.memory.limit || 1} 
                size="sm" 
              />
            </div>
          </div>
        )}

        {/* Ports */}
        {container.ports && container.ports.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-4 h-4 text-dark-500 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {container.ports.slice(0, 3).map((port, index) => (
                <span key={`${index}-${port}`} className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300 font-mono">
                  {port}
                </span>
              ))}
              {container.ports.length > 3 && (
                <span className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300">
                  +{container.ports.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-dark-700">
          {container.status === 'running' ? (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                leftIcon={<Square className="w-4 h-4" />}
                onClick={() => handleAction('stop')}
                disabled={isLoading}
              >
                Stop
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => handleAction('restart')}
                disabled={isLoading}
              >
                Restart
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="ghost" 
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => handleAction('start')}
              disabled={isLoading}
            >
              Start
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            leftIcon={<Terminal className="w-4 h-4" />}
            onClick={() => onAction('terminal', container)}
            disabled={isLoading}
          >
            Shell
          </Button>
        </div>
      </motion.div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          await handleAction('delete');
          setShowDelete(false);
        }}
        type="danger"
        title="Delete Container"
        message={`Are you sure you want to delete "${container.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

export default function DockerContainers() {
  const navigate = useNavigate();
  const [containers, setContainers] = useState<Container[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedContainersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'grouped'>('grouped');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Create container form state
  const [createForm, setCreateForm] = useState<CreateContainerRequest>({
    name: '',
    image: '',
    ports: [],
    network: 'bridge',
    env: {},
    volumes: [],
    restart: 'no',
    autoRemove: false,
  });

  // Fetch containers
  const fetchContainers = useCallback(async () => {
    try {
      if (viewMode === 'grouped') {
        const data = await dockerApi.listContainers(true, true) as GroupedContainersResponse;
        setGroupedData(data);
        // Flatten for stats calculation
        const allContainers: Container[] = [];
        data.groups.forEach(group => {
          allContainers.push(...group.containers);
        });
        allContainers.push(...data.standalone);
        setContainers(allContainers);
      } else {
        const data = await dockerApi.listContainers(true, false) as Container[];
        setContainers(data);
        setGroupedData(null);
      }
    } catch {
      // Silently handle error when Docker is unavailable
      setContainers([]);
      setGroupedData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchContainers();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  // Toggle group expanded state
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Handle container actions
  const handleAction = async (action: string, container: Container) => {
    try {
      switch (action) {
        case 'start':
          await dockerApi.startContainer(container.id);
          toast.success(`Container "${container.name}" started`);
          break;
        case 'stop':
          await dockerApi.stopContainer(container.id);
          toast.success(`Container "${container.name}" stopped`);
          break;
        case 'restart':
          await dockerApi.restartContainer(container.id);
          toast.success(`Container "${container.name}" restarted`);
          break;
        case 'delete':
          await dockerApi.removeContainer(container.id, false);
          toast.success(`Container "${container.name}" deleted`);
          break;
        case 'logs':
          setSelectedContainer(container);
          setShowLogsModal(true);
          await loadLogs(container.id);
          return;
        case 'inspect':
        case 'view':
          navigate(`/docker/containers/${container.id}`);
          return;
        case 'terminal':
          // Navigate to terminal with container context
          window.location.href = `/terminal?container=${container.id}`;
          return;
      }
      // Refresh after action
      await fetchContainers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} container`);
    }
  };

  // Load container logs
  const loadLogs = async (containerId: string) => {
    setLogsLoading(true);
    try {
      const logData = await dockerApi.getContainerLogs(containerId, { tail: 500, timestamps: true });
      setLogs(logData);
    } catch (error) {
      toast.error('Failed to load logs');
      setLogs('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };


  // Handle create container
  const handleCreate = async () => {
    try {
      await dockerApi.createContainer(createForm);
      toast.success('Container created successfully');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        image: '',
        ports: [],
        network: 'bridge',
        env: {},
        volumes: [],
        restart: 'no',
        autoRemove: false,
      });
      await fetchContainers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create container');
    }
  };

  // Filter and sort containers
  const filteredContainers = containers
    .filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                           c.image.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created':
          comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const stats = {
    total: containers.length,
    running: containers.filter((c) => c.status === 'running').length,
    stopped: containers.filter((c) => c.status === 'stopped' || c.status === 'exited').length,
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark-100">Containers</h1>
          <p className="text-dark-400">Manage Docker containers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchContainers();
            }}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreateModal(true)}>
            Create Container
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Terminal className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.total}</p>
            <p className="text-sm text-dark-400">Total Containers</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Play className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.running}</p>
            <p className="text-sm text-dark-400">Running</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center">
            <Square className="w-6 h-6 text-dark-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.stopped}</p>
            <p className="text-sm text-dark-400">Stopped</p>
          </div>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search containers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <Tabs value={statusFilter} onChange={setStatusFilter}>
          <TabList>
            <Tab value="all">All</Tab>
            <Tab value="running">Running</Tab>
            <Tab value="stopped">Stopped</Tab>
          </TabList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grouped' ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={<Layers className="w-4 h-4" />}
            onClick={() => setViewMode('grouped')}
          >
            Grouped
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={<Grid3x3 className="w-4 h-4" />}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={<List className="w-4 h-4" />}
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
        </div>
      </div>

      {/* Container List */}
      {viewMode === 'grouped' && groupedData ? (
        groupedData.groups.length > 0 || groupedData.standalone.length > 0 ? (
          <div className="space-y-2">
            {/* Compose Groups */}
            {groupedData.groups
              .filter((group) => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'running') return group.status === 'running' || group.status === 'partial';
                if (statusFilter === 'stopped') return group.status === 'stopped';
                return true;
              })
              .filter((group) => {
                if (!search) return true;
                const searchLower = search.toLowerCase();
                return (
                  group.name.toLowerCase().includes(searchLower) ||
                  group.path?.toLowerCase().includes(searchLower) ||
                  group.containers.some(c => 
                    c.name.toLowerCase().includes(searchLower) ||
                    c.image.toLowerCase().includes(searchLower)
                  )
                );
              })
              .map((group) => {
                const isExpanded = expandedGroups.has(group.name);
                const statusColors: Record<string, 'success' | 'gray' | 'warning'> = {
                  running: 'success',
                  stopped: 'gray',
                  partial: 'warning',
                };
                return (
                  <React.Fragment key={group.name}>
                    <motion.div
                      layout
                      className="card overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-800/50 transition-colors"
                        onClick={(e) => {
                          // Only toggle if clicking on the header, not on child elements
                          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.group-header')) {
                            toggleGroup(group.name);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 group-header">
                          <button 
                            className="p-1 hover:bg-dark-700 rounded transition-colors flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(group.name);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-dark-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-dark-400" />
                            )}
                          </button>
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            {group.is_compose ? (
                              <Layers className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Folder className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-dark-100 truncate">{group.name}</h3>
                              {group.is_compose && (
                                <Badge variant="gray" className="text-xs">Compose</Badge>
                              )}
                            </div>
                            {group.path && (
                              <p className="text-xs text-dark-500 truncate font-mono">{group.path}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <Badge variant={statusColors[group.status] || 'gray'}>
                              {group.status}
                            </Badge>
                            <span className="text-sm text-dark-400">
                              <span className="text-green-400">{group.running}</span>
                              {' / '}
                              <span>{group.count}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-dark-700"
                          >
                            <div className="p-4 space-y-2">
                              {group.containers
                                .filter((c) => {
                                  if (!search) return true;
                                  const searchLower = search.toLowerCase();
                                  return (
                                    c.name.toLowerCase().includes(searchLower) ||
                                    c.image.toLowerCase().includes(searchLower)
                                  );
                                })
                                .map((container) => (
                                  <div
                                    key={container.id}
                                    className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/docker/containers/${container.id}`);
                                    }}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-dark-100 truncate">{container.name}</div>
                                        <div className="text-xs text-dark-500 truncate">{container.image}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      {container.ports && container.ports.length > 0 && (
                                        <div className="flex gap-1">
                                          {container.ports.slice(0, 2).map((port, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300 font-mono"
                                            >
                                              {port.split('/')[0]}
                                            </span>
                                          ))}
                                          {container.ports.length > 2 && (
                                            <span className="text-xs text-dark-500">+{container.ports.length - 2}</span>
                                          )}
                                        </div>
                                      )}
                                      <Badge
                                        variant={
                                          container.state === 'running' ? 'success' :
                                          container.state === 'stopped' || container.state === 'exited' ? 'gray' :
                                          'warning'
                                        }
                                        className="text-xs"
                                      >
                                        {container.state}
                                      </Badge>
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {container.state === 'running' ? (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              leftIcon={<Square className="w-3 h-3" />}
                                              onClick={() => handleAction('stop', container)}
                                              title="Stop"
                                            />
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              leftIcon={<RotateCcw className="w-3 h-3" />}
                                              onClick={() => handleAction('restart', container)}
                                              title="Restart"
                                            />
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            leftIcon={<Play className="w-3 h-3" />}
                                            onClick={() => handleAction('start', container)}
                                            title="Start"
                                          />
                                        )}
                                        <Dropdown
                                          trigger={
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              leftIcon={<MoreVertical className="w-3 h-3" />}
                                            />
                                          }
                                        >
                                          <DropdownItem
                                            icon={<FileText className="w-4 h-4" />}
                                            onClick={() => handleAction('logs', container)}
                                          >
                                            View Logs
                                          </DropdownItem>
                                          <DropdownItem
                                            icon={<Info className="w-4 h-4" />}
                                            onClick={() => handleAction('inspect', container)}
                                          >
                                            Inspect
                                          </DropdownItem>
                                          <DropdownItem
                                            icon={<Terminal className="w-4 h-4" />}
                                            onClick={() => handleAction('terminal', container)}
                                          >
                                            Terminal
                                          </DropdownItem>
                                          <DropdownDivider />
                                          <DropdownItem
                                            icon={<Trash2 className="w-4 h-4" />}
                                            danger
                                            onClick={() => handleAction('delete', container)}
                                          >
                                            Delete
                                          </DropdownItem>
                                        </Dropdown>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </React.Fragment>
                );
              })}

            {/* Standalone Containers */}
            {groupedData.standalone.length > 0 && (
              <motion.div
                layout
                className="card overflow-hidden"
              >
                <div className="p-4 border-b border-dark-700">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-dark-500" />
                    <h3 className="font-medium text-dark-100">Standalone Containers</h3>
                    <Badge variant="gray" className="text-xs">{groupedData.standalone.length}</Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {groupedData.standalone
                    .filter((c) => {
                      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.image.toLowerCase().includes(search.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((container) => (
                      <div
                        key={container.id}
                        className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
                        onClick={() => navigate(`/docker/containers/${container.id}`)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-dark-100 truncate">{container.name}</div>
                            <div className="text-xs text-dark-500 truncate">{container.image}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {container.ports && container.ports.length > 0 && (
                            <div className="flex gap-1">
                              {container.ports.slice(0, 2).map((port, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300 font-mono"
                                >
                                  {port.split('/')[0]}
                                </span>
                              ))}
                              {container.ports.length > 2 && (
                                <span className="text-xs text-dark-500">+{container.ports.length - 2}</span>
                              )}
                            </div>
                          )}
                          <Badge
                            variant={
                              container.state === 'running' ? 'success' :
                              container.state === 'stopped' || container.state === 'exited' ? 'gray' :
                              'warning'
                            }
                            className="text-xs"
                          >
                            {container.state}
                          </Badge>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {container.state === 'running' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<Square className="w-3 h-3" />}
                                  onClick={() => handleAction('stop', container)}
                                  title="Stop"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<RotateCcw className="w-3 h-3" />}
                                  onClick={() => handleAction('restart', container)}
                                  title="Restart"
                                />
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Play className="w-3 h-3" />}
                                onClick={() => handleAction('start', container)}
                                title="Start"
                              />
                            )}
                            <Dropdown
                              trigger={
                                <Button size="sm" variant="ghost" leftIcon={<MoreVertical className="w-3 h-3" />} />
                              }
                            >
                              <DropdownItem
                                icon={<FileText className="w-4 h-4" />}
                                onClick={() => handleAction('logs', container)}
                              >
                                View Logs
                              </DropdownItem>
                              <DropdownItem
                                icon={<Info className="w-4 h-4" />}
                                onClick={() => handleAction('inspect', container)}
                              >
                                Inspect
                              </DropdownItem>
                              <DropdownItem
                                icon={<Terminal className="w-4 h-4" />}
                                onClick={() => handleAction('terminal', container)}
                              >
                                Terminal
                              </DropdownItem>
                              <DropdownDivider />
                              <DropdownItem
                                icon={<Trash2 className="w-4 h-4" />}
                                danger
                                onClick={() => handleAction('delete', container)}
                              >
                                Delete
                              </DropdownItem>
                            </Dropdown>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <Card padding>
            <Empty
              title="No containers found"
              description={search ? 'Try adjusting your search terms' : 'Create your first container to get started'}
              action={
                !search && (
                  <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreateModal(true)}>
                    Create Container
                  </Button>
                )
              }
            />
          </Card>
        )
      ) : filteredContainers.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredContainers.map((container) => (
                <ContainerCard 
                  key={container.id} 
                  container={container}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('name');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'status') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('status');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell>Ports</TableCell>
                  <TableCell>CPU / Memory</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'created') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('created');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Created {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContainers.map((container) => (
                  <TableRow key={container.id}>
                    <TableCell>
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/docker/containers/${container.id}`)}
                      >
                        <Terminal className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-dark-100">{container.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-dark-300 text-sm">{container.image}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        container.status === 'running' ? 'success' :
                        container.status === 'stopped' || container.status === 'exited' ? 'gray' :
                        container.status === 'paused' ? 'warning' : 'info'
                      } dot>
                        {container.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {container.ports && container.ports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {container.ports.slice(0, 2).map((port, index) => (
                            <span key={`${index}-${port}`} className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300 font-mono">
                              {port}
                            </span>
                          ))}
                          {container.ports.length > 2 && (
                            <span className="text-xs text-dark-500">+{container.ports.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-dark-500 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {container.status === 'running' && container.cpu !== undefined && container.memory ? (
                        <div className="text-sm">
                          <div className="text-dark-300">{container.cpu.toFixed(1)}% CPU</div>
                          <div className="text-dark-500 text-xs">
                            {formatBytes(container.memory.used * 1024 * 1024)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-dark-500 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-dark-400 text-sm">{container.created}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {container.status === 'running' ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Square className="w-3 h-3" />}
                              onClick={() => handleAction('stop', container)}
                              title="Stop"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<RotateCcw className="w-3 h-3" />}
                              onClick={() => handleAction('restart', container)}
                              title="Restart"
                            />
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Play className="w-3 h-3" />}
                            onClick={() => handleAction('start', container)}
                            title="Start"
                          />
                        )}
                        <Dropdown
                          trigger={
                            <Button size="sm" variant="ghost" leftIcon={<MoreVertical className="w-3 h-3" />} />
                          }
                        >
                          <DropdownItem 
                            icon={<FileText className="w-4 h-4" />}
                            onClick={() => handleAction('logs', container)}
                          >
                            View Logs
                          </DropdownItem>
                          <DropdownItem 
                            icon={<Info className="w-4 h-4" />}
                            onClick={() => handleAction('inspect', container)}
                          >
                            Inspect
                          </DropdownItem>
                          <DropdownItem 
                            icon={<Terminal className="w-4 h-4" />}
                            onClick={() => handleAction('terminal', container)}
                          >
                            Terminal
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem 
                            icon={<Trash2 className="w-4 h-4" />}
                            danger
                            onClick={() => handleAction('delete', container)}
                          >
                            Delete
                          </DropdownItem>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <Card padding>
          <Empty
            title="No containers found"
            description={search ? 'Try adjusting your search terms' : 'Create your first container to get started'}
            action={
              !search && (
                <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreateModal(true)}>
                  Create Container
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Create Container Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Container"
        description="Create a new Docker container"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Container Name</label>
            <Input
              type="text"
              placeholder="my-container"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Image</label>
            <Input
              type="text"
              placeholder="nginx:latest"
              value={createForm.image}
              onChange={(e) => setCreateForm({ ...createForm, image: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Port Mapping (e.g., 80:80)</label>
              <Input
                type="text"
                placeholder="80:80"
                onChange={(e) => {
                  const [host, container] = e.target.value.split(':');
                  if (host && container) {
                    setCreateForm({
                      ...createForm,
                      ports: [{ host: parseInt(host), container: parseInt(container) }],
                    });
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Network</label>
              <select
                value={createForm.network}
                onChange={(e) => setCreateForm({ ...createForm, network: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-900/50 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <option value="bridge">bridge</option>
                <option value="host">host</option>
                <option value="none">none</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Restart Policy</label>
            <select
              value={createForm.restart}
              onChange={(e) => setCreateForm({ ...createForm, restart: e.target.value })}
              className="w-full px-4 py-2.5 bg-dark-900/50 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            >
              <option value="no">No</option>
              <option value="always">Always</option>
              <option value="unless-stopped">Unless Stopped</option>
              <option value="on-failure">On Failure</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!createForm.name || !createForm.image}
            >
              Create Container
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        open={showLogsModal}
        onClose={() => {
          setShowLogsModal(false);
          setSelectedContainer(null);
          setLogs('');
        }}
        title={`Logs - ${selectedContainer?.name || ''}`}
        description="Container logs"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => selectedContainer && loadLogs(selectedContainer.id)}
              disabled={logsLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Copy className="w-4 h-4" />}
              onClick={() => {
                navigator.clipboard.writeText(logs);
                toast.success('Logs copied to clipboard');
              }}
            >
              Copy
            </Button>
          </div>
          <div className="bg-dark-950 rounded-lg p-4 font-mono text-sm max-h-96 overflow-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : logs ? (
              <pre className="text-dark-300 whitespace-pre-wrap">{logs}</pre>
            ) : (
              <div className="text-dark-500">No logs available</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
