import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  MoreVertical,
  RefreshCw,
  Edit,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Grid3x3,
  List,
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
  Empty,
  Spinner,
  Input,
  Textarea,
  Switch,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import * as cronApi from '@/api/cron';
import type { CronJob, CreateCronJobRequest, CronJobLog } from '@/api/cron';

function CronJobCard({ 
  job, 
  onAction 
}: { 
  job: CronJob; 
  onAction: (action: string, job: CronJob) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const statusColors: Record<string, 'success' | 'gray' | 'warning' | 'info'> = {
    success: 'success',
    failed: 'warning',
    timeout: 'info',
  };

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      await onAction(action, job);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
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
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              job.enabled ? "bg-blue-500/20" : "bg-dark-700"
            )}>
              <Clock className={cn("w-5 h-5", job.enabled ? "text-blue-400" : "text-dark-500")} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-dark-100 truncate">{job.name}</h3>
                {!job.enabled && (
                  <Badge variant="gray" size="sm">Disabled</Badge>
                )}
              </div>
              <p className="text-sm text-dark-500 truncate font-mono">{job.schedule}</p>
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
              icon={<Play className="w-4 h-4" />} 
              onClick={() => handleAction('run')}
            >
              Run Now
            </DropdownItem>
            <DropdownItem 
              icon={<FileText className="w-4 h-4" />} 
              onClick={() => onAction('logs', job)}
            >
              View Logs
            </DropdownItem>
            <DropdownItem 
              icon={<Edit className="w-4 h-4" />} 
              onClick={() => onAction('edit', job)}
            >
              Edit
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

        <div className="mb-3">
          <p className="text-sm text-dark-300 font-mono bg-dark-900/50 rounded px-2 py-1.5 truncate">
            {job.command}
          </p>
        </div>

        {job.description && (
          <p className="text-xs text-dark-500 mb-3 line-clamp-2">{job.description}</p>
        )}

        <div className="space-y-2 mb-4">
          {job.last_status && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-dark-500">Last Run:</span>
              <Badge 
                variant={statusColors[job.last_status] || 'gray'} 
                size="sm"
                dot
              >
                {job.last_status}
              </Badge>
              {job.last_run_at && (
                <span className="text-dark-500">• {formatDate(job.last_run_at)}</span>
              )}
            </div>
          )}
          {job.next_run_at && job.enabled && (
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3 h-3 text-dark-500" />
              <span className="text-dark-500">Next: {formatDate(job.next_run_at)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-dark-700">
          <Button 
            size="sm" 
            variant="ghost" 
            leftIcon={job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            onClick={() => handleAction(job.enabled ? 'disable' : 'enable')}
            disabled={isLoading}
          >
            {job.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            leftIcon={<Play className="w-4 h-4" />}
            onClick={() => handleAction('run')}
            disabled={isLoading}
          >
            Run
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={() => onAction('logs', job)}
            disabled={isLoading}
          >
            Logs
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
        title="Delete Cron Job"
        message={`Are you sure you want to delete "${job.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

export default function CronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enabledFilter, setEnabledFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'schedule' | 'last_run_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formData, setFormData] = useState<CreateCronJobRequest>({
    node_id: '1',
    name: '',
    schedule: '',
    command: '',
    user: 'root',
    enabled: true,
    timeout: 3600,
    description: '',
  });

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const data = await cronApi.listJobs();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch cron jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Handle job actions
  const handleAction = async (action: string, job: CronJob) => {
    try {
      switch (action) {
        case 'enable':
          await cronApi.updateJob(job.id, { enabled: true });
          toast.success(`Cron job "${job.name}" enabled`);
          break;
        case 'disable':
          await cronApi.updateJob(job.id, { enabled: false });
          toast.success(`Cron job "${job.name}" disabled`);
          break;
        case 'run':
          await cronApi.runJob(job.id);
          toast.success(`Running cron job "${job.name}"`);
          break;
        case 'delete':
          await cronApi.deleteJob(job.id);
          toast.success(`Cron job "${job.name}" deleted`);
          break;
        case 'edit':
          setSelectedJob(job);
          setFormData({
            node_id: job.node_id,
            name: job.name,
            schedule: job.schedule,
            command: job.command,
            user: job.user,
            enabled: job.enabled,
            timeout: job.timeout,
            description: job.description || '',
          });
          setShowEditModal(true);
          return;
        case 'logs':
          setSelectedJob(job);
          setShowLogsModal(true);
          await loadLogs(job.id);
          return;
      }
      // Refresh after action
      await fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} cron job`);
    }
  };

  // Load job logs
  const loadLogs = async (jobId: string) => {
    setLogsLoading(true);
    try {
      const logData = await cronApi.getJobLogs(jobId, 100);
      setLogs(logData);
    } catch (error) {
      toast.error('Failed to load logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Handle create job
  const handleCreate = async () => {
    if (!formData.name || !formData.schedule || !formData.command) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await cronApi.createJob(formData);
      toast.success('Cron job created successfully');
      setShowCreateModal(false);
      resetForm();
      await fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create cron job');
    }
  };

  // Handle update job
  const handleUpdate = async () => {
    if (!selectedJob) return;
    if (!formData.name || !formData.schedule || !formData.command) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await cronApi.updateJob(selectedJob.id, formData);
      toast.success('Cron job updated successfully');
      setShowEditModal(false);
      setSelectedJob(null);
      resetForm();
      await fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update cron job');
    }
  };

  const resetForm = () => {
    setFormData({
      node_id: '1',
      name: '',
      schedule: '',
      command: '',
      user: 'root',
      enabled: true,
      timeout: 3600,
      description: '',
    });
  };

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter((j) => {
      const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase()) ||
                           j.command.toLowerCase().includes(search.toLowerCase()) ||
                           j.schedule.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'success' && j.last_status === 'success') ||
                           (statusFilter === 'failed' && j.last_status === 'failed') ||
                           (statusFilter === 'none' && !j.last_status);
      const matchesEnabled = enabledFilter === 'all' ||
                            (enabledFilter === 'enabled' && j.enabled) ||
                            (enabledFilter === 'disabled' && !j.enabled);
      return matchesSearch && matchesStatus && matchesEnabled;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'schedule':
          comparison = a.schedule.localeCompare(b.schedule);
          break;
        case 'last_run_at':
          const aTime = a.last_run_at ? new Date(a.last_run_at).getTime() : 0;
          const bTime = b.last_run_at ? new Date(b.last_run_at).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const stats = {
    total: jobs.length,
    enabled: jobs.filter((j) => j.enabled).length,
    disabled: jobs.filter((j) => !j.enabled).length,
    success: jobs.filter((j) => j.last_status === 'success').length,
    failed: jobs.filter((j) => j.last_status === 'failed').length,
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'timeout':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
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
          <h1 className="text-2xl font-semibold text-dark-100">Cron Jobs</h1>
          <p className="text-dark-400">Manage scheduled tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchJobs();
            }}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button 
            leftIcon={<Plus className="w-5 h-5" />} 
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          >
            Create Job
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.total}</p>
            <p className="text-sm text-dark-400">Total Jobs</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Play className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.enabled}</p>
            <p className="text-sm text-dark-400">Enabled</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center">
            <Pause className="w-6 h-6 text-dark-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.disabled}</p>
            <p className="text-sm text-dark-400">Disabled</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.success}</p>
            <p className="text-sm text-dark-400">Success</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-100">{stats.failed}</p>
            <p className="text-sm text-dark-400">Failed</p>
          </div>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <Tabs value={enabledFilter} onChange={setEnabledFilter}>
          <TabList>
            <Tab value="all">All</Tab>
            <Tab value="enabled">Enabled</Tab>
            <Tab value="disabled">Disabled</Tab>
          </TabList>
        </Tabs>
        <Tabs value={statusFilter} onChange={setStatusFilter}>
          <TabList>
            <Tab value="all">All Status</Tab>
            <Tab value="success">Success</Tab>
            <Tab value="failed">Failed</Tab>
            <Tab value="none">Never Run</Tab>
          </TabList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            leftIcon={<Grid3x3 className="w-4 h-4" />}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            leftIcon={<List className="w-4 h-4" />}
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredJobs.map((job) => (
                <CronJobCard 
                  key={job.id} 
                  job={job}
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
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'schedule') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('schedule');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Schedule {sortBy === 'schedule' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell>Command</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className={cn("w-4 h-4", job.enabled ? "text-blue-400" : "text-dark-500")} />
                        <div>
                          <div className="font-medium text-dark-100">{job.name}</div>
                          {!job.enabled && (
                            <Badge variant="gray" size="sm">Disabled</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-dark-300 text-sm font-mono">{job.schedule}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-dark-300 text-sm font-mono truncate max-w-xs block">
                        {job.command}
                      </span>
                    </TableCell>
                    <TableCell>
                      {job.last_status ? (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.last_status)}
                          <Badge 
                            variant={
                              job.last_status === 'success' ? 'success' :
                              job.last_status === 'failed' ? 'warning' : 'info'
                            } 
                            dot
                          >
                            {job.last_status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-dark-500 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-dark-400 text-sm">
                        {formatDate(job.last_run_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-dark-400 text-sm">
                        {job.enabled ? formatDate(job.next_run_at) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={job.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          onClick={() => handleAction(job.enabled ? 'disable' : 'enable', job)}
                          title={job.enabled ? 'Disable' : 'Enable'}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Play className="w-3 h-3" />}
                          onClick={() => handleAction('run', job)}
                          title="Run Now"
                        />
                        <Dropdown
                          trigger={
                            <Button size="sm" variant="ghost" leftIcon={<MoreVertical className="w-3 h-3" />} />
                          }
                        >
                          <DropdownItem 
                            icon={<FileText className="w-4 h-4" />}
                            onClick={() => handleAction('logs', job)}
                          >
                            View Logs
                          </DropdownItem>
                          <DropdownItem 
                            icon={<Edit className="w-4 h-4" />}
                            onClick={() => handleAction('edit', job)}
                          >
                            Edit
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem 
                            icon={<Trash2 className="w-4 h-4" />}
                            danger
                            onClick={() => handleAction('delete', job)}
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
            title="No cron jobs found"
            description={search ? 'Try adjusting your search terms' : 'Create your first cron job to get started'}
            action={
              !search && (
                <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}>
                  Create Job
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Create/Edit Job Modal */}
      <Modal
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedJob(null);
          resetForm();
        }}
        title={showEditModal ? 'Edit Cron Job' : 'Create Cron Job'}
        description={showEditModal ? 'Update cron job settings' : 'Create a new scheduled task'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Job Name <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="My Scheduled Task"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Cron Schedule <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="0 * * * *"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            />
            <p className="text-xs text-dark-500 mt-1">
              Format: minute hour day month weekday (e.g., "0 * * * *" for every hour)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Command <span className="text-red-400">*</span>
            </label>
            <Textarea
              placeholder="/path/to/script.sh or command to execute"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">User</label>
              <Input
                type="text"
                placeholder="root"
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Timeout (seconds)</label>
              <Input
                type="number"
                placeholder="3600"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 3600 })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
            <Textarea
              placeholder="Optional description for this cron job"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Enabled</label>
              <p className="text-xs text-dark-500">Enable or disable this cron job</p>
            </div>
            <Switch
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedJob(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={showEditModal ? handleUpdate : handleCreate}
              disabled={!formData.name || !formData.schedule || !formData.command}
            >
              {showEditModal ? 'Update' : 'Create'} Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        open={showLogsModal}
        onClose={() => {
          setShowLogsModal(false);
          setSelectedJob(null);
          setLogs([]);
        }}
        title={`Logs - ${selectedJob?.name || ''}`}
        description="Execution history and logs"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => selectedJob && loadLogs(selectedJob.id)}
              disabled={logsLoading}
            >
              Refresh
            </Button>
            <span className="text-sm text-dark-400">
              {logs.length} log{logs.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="bg-dark-950 rounded-lg max-h-96 overflow-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : logs.length > 0 ? (
              <div className="divide-y divide-dark-800">
                {logs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge 
                          variant={
                            log.status === 'success' ? 'success' :
                            log.status === 'failed' ? 'warning' : 'info'
                          } 
                          size="sm"
                        >
                          {log.status}
                        </Badge>
                        <span className="text-xs text-dark-500">
                          {formatDate(log.started_at)}
                        </span>
                        {log.ended_at && (
                          <span className="text-xs text-dark-500">
                            • Duration: {log.duration}ms
                          </span>
                        )}
                        {log.exit_code !== undefined && (
                          <span className="text-xs text-dark-500">
                            • Exit: {log.exit_code}
                          </span>
                        )}
                      </div>
                    </div>
                    {log.output && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-dark-400 mb-1">Output:</p>
                        <pre className="text-xs text-dark-300 font-mono bg-dark-900/50 rounded p-2 whitespace-pre-wrap break-words">
                          {log.output}
                        </pre>
                      </div>
                    )}
                    {log.error && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-400 mb-1">Error:</p>
                        <pre className="text-xs text-red-300 font-mono bg-red-500/10 rounded p-2 whitespace-pre-wrap break-words">
                          {log.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-dark-500">
                No logs available
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
