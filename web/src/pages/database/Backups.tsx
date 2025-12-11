import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  MoreVertical,
  Clock,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Calendar,
  Database,
  FileArchive,
  Cloud,
  Server,
  Settings,
  History,
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
  Progress,
  Empty,
  Tabs,
  Tab,
  Input,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme';

type BackupStatus = 'completed' | 'running' | 'failed' | 'scheduled';
type BackupType = 'full' | 'incremental' | 'differential';

interface Backup {
  id: string;
  name: string;
  database: string;
  server: string;
  serverType: 'mysql' | 'postgresql' | 'mongodb';
  type: BackupType;
  status: BackupStatus;
  size: string;
  createdAt: string;
  duration: string;
  storage: 'local' | 's3' | 'gcs' | 'azure';
  retention: string;
  compressed: boolean;
  encrypted: boolean;
}

interface ScheduledBackup {
  id: string;
  name: string;
  database: string;
  server: string;
  schedule: string;
  type: BackupType;
  nextRun: string;
  lastRun?: string;
  lastStatus?: BackupStatus;
  enabled: boolean;
  retention: string;
  storage: 'local' | 's3' | 'gcs' | 'azure';
}

const mockBackups: Backup[] = [
  {
    id: '1',
    name: 'app_production_20241206_020000',
    database: 'app_production',
    server: 'Production MySQL',
    serverType: 'mysql',
    type: 'full',
    status: 'completed',
    size: '2.4 GB',
    createdAt: '2024-12-06 02:00:00',
    duration: '15m 32s',
    storage: 's3',
    retention: '30 days',
    compressed: true,
    encrypted: true,
  },
  {
    id: '2',
    name: 'app_production_20241205_140000',
    database: 'app_production',
    server: 'Production MySQL',
    serverType: 'mysql',
    type: 'incremental',
    status: 'completed',
    size: '156 MB',
    createdAt: '2024-12-05 14:00:00',
    duration: '2m 18s',
    storage: 's3',
    retention: '7 days',
    compressed: true,
    encrypted: true,
  },
  {
    id: '3',
    name: 'analytics_20241206_030000',
    database: 'analytics',
    server: 'Production PostgreSQL',
    serverType: 'postgresql',
    type: 'full',
    status: 'running',
    size: '~5.2 GB',
    createdAt: '2024-12-06 03:00:00',
    duration: '8m 45s (running)',
    storage: 'local',
    retention: '14 days',
    compressed: true,
    encrypted: false,
  },
  {
    id: '4',
    name: 'logs_20241206_010000',
    database: 'logs',
    server: 'Production MySQL',
    serverType: 'mysql',
    type: 'full',
    status: 'failed',
    size: '-',
    createdAt: '2024-12-06 01:00:00',
    duration: '-',
    storage: 'local',
    retention: '3 days',
    compressed: true,
    encrypted: false,
  },
  {
    id: '5',
    name: 'mongodb_cluster_20241205_220000',
    database: 'all',
    server: 'MongoDB Cluster',
    serverType: 'mongodb',
    type: 'full',
    status: 'completed',
    size: '48.6 GB',
    createdAt: '2024-12-05 22:00:00',
    duration: '1h 12m',
    storage: 'gcs',
    retention: '90 days',
    compressed: true,
    encrypted: true,
  },
];

const mockSchedules: ScheduledBackup[] = [
  {
    id: '1',
    name: 'Daily Full Backup',
    database: 'app_production',
    server: 'Production MySQL',
    schedule: '0 2 * * *',
    type: 'full',
    nextRun: 'Tomorrow 02:00',
    lastRun: 'Today 02:00',
    lastStatus: 'completed',
    enabled: true,
    retention: '30 days',
    storage: 's3',
  },
  {
    id: '2',
    name: 'Hourly Incremental',
    database: 'app_production',
    server: 'Production MySQL',
    schedule: '0 * * * *',
    type: 'incremental',
    nextRun: 'In 45 minutes',
    lastRun: '15 minutes ago',
    lastStatus: 'completed',
    enabled: true,
    retention: '7 days',
    storage: 's3',
  },
  {
    id: '3',
    name: 'Weekly Analytics Backup',
    database: 'analytics',
    server: 'Production PostgreSQL',
    schedule: '0 3 * * 0',
    type: 'full',
    nextRun: 'Sunday 03:00',
    lastRun: 'Last Sunday',
    lastStatus: 'completed',
    enabled: true,
    retention: '90 days',
    storage: 'gcs',
  },
  {
    id: '4',
    name: 'MongoDB Daily',
    database: 'all',
    server: 'MongoDB Cluster',
    schedule: '0 22 * * *',
    type: 'full',
    nextRun: 'Today 22:00',
    lastRun: 'Yesterday 22:00',
    lastStatus: 'completed',
    enabled: true,
    retention: '60 days',
    storage: 'gcs',
  },
  {
    id: '5',
    name: 'Dev Backup (Disabled)',
    database: 'app_dev',
    server: 'Dev MariaDB',
    schedule: '0 4 * * *',
    type: 'full',
    nextRun: '-',
    lastRun: '3 days ago',
    lastStatus: 'completed',
    enabled: false,
    retention: '7 days',
    storage: 'local',
  },
];

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' },
  running: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Running' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  scheduled: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Scheduled' },
};

