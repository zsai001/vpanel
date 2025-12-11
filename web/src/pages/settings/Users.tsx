import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  User,
  Users,
  MoreVertical,
  Trash2,
  Edit,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Key,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  UserCog,
  Building2,
  Activity,
  LogIn,
  Send,
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
  Tabs,
  Tab,
  Input,
  Avatar,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme';

type UserStatus = 'active' | 'inactive' | 'locked' | 'pending';
type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer' | 'custom';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  teams: string[];
  status: UserStatus;
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  createdBy: string;
  permissions: string[];
}

const mockUsers: UserAccount[] = [
  {
    id: '1',
    name: 'Administrator',
    email: 'admin@example.com',
    role: 'super_admin',
    teams: ['Platform Team'],
    status: 'active',
    mfaEnabled: true,
    lastLogin: '2 minutes ago',
    createdAt: '2024-01-15',
    createdBy: 'System',
    permissions: ['*'],
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'admin',
    teams: ['DevOps', 'Platform Team'],
    status: 'active',
    mfaEnabled: true,
    lastLogin: '1 hour ago',
    createdAt: '2024-03-20',
    createdBy: 'Administrator',
    permissions: ['servers:*', 'docker:*', 'k8s:*', 'users:read'],
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    role: 'operator',
    teams: ['Development'],
    status: 'active',
    mfaEnabled: false,
    lastLogin: '3 hours ago',
    createdAt: '2024-05-10',
    createdBy: 'John Smith',
    permissions: ['docker:read', 'docker:write', 'files:*'],
  },
  {
    id: '4',
    name: 'Mike Chen',
    email: 'mike.chen@example.com',
    role: 'viewer',
    teams: ['QA Team'],
    status: 'active',
    mfaEnabled: false,
    lastLogin: 'Yesterday',
    createdAt: '2024-06-15',
    createdBy: 'John Smith',
    permissions: ['*:read'],
  },
  {
    id: '5',
    name: 'Emily Davis',
    email: 'emily.d@example.com',
    role: 'operator',
    teams: ['DevOps'],
    status: 'locked',
    mfaEnabled: true,
    lastLogin: '5 days ago',
    createdAt: '2024-04-01',
    createdBy: 'Administrator',
    permissions: ['nginx:*', 'cron:*'],
  },
  {
    id: '6',
    name: 'New User',
    email: 'newuser@example.com',
    role: 'viewer',
    teams: [],
    status: 'pending',
    mfaEnabled: false,
    createdAt: '2024-12-05',
    createdBy: 'Administrator',
    permissions: [],
  },
];

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500/10 text-red-500', icon: ShieldAlert },
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-500', icon: ShieldCheck },
  operator: { label: 'Operator', color: 'bg-blue-500/10 text-blue-500', icon: Shield },
  viewer: { label: 'Viewer', color: 'bg-gray-500/10 text-gray-500', icon: User },
  custom: { label: 'Custom', color: 'bg-amber-500/10 text-amber-500', icon: UserCog },
};

const statusConfig: Record<UserStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'text-green-500', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'text-gray-500', icon: XCircle },
  locked: { label: 'Locked', color: 'text-red-500', icon: Lock },
  pending: { label: 'Pending', color: 'text-amber-500', icon: Clock },
};

