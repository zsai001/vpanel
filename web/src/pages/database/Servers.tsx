import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Database,
  Server,
  MoreVertical,
  RefreshCw,
  Trash2,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Square,
  Terminal,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  Users,
  Table2,
  Zap,
  Clock,
  Download,
  Upload,
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
  StatusDot,
  Input,
  Tabs,
  Tab,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme';

type DatabaseType = 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'mariadb';

interface DatabaseServer {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  version: string;
  size: string;
  connections: { active: number; max: number };
  databases: number;
  uptime: string;
  cpu: number;
  memory: { used: number; total: number };
  storage: { used: number; total: number };
  lastBackup?: string;
  isLocal: boolean;
}

interface DatabaseInstance {
  id: string;
  name: string;
  serverId: string;
  size: string;
  tables: number;
  charset: string;
  collation: string;
}

const mockServers: DatabaseServer[] = [
  {
    id: '1',
    name: 'Production MySQL',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    status: 'running',
    version: '8.0.35',
    size: '45.2 GB',
    connections: { active: 23, max: 150 },
    databases: 12,
    uptime: '45 days',
    cpu: 12.5,
    memory: { used: 4.2, total: 8 },
    storage: { used: 45.2, total: 100 },
    lastBackup: '2 hours ago',
    isLocal: true,
  },
  {
    id: '2',
    name: 'Production PostgreSQL',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    status: 'running',
    version: '16.1',
    size: '128.5 GB',
    connections: { active: 45, max: 200 },
    databases: 8,
    uptime: '30 days',
    cpu: 18.3,
    memory: { used: 6.8, total: 16 },
    storage: { used: 128.5, total: 500 },
    lastBackup: '1 hour ago',
    isLocal: true,
  },
  {
    id: '3',
    name: 'Redis Cache',
    type: 'redis',
    host: 'localhost',
    port: 6379,
    status: 'running',
    version: '7.2.3',
    size: '2.1 GB',
    connections: { active: 156, max: 10000 },
    databases: 16,
    uptime: '60 days',
    cpu: 5.2,
    memory: { used: 2.1, total: 4 },
    storage: { used: 2.1, total: 4 },
    isLocal: true,
  },
  {
    id: '4',
    name: 'MongoDB Cluster',
    type: 'mongodb',
    host: '192.168.1.100',
    port: 27017,
    status: 'running',
    version: '7.0.4',
    size: '256.8 GB',
    connections: { active: 89, max: 500 },
    databases: 5,
    uptime: '15 days',
    cpu: 22.1,
    memory: { used: 12.4, total: 32 },
    storage: { used: 256.8, total: 1000 },
    lastBackup: '4 hours ago',
    isLocal: false,
  },
  {
    id: '5',
    name: 'Dev MariaDB',
    type: 'mariadb',
    host: 'localhost',
    port: 3307,
    status: 'stopped',
    version: '11.2.2',
    size: '8.5 GB',
    connections: { active: 0, max: 50 },
    databases: 4,
    uptime: '-',
    cpu: 0,
    memory: { used: 0, total: 2 },
    storage: { used: 8.5, total: 50 },
    isLocal: true,
  },
];