const storageConfig = {
  local: { label: 'Local', color: 'bg-gray-500/10 text-gray-500' },
  s3: { label: 'AWS S3', color: 'bg-orange-500/10 text-orange-500' },
  gcs: { label: 'GCS', color: 'bg-blue-500/10 text-blue-500' },
  azure: { label: 'Azure', color: 'bg-blue-600/10 text-blue-600' },
};

const dbTypeIcons = {
  mysql: '🐬',
  postgresql: '🐘',
  mongodb: '🍃',
};

function BackupRow({ backup }: { backup: Backup }) {
  const [showDelete, setShowDelete] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const status = statusConfig[backup.status];
  const StatusIcon = status.icon;

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'border-b transition-colors',
          isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-800 hover:bg-gray-800/50'
        )}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-lg', status.bg)}>
              {dbTypeIcons[backup.serverType]}
            </div>
            <div>
              <p className={cn('font-medium text-sm', isLight ? 'text-gray-900' : 'text-gray-100')}>
                {backup.name}
              </p>
              <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-500')}>
                {backup.database} • {backup.server}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={cn(status.bg, status.color)}>
            <StatusIcon className={cn('w-3 h-3 mr-1', backup.status === 'running' && 'animate-spin')} />
            {status.label}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <Badge variant={backup.type === 'full' ? 'primary' : backup.type === 'incremental' ? 'success' : 'warning'}>
            {backup.type}
          </Badge>
        </td>
        <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
          {backup.size}
        </td>
        <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
          {backup.duration}
        </td>
        <td className="px-4 py-3">
          <Badge className={storageConfig[backup.storage].color}>
            {storageConfig[backup.storage].label}
          </Badge>
        </td>
        <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
          {backup.createdAt}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {backup.compressed && (
              <Badge variant="gray" className="text-xs">ZIP</Badge>
            )}
            {backup.encrypted && (
              <Badge variant="gray" className="text-xs">🔒</Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <Dropdown
            trigger={
              <button className={cn(
                'p-1.5 rounded-lg transition-colors',
                isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
              )}>
                <MoreVertical className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem icon={<Download className="w-4 h-4" />}>Download</DropdownItem>
            <DropdownItem icon={<Upload className="w-4 h-4" />}>Restore</DropdownItem>
            <DropdownItem icon={<History className="w-4 h-4" />}>View Log</DropdownItem>
            <DropdownDivider />
            <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger onClick={() => setShowDelete(true)}>
              Delete
            </DropdownItem>
          </Dropdown>
        </td>
      </motion.tr>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => setShowDelete(false)}
        type="danger"
        title="Delete Backup"
        message={`Are you sure you want to delete "${backup.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

function ScheduleRow({ schedule }: { schedule: ScheduledBackup }) {
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'border-b transition-colors',
        isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-800 hover:bg-gray-800/50',
        !schedule.enabled && 'opacity-60'
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            schedule.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'
          )}>
            <Calendar className={cn(
              'w-4 h-4',
              schedule.enabled ? 'text-green-500' : 'text-gray-500'
            )} />
          </div>
          <div>
            <p className={cn('font-medium text-sm', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {schedule.name}
            </p>
            <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-500')}>
              {schedule.database} • {schedule.server}
            </p>
          </div>
        </div>
      </td>
      <td className={cn('px-4 py-3 text-sm font-mono', isLight ? 'text-gray-600' : 'text-gray-400')}>
        {schedule.schedule}
      </td>
      <td className="px-4 py-3">
        <Badge variant={schedule.type === 'full' ? 'primary' : schedule.type === 'incremental' ? 'success' : 'warning'}>
          {schedule.type}
        </Badge>
      </td>
      <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
        {schedule.nextRun}
      </td>
      <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
        <div className="flex items-center gap-2">
          {schedule.lastRun || '-'}
          {schedule.lastStatus && (
            <span className={cn(
              'w-2 h-2 rounded-full',
              schedule.lastStatus === 'completed' ? 'bg-green-500' : 
              schedule.lastStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
            )} />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={storageConfig[schedule.storage].color}>
          {storageConfig[schedule.storage].label}
        </Badge>
      </td>
      <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
        {schedule.retention}
      </td>
      <td className="px-4 py-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={schedule.enabled} className="sr-only peer" onChange={() => {}} />
          <div className={cn(
            'w-9 h-5 rounded-full peer transition-colors',
            schedule.enabled ? 'bg-green-500' : isLight ? 'bg-gray-300' : 'bg-gray-600',
            'after:content-[""] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all',
            schedule.enabled && 'after:translate-x-full'
          )} />
        </label>
      </td>
      <td className="px-4 py-3">
        <Dropdown
          trigger={
            <button className={cn(
              'p-1.5 rounded-lg transition-colors',
              isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
            )}>
              <MoreVertical className="w-4 h-4" />
            </button>
          }
        >
          <DropdownItem icon={<Play className="w-4 h-4" />}>Run Now</DropdownItem>
          <DropdownItem icon={<Settings className="w-4 h-4" />}>Edit</DropdownItem>
          <DropdownItem icon={<History className="w-4 h-4" />}>View History</DropdownItem>
          <DropdownDivider />
          <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger>Delete</DropdownItem>
        </Dropdown>
      </td>
    </motion.tr>
  );
}

export default function DatabaseBackups() {
  const [activeTab, setActiveTab] = useState<'backups' | 'schedules' | 'storage'>('backups');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  const filteredBackups = mockBackups.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.database.toLowerCase().includes(search.toLowerCase()) ||
    b.server.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSchedules = mockSchedules.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.database.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const totalSize = mockBackups
    .filter((b) => b.status === 'completed')
    .reduce((acc, b) => {
      const size = parseFloat(b.size);
      if (b.size.includes('GB')) return acc + size;
      if (b.size.includes('MB')) return acc + size / 1024;
      return acc;
    }, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={cn('text-2xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Database Backups</h1>
          <p className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Manage backups and restore points</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={<Calendar className="w-4 h-4" />} onClick={() => setShowSchedule(true)}>
            New Schedule
          </Button>
          <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreate(true)}>
            Create Backup
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileArchive className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {mockBackups.length}
            </p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Total Backups</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {mockBackups.filter((b) => b.status === 'completed').length}
            </p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Completed</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {totalSize.toFixed(1)} GB
            </p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Total Size</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {mockSchedules.filter((s) => s.enabled).length}
            </p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Active Schedules</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs className="mb-6">
        <Tab active={activeTab === 'backups'} onClick={() => setActiveTab('backups')}>
          Backups ({mockBackups.length})
        </Tab>
        <Tab active={activeTab === 'schedules'} onClick={() => setActiveTab('schedules')}>
          Schedules ({mockSchedules.length})
        </Tab>
        <Tab active={activeTab === 'storage'} onClick={() => setActiveTab('storage')}>
          Storage Settings
        </Tab>
      </Tabs>

      {/* Search */}
      <div className="mb-6 max-w-md">
        <SearchInput
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Content */}
      <Card>
        {activeTab === 'backups' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn(
                  'border-b text-left text-sm',
                  isLight ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-400'
                )}>
                  <th className="px-4 py-3 font-medium">Backup</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Storage</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Options</th>
                  <th className="px-4 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBackups.map((backup) => (
                  <BackupRow key={backup.id} backup={backup} />
                ))}
              </tbody>
            </table>
            {filteredBackups.length === 0 && (
              <div className="py-12">
                <Empty
                  icon={<FileArchive className="w-8 h-8" />}
                  title="No backups found"
                  description="Create your first backup to get started"
                  action={
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                      Create Backup
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn(
                  'border-b text-left text-sm',
                  isLight ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-400'
                )}>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Cron</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Next Run</th>
                  <th className="px-4 py-3 font-medium">Last Run</th>
                  <th className="px-4 py-3 font-medium">Storage</th>
                  <th className="px-4 py-3 font-medium">Retention</th>
                  <th className="px-4 py-3 font-medium">Enabled</th>
                  <th className="px-4 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((schedule) => (
                  <ScheduleRow key={schedule.id} schedule={schedule} />
                ))}
              </tbody>
            </table>
            {filteredSchedules.length === 0 && (
              <div className="py-12">
                <Empty
                  icon={<Calendar className="w-8 h-8" />}
                  title="No schedules found"
                  description="Set up automated backups with schedules"
                  action={
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowSchedule(true)}>
                      New Schedule
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Local Storage */}
              <div className={cn('p-4 rounded-xl border', isLight ? 'border-gray-200' : 'border-gray-700')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h4 className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>Local Storage</h4>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                      /var/backups/vpanel
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>Used</span>
                    <span className={isLight ? 'text-gray-900' : 'text-gray-100'}>45.2 GB / 200 GB</span>
                  </div>
                  <Progress value={22.6} max={100} />
                </div>
              </div>

              {/* AWS S3 */}
              <div className={cn('p-4 rounded-xl border', isLight ? 'border-gray-200' : 'border-gray-700')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>AWS S3</h4>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                      s3://vpanel-backups
                    </p>
                  </div>
                  <Badge variant="success" className="ml-auto">Connected</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>Total Size</span>
                    <span className={isLight ? 'text-gray-900' : 'text-gray-100'}>128.5 GB</span>
                  </div>
                </div>
              </div>

              {/* Google Cloud Storage */}
              <div className={cn('p-4 rounded-xl border', isLight ? 'border-gray-200' : 'border-gray-700')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>Google Cloud Storage</h4>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                      gs://vpanel-backups
                    </p>
                  </div>
                  <Badge variant="success" className="ml-auto">Connected</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>Total Size</span>
                    <span className={isLight ? 'text-gray-900' : 'text-gray-100'}>256.8 GB</span>
                  </div>
                </div>
              </div>

              {/* Add Storage */}
              <div className={cn(
                'p-4 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors',
                isLight ? 'border-gray-300 hover:border-gray-400' : 'border-gray-700 hover:border-gray-600'
              )}>
                <div className="text-center">
                  <Plus className={cn('w-8 h-8 mx-auto mb-2', isLight ? 'text-gray-400' : 'text-gray-500')} />
                  <p className={cn('font-medium', isLight ? 'text-gray-600' : 'text-gray-400')}>Add Storage</p>
                  <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-500')}>
                    Connect S3, GCS, or Azure
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Create Backup Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Backup" size="md">
        <div className="space-y-4">
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Database Server
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )}>
              <option>Production MySQL</option>
              <option>Production PostgreSQL</option>
              <option>MongoDB Cluster</option>
              <option>Redis Cache</option>
            </select>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Database
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )}>
              <option>All Databases</option>
              <option>app_production</option>
              <option>analytics</option>
              <option>logs</option>
            </select>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Backup Type
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )}>
              <option value="full">Full Backup</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Storage Location
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )}>
              <option value="local">Local Storage</option>
              <option value="s3">AWS S3</option>
              <option value="gcs">Google Cloud Storage</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className={cn('text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}>Compress</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className={cn('text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}>Encrypt</span>
            </label>
          </div>

          <div className={cn(
            'flex justify-end gap-3 pt-4 border-t',
            isLight ? 'border-gray-200' : 'border-gray-700'
          )}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button leftIcon={<Play className="w-4 h-4" />}>Start Backup</Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Create Backup Schedule" size="md">
        <div className="space-y-4">
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Schedule Name
            </label>
            <Input placeholder="Daily Production Backup" />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Database Server
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )}>
              <option>Production MySQL</option>
              <option>Production PostgreSQL</option>
              <option>MongoDB Cluster</option>
            </select>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Cron Schedule
            </label>
            <Input placeholder="0 2 * * *" />
            <p className={cn('text-xs mt-1', isLight ? 'text-gray-500' : 'text-gray-400')}>
              Format: minute hour day month weekday
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                Backup Type
              </label>
              <select className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm',
                isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
              )}>
                <option value="full">Full</option>
                <option value="incremental">Incremental</option>
              </select>
            </div>
            <div>
              <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                Retention
              </label>
              <select className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm',
                isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
              )}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>

          <div className={cn(
            'flex justify-end gap-3 pt-4 border-t',
            isLight ? 'border-gray-200' : 'border-gray-700'
          )}>
            <Button variant="secondary" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button leftIcon={<Calendar className="w-4 h-4" />}>Create Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