function UserRow({ user, onEdit }: { user: UserAccount; onEdit: () => void }) {
  const [showDelete, setShowDelete] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const role = roleConfig[user.role];
  const status = statusConfig[user.status];
  const RoleIcon = role.icon;
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
            <Avatar name={user.name} size="md" />
            <div>
              <p className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>{user.name}</p>
              <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={role.color}>
            <RoleIcon className="w-3 h-3 mr-1" />
            {role.label}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {user.teams.length > 0 ? (
              user.teams.map((team) => (
                <Badge key={team} variant="gray" className="text-xs">{team}</Badge>
              ))
            ) : (
              <span className={cn('text-sm', isLight ? 'text-gray-400' : 'text-gray-500')}>No teams</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('w-4 h-4', status.color)} />
            <span className={cn('text-sm', status.color)}>{status.label}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {user.mfaEnabled ? (
            <Badge variant="success" className="text-xs">
              <Shield className="w-3 h-3 mr-1" /> MFA
            </Badge>
          ) : (
            <Badge variant="gray" className="text-xs">No MFA</Badge>
          )}
        </td>
        <td className={cn('px-4 py-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
          {user.lastLogin || 'Never'}
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
            <DropdownItem icon={<Edit className="w-4 h-4" />} onClick={onEdit}>Edit</DropdownItem>
            <DropdownItem icon={<Key className="w-4 h-4" />}>Reset Password</DropdownItem>
            <DropdownItem icon={<Shield className="w-4 h-4" />}>Manage MFA</DropdownItem>
            <DropdownDivider />
            {user.status === 'locked' ? (
              <DropdownItem icon={<Unlock className="w-4 h-4" />}>Unlock Account</DropdownItem>
            ) : (
              <DropdownItem icon={<Lock className="w-4 h-4" />}>Lock Account</DropdownItem>
            )}
            <DropdownItem icon={<Activity className="w-4 h-4" />}>View Activity</DropdownItem>
            <DropdownDivider />
            <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger onClick={() => setShowDelete(true)}>
              Delete User
            </DropdownItem>
          </Dropdown>
        </td>
      </motion.tr>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => setShowDelete(false)}
        type="danger"
        title="Delete User"
        message={`Are you sure you want to delete "${user.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  const filteredUsers = mockUsers.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: mockUsers.length,
    active: mockUsers.filter((u) => u.status === 'active').length,
    admins: mockUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length,
    mfaEnabled: mockUsers.filter((u) => u.mfaEnabled).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={cn('text-2xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>User Management</h1>
          <p className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>Manage users, roles, and permissions</p>
        </div>
        <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowInvite(true)}>
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.total}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Total Users</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.active}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Active</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.admins}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Admins</p>
          </div>
        </Card>
        <Card padding className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{stats.mfaEnabled}</p>
            <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>MFA Enabled</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm border',
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
          )}
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="operator">Operator</option>
          <option value="viewer">Viewer</option>
          <option value="custom">Custom</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as UserStatus | 'all')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm border',
            isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
          )}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(
                'border-b text-left text-sm',
                isLight ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-400'
              )}>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Teams</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">MFA</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <UserRow key={user.id} user={user} onEdit={() => setShowEdit(true)} />
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="py-12">
              <Empty
                icon={<Users className="w-8 h-8" />}
                title="No users found"
                description="Invite users or adjust your filters"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Invite User Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite User" size="md">
        <div className="space-y-4">
          <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
            Send an invitation email to add a new user to the platform.
          </p>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Email Address
            </label>
            <Input type="email" placeholder="user@example.com" />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Full Name
            </label>
            <Input placeholder="John Doe" />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Role
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )}>
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Teams
            </label>
            <select className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
            )} multiple>
              <option value="devops">DevOps</option>
              <option value="development">Development</option>
              <option value="platform">Platform Team</option>
              <option value="qa">QA Team</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="require-mfa" className="rounded" />
            <label htmlFor="require-mfa" className={cn('text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}>
              Require MFA setup on first login
            </label>
          </div>

          <div className={cn(
            'flex justify-end gap-3 pt-4 border-t',
            isLight ? 'border-gray-200' : 'border-gray-700'
          )}>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button leftIcon={<Send className="w-4 h-4" />}>Send Invitation</Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit User" size="lg">
        <div className="space-y-6">
          <Tabs>
            <Tab active>Profile</Tab>
            <Tab>Permissions</Tab>
            <Tab>Security</Tab>
            <Tab>Activity</Tab>
          </Tabs>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name="John Smith" size="xl" />
              <div>
                <Button variant="secondary" size="sm">Change Avatar</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Full Name
                </label>
                <Input defaultValue="John Smith" />
              </div>
              <div>
                <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Email
                </label>
                <Input type="email" defaultValue="john.smith@example.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Role
                </label>
                <select className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm',
                  isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
                )}>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className={cn('block text-sm font-medium mb-1.5', isLight ? 'text-gray-700' : 'text-gray-300')}>
                  Status
                </label>
                <select className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm',
                  isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
                )}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cn(
            'flex justify-end gap-3 pt-4 border-t',
            isLight ? 'border-gray-200' : 'border-gray-700'
          )}>
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