const mockDatabases: DatabaseInstance[] = [
  { id: '1', name: 'app_production', serverId: '1', size: '12.5 GB', tables: 45, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' },
  { id: '2', name: 'app_staging', serverId: '1', size: '3.2 GB', tables: 45, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' },
  { id: '3', name: 'analytics', serverId: '1', size: '28.1 GB', tables: 12, charset: 'utf8mb4', collation: 'utf8mb4_general_ci' },
  { id: '4', name: 'logs', serverId: '1', size: '1.4 GB', tables: 3, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' },
];

const dbTypeConfig: Record<DatabaseType, { icon: string; color: string; bgColor: string }> = {
  mysql: { icon: '🐬', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  postgresql: { icon: '🐘', color: 'text-blue-600', bgColor: 'bg-blue-600/10' },
  mongodb: { icon: '🍃', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  redis: { icon: '⚡', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  mariadb: { icon: '🦭', color: 'text-amber-600', bgColor: 'bg-amber-600/10' },
};

function ServerCard({ server, onSelect }: { server: DatabaseServer; onSelect: () => void }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const typeConfig = dbTypeConfig[server.type];

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'rounded-xl border transition-all cursor-pointer hover:shadow-lg',
          isLight ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        )}
        onClick={onSelect}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl', typeConfig.bgColor)}>
                {typeConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn('font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>{server.name}</h3>
                  <StatusDot 
                    status={server.status === 'running' ? 'online' : server.status === 'stopped' ? 'offline' : 'error'} 
                    pulse={server.status === 'running'} 
                  />
                </div>
                <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                  {server.host}:{server.port}
                </p>
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                trigger={
                  <button className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isLight ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                  )}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                }
              >
                <DropdownItem icon={<Terminal className="w-4 h-4" />}>Open Console</DropdownItem>
                <DropdownItem icon={<Activity className="w-4 h-4" />}>View Metrics</DropdownItem>
                <DropdownItem icon={<Download className="w-4 h-4" />}>Export</DropdownItem>
                <DropdownItem icon={<Upload className="w-4 h-4" />}>Import</DropdownItem>
                <DropdownDivider />
                {server.status === 'running' ? (
                  <DropdownItem icon={<Square className="w-4 h-4" />}>Stop Server</DropdownItem>
                ) : (
                  <DropdownItem icon={<Play className="w-4 h-4" />}>Start Server</DropdownItem>
                )}
                <DropdownItem icon={<RefreshCw className="w-4 h-4" />}>Restart</DropdownItem>
                <DropdownItem icon={<Settings className="w-4 h-4" />}>Settings</DropdownItem>
                <DropdownDivider />
                <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger onClick={() => setShowDelete(true)}>
                  Remove
                </DropdownItem>
              </Dropdown>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="gray">{server.type.toUpperCase()}</Badge>
            <Badge variant="gray">v{server.version}</Badge>
            {server.isLocal ? (
              <Badge variant="primary">Local</Badge>
            ) : (
              <Badge variant="warning">Remote</Badge>
            )}
          </div>

          {/* Stats */}
          {server.status === 'running' ? (
            <div className="space-y-3">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className={cn('p-2 rounded-lg text-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <p className={cn('text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                    {server.databases}
                  </p>
                  <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Databases</p>
                </div>
                <div className={cn('p-2 rounded-lg text-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <p className={cn('text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                    {server.connections.active}
                  </p>
                  <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Connections</p>
                </div>
                <div className={cn('p-2 rounded-lg text-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <p className={cn('text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                    {server.size}
                  </p>
                  <p className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Size</p>
                </div>
              </div>

              {/* Resource Usage */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>Memory</span>
                  <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>
                    {server.memory.used} / {server.memory.total} GB
                  </span>
                </div>
                <Progress value={(server.memory.used / server.memory.total) * 100} max={100} size="sm" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>Storage</span>
                  <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>
                    {server.storage.used} / {server.storage.total} GB
                  </span>
                </div>
                <Progress value={(server.storage.used / server.storage.total) * 100} max={100} size="sm" />
              </div>
            </div>
          ) : (
            <div className={cn('py-6 text-center', isLight ? 'text-gray-500' : 'text-gray-500')}>
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Server {server.status}</p>
              <Button size="sm" className="mt-3" leftIcon={<Play className="w-4 h-4" />}>
                Start Server
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          'px-5 py-3 border-t flex items-center justify-between text-xs',
          isLight ? 'border-gray-200 text-gray-500' : 'border-gray-700 text-gray-500'
        )}>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Uptime: {server.uptime}
          </span>
          {server.lastBackup && (
            <span>Last backup: {server.lastBackup}</span>
          )}
        </div>
      </motion.div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => setShowDelete(false)}
        type="danger"
        title="Remove Database Server"
        message={`Are you sure you want to remove "${server.name}"? This will not delete the actual database data.`}
        confirmText="Remove"
      />
    </>
  );
}

function DatabaseList({ server }: { server: DatabaseServer }) {
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const [search, setSearch] = useState('');

  const databases = mockDatabases.filter(
    (db) => db.serverId === server.id && db.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="max-w-xs">
          <SearchInput
            placeholder="Search databases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} size="sm">
          Create Database
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={cn(
              'border-b text-left text-sm',
              isLight ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-400'
            )}>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Tables</th>
              <th className="px-4 py-3 font-medium">Charset</th>
              <th className="px-4 py-3 font-medium">Collation</th>
              <th className="px-4 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {databases.map((db) => (
              <motion.tr
                key={db.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'border-b transition-colors',
                  isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-800 hover:bg-gray-800/50'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Database className={cn('w-4 h-4', isLight ? 'text-gray-400' : 'text-gray-500')} />
                    <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>{db.name}</span>
                  </div>
                </td>
                <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>{db.size}</td>
                <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>{db.tables}</td>
                <td className={cn('px-4 py-3 text-sm font-mono', isLight ? 'text-gray-600' : 'text-gray-400')}>{db.charset}</td>
                <td className={cn('px-4 py-3 text-sm font-mono', isLight ? 'text-gray-600' : 'text-gray-400')}>{db.collation}</td>
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
                    <DropdownItem icon={<Table2 className="w-4 h-4" />}>Browse Tables</DropdownItem>
                    <DropdownItem icon={<Terminal className="w-4 h-4" />}>SQL Console</DropdownItem>
                    <DropdownItem icon={<Users className="w-4 h-4" />}>Privileges</DropdownItem>
                    <DropdownDivider />
                    <DropdownItem icon={<Download className="w-4 h-4" />}>Export</DropdownItem>
                    <DropdownItem icon={<Upload className="w-4 h-4" />}>Import</DropdownItem>
                    <DropdownDivider />
                    <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger>Drop Database</DropdownItem>
                  </Dropdown>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {databases.length === 0 && (
          <div className="py-12">
            <Empty
              icon={<Database className="w-8 h-8" />}
              title="No databases found"
              description="Create your first database or adjust filters"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ServerDetail({ server, onBack }: { server: DatabaseServer; onBack: () => void }) {
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const [activeTab, setActiveTab] = useState<'databases' | 'users' | 'metrics' | 'settings'>('databases');
  const typeConfig = dbTypeConfig[server.type];

  return (
    <div>
      {/* Back Button & Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className={cn(
            'flex items-center gap-2 text-sm mb-4 transition-colors',
            isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-gray-100'
          )}
        >
          ← Back to Servers
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center text-3xl', typeConfig.bgColor)}>
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className={cn('text-2xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                  {server.name}
                </h1>
                <StatusDot 
                  status={server.status === 'running' ? 'online' : 'offline'} 
                  pulse={server.status === 'running'} 
                />
                <Badge variant={server.status === 'running' ? 'success' : 'gray'}>
                  {server.status}
                </Badge>
              </div>
              <p className={cn('mt-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
                {server.type.toUpperCase()} {server.version} • {server.host}:{server.port}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" leftIcon={<Terminal className="w-4 h-4" />}>
              Console
            </Button>
            {server.status === 'running' ? (
              <Button variant="secondary" leftIcon={<Square className="w-4 h-4" />}>
                Stop
              </Button>
            ) : (
              <Button leftIcon={<Play className="w-4 h-4" />}>
                Start
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Database className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{server.databases}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Databases</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {server.connections.active}
            </p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
              / {server.connections.max} Connections
            </p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{server.size}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Storage Used</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{server.uptime}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Uptime</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs className="mb-6">
        <Tab active={activeTab === 'databases'} onClick={() => setActiveTab('databases')}>
          Databases ({server.databases})
        </Tab>
        <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
          Users & Privileges
        </Tab>
        <Tab active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')}>
          Metrics
        </Tab>
        <Tab active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
          Settings
        </Tab>
      </Tabs>

      {/* Tab Content */}
      <Card>
        {activeTab === 'databases' && <DatabaseList server={server} />}
        {activeTab === 'users' && (
          <div className="p-8 text-center">
            <Users className={cn('w-12 h-12 mx-auto mb-4', isLight ? 'text-gray-400' : 'text-gray-500')} />
            <h3 className={cn('text-lg font-medium mb-2', isLight ? 'text-gray-900' : 'text-gray-100')}>
              User Management
            </h3>
            <p className={cn('mb-4', isLight ? 'text-gray-600' : 'text-gray-400')}>
              Manage database users and their privileges
            </p>
            <Button leftIcon={<Plus className="w-4 h-4" />}>Add User</Button>
          </div>
        )}
        {activeTab === 'metrics' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
                  CPU Usage
                </h4>
                <div className={cn('h-40 rounded-lg flex items-center justify-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <div className="text-center">
                    <p className={cn('text-4xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                      {server.cpu}%
                    </p>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>Current</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
                  Memory Usage
                </h4>
                <div className={cn('h-40 rounded-lg flex items-center justify-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <div className="text-center">
                    <p className={cn('text-4xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                      {((server.memory.used / server.memory.total) * 100).toFixed(0)}%
                    </p>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                      {server.memory.used} / {server.memory.total} GB
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
                  Connections
                </h4>
                <div className={cn('h-40 rounded-lg flex items-center justify-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <div className="text-center">
                    <p className={cn('text-4xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                      {server.connections.active}
                    </p>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                      / {server.connections.max} max
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
                  Storage
                </h4>
                <div className={cn('h-40 rounded-lg flex items-center justify-center', isLight ? 'bg-gray-50' : 'bg-gray-900/50')}>
                  <div className="text-center">
                    <p className={cn('text-4xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                      {((server.storage.used / server.storage.total) * 100).toFixed(0)}%
                    </p>
                    <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>
                      {server.storage.used} / {server.storage.total} GB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            <div>
              <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
                Connection Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                    Host
                  </label>
                  <Input value={server.host} readOnly />
                </div>
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                    Port
                  </label>
                  <Input value={server.port.toString()} readOnly />
                </div>
              </div>
            </div>
            <div>
              <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
                Performance Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                    Max Connections
                  </label>
                  <Input value={server.connections.max.toString()} />
                </div>
                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                    Memory Limit
                  </label>
                  <Input value={`${server.memory.total} GB`} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Settings</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DatabaseServers() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedServer, setSelectedServer] = useState<DatabaseServer | null>(null);
  const [filterType, setFilterType] = useState<DatabaseType | 'all'>('all');
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  const filteredServers = mockServers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.host.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || s.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: mockServers.length,
    running: mockServers.filter((s) => s.status === 'running').length,
    stopped: mockServers.filter((s) => s.status === 'stopped').length,
  };

  if (selectedServer) {
    return <ServerDetail server={selectedServer} onBack={() => setSelectedServer(null)} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={cn('text-2xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Database Servers</h1>
          <p className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Manage your database connections</p>
        </div>
        <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowAdd(true)}>
          Add Server
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Server className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.total}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Total Servers</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.running}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Running</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.stopped}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Stopped</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DatabaseType | 'all')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm border',
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
          )}
        >
          <option value="all">All Types</option>
          <option value="mysql">MySQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mongodb">MongoDB</option>
          <option value="redis">Redis</option>
          <option value="mariadb">MariaDB</option>
        </select>
      </div>

      {/* Servers Grid */}
      {filteredServers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredServers.map((server) => (
              <ServerCard 
                key={server.id} 
                server={server} 
                onSelect={() => setSelectedServer(server)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card padding>
          <Empty
            icon={<Database className="w-8 h-8 text-gray-500" />}
            title="No database servers found"
            description="Add your first database server to start managing"
            action={
              <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowAdd(true)}>
                Add Server
              </Button>
            }
          />
        </Card>
      )}

      {/* Add Server Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Database Server" size="md">
        <div className="space-y-4">
          <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
            Connect to an existing database server or create a new one.
          </p>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Server Name
            </label>
            <Input placeholder="My Database Server" />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Database Type
            </label>
            <select
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm',
                isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
              )}
            >
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mongodb">MongoDB</option>
              <option value="redis">Redis</option>
              <option value="mariadb">MariaDB</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                Host
              </label>
              <Input placeholder="localhost" />
            </div>
            <div>
              <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                Port
              </label>
              <Input placeholder="3306" />
            </div>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Username
            </label>
            <Input placeholder="root" />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Password
            </label>
            <Input type="password" placeholder="••••••••" />
          </div>

          <div className={cn(
            'flex justify-end gap-3 pt-4 border-t',
            isLight ? 'border-gray-200' : 'border-gray-700'
          )}>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button>Test & Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
