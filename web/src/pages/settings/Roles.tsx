import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Users,
  Check,
  X,
  Lock,
  Eye,
  Pencil,
  Settings,
  Server,
  Container,
  Database,
  FolderOpen,
  Terminal,
  Globe,
  Clock,
  Puzzle,
  FileText,
  Cloud,
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
  Empty,
  Input,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  userCount: number;
  permissions: { [key: string]: ('read' | 'write' | 'delete' | 'admin')[] };
  createdAt: string;
  updatedAt: string;
}

const permissionCategories = [
  {
    id: 'servers',
    name: 'Servers & Nodes',
    icon: Server,
    permissions: [
      { id: 'nodes', name: 'Node Management', description: 'Manage server nodes' },
      { id: 'monitoring', name: 'Monitoring', description: 'View server metrics and alerts' },
    ],
  },
  {
    id: 'docker',
    name: 'Docker',
    icon: Container,
    permissions: [
      { id: 'containers', name: 'Containers', description: 'Manage Docker containers' },
      { id: 'images', name: 'Images', description: 'Manage Docker images' },
      { id: 'networks', name: 'Networks', description: 'Manage Docker networks' },
      { id: 'volumes', name: 'Volumes', description: 'Manage Docker volumes' },
      { id: 'compose', name: 'Compose', description: 'Manage Docker Compose stacks' },
    ],
  },
  {
    id: 'k8s',
    name: 'Kubernetes',
    icon: Cloud,
    permissions: [
      { id: 'clusters', name: 'Clusters', description: 'Manage K8s clusters' },
      { id: 'workloads', name: 'Workloads', description: 'Manage deployments and pods' },
      { id: 'services', name: 'Services', description: 'Manage services and ingress' },
      { id: 'config', name: 'Config', description: 'Manage ConfigMaps and Secrets' },
      { id: 'storage', name: 'Storage', description: 'Manage PV and PVC' },
    ],
  },
  {
    id: 'nginx',
    name: 'Nginx',
    icon: Globe,
    permissions: [
      { id: 'sites', name: 'Sites', description: 'Manage Nginx sites' },
      { id: 'certificates', name: 'Certificates', description: 'Manage SSL certificates' },
      { id: 'logs', name: 'Logs', description: 'View Nginx logs' },
    ],
  },
  {
    id: 'database',
    name: 'Database',
    icon: Database,
    permissions: [
      { id: 'servers', name: 'DB Servers', description: 'Manage database servers' },
      { id: 'backups', name: 'Backups', description: 'Manage database backups' },
    ],
  },
  {
    id: 'files',
    name: 'File Manager',
    icon: FolderOpen,
    permissions: [
      { id: 'browse', name: 'Browse', description: 'Browse files' },
      { id: 'edit', name: 'Edit', description: 'Edit files' },
      { id: 'upload', name: 'Upload', description: 'Upload files' },
    ],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: Terminal,
    permissions: [
      { id: 'access', name: 'Terminal Access', description: 'Access web terminal' },
      { id: 'ssh', name: 'SSH', description: 'SSH to servers' },
    ],
  },
  {
    id: 'cron',
    name: 'Cron Jobs',
    icon: Clock,
    permissions: [
      { id: 'jobs', name: 'Jobs', description: 'Manage cron jobs' },
    ],
  },
  {
    id: 'plugins',
    name: 'Plugins',
    icon: Puzzle,
    permissions: [
      { id: 'installed', name: 'Installed', description: 'Manage installed plugins' },
      { id: 'market', name: 'Market', description: 'Access plugin market' },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    permissions: [
      { id: 'users', name: 'Users', description: 'Manage users' },
      { id: 'roles', name: 'Roles', description: 'Manage roles' },
      { id: 'teams', name: 'Teams', description: 'Manage teams' },
      { id: 'system', name: 'System', description: 'System settings' },
    ],
  },
  {
    id: 'logs',
    name: 'Logs',
    icon: FileText,
    permissions: [
      { id: 'audit', name: 'Audit Logs', description: 'View audit logs' },
    ],
  },
];

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    type: 'system',
    userCount: 1,
    permissions: { '*': ['read', 'write', 'delete', 'admin'] },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Admin',
    description: 'Administrative access to most features',
    type: 'system',
    userCount: 2,
    permissions: {
      'docker.*': ['read', 'write', 'delete'],
      'k8s.*': ['read', 'write', 'delete'],
      'nginx.*': ['read', 'write', 'delete'],
      'database.*': ['read', 'write'],
      'files.*': ['read', 'write'],
      'terminal.*': ['read'],
      'settings.users': ['read'],
    },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '3',
    name: 'Operator',
    description: 'Operational access for day-to-day tasks',
    type: 'system',
    userCount: 5,
    permissions: {
      'docker.containers': ['read', 'write'],
      'docker.images': ['read'],
      'nginx.sites': ['read', 'write'],
      'files.*': ['read', 'write'],
      'terminal.access': ['read'],
      'cron.jobs': ['read', 'write'],
    },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '4',
    name: 'Viewer',
    description: 'Read-only access to view resources',
    type: 'system',
    userCount: 8,
    permissions: {
      '*': ['read'],
    },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '5',
    name: 'DevOps Engineer',
    description: 'Custom role for DevOps team members',
    type: 'custom',
    userCount: 3,
    permissions: {
      'docker.*': ['read', 'write', 'delete'],
      'k8s.*': ['read', 'write', 'delete'],
      'nginx.*': ['read', 'write'],
      'terminal.*': ['read'],
    },
    createdAt: '2024-06-15',
    updatedAt: '2024-11-20',
  },
  {
    id: '6',
    name: 'Database Admin',
    description: 'Full access to database management',
    type: 'custom',
    userCount: 2,
    permissions: {
      'database.*': ['read', 'write', 'delete', 'admin'],
      'files.*': ['read'],
      'terminal.*': ['read'],
    },
    createdAt: '2024-08-10',
    updatedAt: '2024-10-05',
  },
];

function RoleCard({ role }: { role: Role }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  const isSystemRole = role.type === 'system';
  const RoleIcon = isSystemRole ? ShieldCheck : Shield;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-xl border p-5 transition-all',
          isLight ? 'bg-white border-gray-200 hover:shadow-md' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isSystemRole ? 'bg-purple-500/10' : 'bg-blue-500/10'
            )}>
              <RoleIcon className={cn('w-5 h-5', isSystemRole ? 'text-purple-500' : 'text-blue-500')} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn('font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>{role.name}</h3>
                {isSystemRole && <Badge variant="gray" className="text-xs">System</Badge>}
              </div>
              <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>{role.description}</p>
            </div>
          </div>
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
            <DropdownItem icon={<Edit className="w-4 h-4" />} onClick={() => setShowEdit(true)}>
              {isSystemRole ? 'View' : 'Edit'}
            </DropdownItem>
            <DropdownItem icon={<Copy className="w-4 h-4" />}>Duplicate</DropdownItem>
            <DropdownItem icon={<Users className="w-4 h-4" />}>View Users</DropdownItem>
            {!isSystemRole && (
              <>
                <DropdownDivider />
                <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger onClick={() => setShowDelete(true)}>
                  Delete
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className={cn('w-4 h-4', isLight ? 'text-gray-400' : 'text-gray-500')} />
            <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>{role.userCount} users</span>
          </div>
          <div className={cn('text-xs', isLight ? 'text-gray-400' : 'text-gray-500')}>
            Updated {role.updatedAt}
          </div>
        </div>
      </motion.div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => setShowDelete(false)}
        type="danger"
        title="Delete Role"
        message={`Are you sure you want to delete "${role.name}"? Users with this role will be assigned to Viewer role.`}
        confirmText="Delete"
      />

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`${isSystemRole ? 'View' : 'Edit'} Role: ${role.name}`} size="xl">
        <RoleEditor role={role} readOnly={isSystemRole} onClose={() => setShowEdit(false)} />
      </Modal>
    </>
  );
}

function RoleEditor({ role, readOnly, onClose }: { role?: Role; readOnly?: boolean; onClose: () => void }) {
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const [expandedCategories, setExpandedCategories] = useState<string[]>(permissionCategories.map(c => c.id));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Role Name
            </label>
            <Input defaultValue={role?.name} placeholder="Enter role name" />
          </div>
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Description
            </label>
            <Input defaultValue={role?.description} placeholder="Enter description" />
          </div>
        </div>
      )}

      <div>
        <h4 className={cn('font-medium mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>Permissions</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {permissionCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <div
                key={category.id}
                className={cn(
                  'rounded-lg border',
                  isLight ? 'border-gray-200' : 'border-gray-700'
                )}
              >
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-left',
                    isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className={cn('w-5 h-5', isLight ? 'text-gray-500' : 'text-gray-400')} />
                    <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>
                      {category.name}
                    </span>
                  </div>
                  <span className={cn(
                    'transform transition-transform',
                    isExpanded ? 'rotate-180' : ''
                  )}>▼</span>
                </button>

                {isExpanded && (
                  <div className={cn('px-4 pb-3 pt-1 border-t', isLight ? 'border-gray-100' : 'border-gray-700')}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isLight ? 'text-gray-500' : 'text-gray-400'}>
                          <th className="text-left py-2 font-medium">Permission</th>
                          <th className="text-center py-2 font-medium w-16">
                            <Eye className="w-4 h-4 mx-auto" title="Read" />
                          </th>
                          <th className="text-center py-2 font-medium w-16">
                            <Pencil className="w-4 h-4 mx-auto" title="Write" />
                          </th>
                          <th className="text-center py-2 font-medium w-16">
                            <Trash2 className="w-4 h-4 mx-auto" title="Delete" />
                          </th>
                          <th className="text-center py-2 font-medium w-16">
                            <Lock className="w-4 h-4 mx-auto" title="Admin" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.permissions.map((permission) => (
                          <tr key={permission.id} className={cn('border-t', isLight ? 'border-gray-100' : 'border-gray-700')}>
                            <td className="py-2">
                              <div>
                                <span className={isLight ? 'text-gray-900' : 'text-gray-100'}>{permission.name}</span>
                                <p className={cn('text-xs', isLight ? 'text-gray-400' : 'text-gray-500')}>
                                  {permission.description}
                                </p>
                              </div>
                            </td>
                            {['read', 'write', 'delete', 'admin'].map((action) => (
                              <td key={action} className="text-center py-2">
                                <input
                                  type="checkbox"
                                  disabled={readOnly}
                                  defaultChecked={role?.permissions['*']?.includes(action as any) || 
                                    role?.permissions[`${category.id}.*`]?.includes(action as any) ||
                                    role?.permissions[`${category.id}.${permission.id}`]?.includes(action as any)}
                                  className="rounded"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn(
        'flex justify-end gap-3 pt-4 border-t',
        isLight ? 'border-gray-200' : 'border-gray-700'
      )}>
        <Button variant="secondary" onClick={onClose}>
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && <Button>Save Role</Button>}
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  const filteredRoles = mockRoles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const systemRoles = filteredRoles.filter(r => r.type === 'system');
  const customRoles = filteredRoles.filter(r => r.type === 'custom');

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={cn('text-2xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Role Management</h1>
          <p className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Define roles and permissions for your organization</p>
        </div>
        <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreate(true)}>
          Create Role
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-md">
        <SearchInput
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* System Roles */}
      <div className="mb-8">
        <h2 className={cn('text-lg font-semibold mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
          System Roles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemRoles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <h2 className={cn('text-lg font-semibold mb-4', isLight ? 'text-gray-900' : 'text-gray-100')}>
          Custom Roles
        </h2>
        {customRoles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customRoles.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        ) : (
          <Card padding>
            <Empty
              icon={<Shield className="w-8 h-8" />}
              title="No custom roles"
              description="Create custom roles to define specific permissions"
              action={
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                  Create Role
                </Button>
              }
            />
          </Card>
        )}
      </div>

      {/* Create Role Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Role" size="xl">
        <RoleEditor onClose={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}

