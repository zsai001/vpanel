import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Globe,
  Lock,
  Unlock,
  MoreVertical,
  Play,
  Pause,
  Settings,
  Trash2,
  ExternalLink,
  RefreshCw,
  Shield,
  Zap,
  Server,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  SearchInput,
  Dropdown,
  DropdownItem,
  DropdownDivider,
  Modal,
  ConfirmModal,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  StatusDot,
  Empty,
  Input,
  Select,
  Switch,
} from '@/components/ui';
import { cn } from '@/utils/cn';

interface Site {
  id: string;
  domain: string;
  aliases: string[];
  ssl: boolean;
  sslExpiry?: string;
  status: 'active' | 'disabled';
  type: 'static' | 'proxy' | 'php';
  proxyTarget?: string;
  rootPath?: string;
  phpVersion?: string;
  traffic: { requests: number; bandwidth: string };
  created: string;
}

const mockSites: Site[] = [
  {
    id: '1',
    domain: 'example.com',
    aliases: ['www.example.com'],
    ssl: true,
    sslExpiry: '2024-06-15',
    status: 'active',
    type: 'static',
    rootPath: '/var/www/example.com',
    traffic: { requests: 125000, bandwidth: '2.5 GB' },
    created: '2024-01-01',
  },
  {
    id: '2',
    domain: 'api.example.com',
    aliases: [],
    ssl: true,
    sslExpiry: '2024-06-15',
    status: 'active',
    type: 'proxy',
    proxyTarget: 'http://localhost:3000',
    traffic: { requests: 450000, bandwidth: '8.2 GB' },
    created: '2024-01-05',
  },
  {
    id: '3',
    domain: 'blog.example.com',
    aliases: [],
    ssl: false,
    status: 'active',
    type: 'php',
    rootPath: '/var/www/blog',
    phpVersion: '8.2',
    traffic: { requests: 85000, bandwidth: '1.8 GB' },
    created: '2024-01-10',
  },
  {
    id: '4',
    domain: 'staging.example.com',
    aliases: [],
    ssl: true,
    sslExpiry: '2024-07-20',
    status: 'disabled',
    type: 'proxy',
    proxyTarget: 'http://localhost:4000',
    traffic: { requests: 5000, bandwidth: '120 MB' },
    created: '2024-01-15',
  },
];

function SiteCard({ site }: { site: Site }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const typeIcons = {
    static: <Server className="w-4 h-4" />,
    proxy: <Zap className="w-4 h-4" />,
    php: <Globe className="w-4 h-4" />,
  };

  const typeLabels = {
    static: 'Static',
    proxy: 'Reverse Proxy',
    php: 'PHP',
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 hover:border-dark-600/50 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              site.status === 'active' ? 'bg-green-500/20' : 'bg-dark-700'
            )}>
              <Globe className={cn('w-6 h-6', site.status === 'active' ? 'text-green-400' : 'text-dark-500')} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-dark-100">{site.domain}</h3>
                <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer" className="text-dark-500 hover:text-primary-400">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              {site.aliases.length > 0 && (
                <p className="text-sm text-dark-500">{site.aliases.join(', ')}</p>
              )}
            </div>
          </div>
          <Dropdown
            trigger={
              <button className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem icon={<Settings className="w-4 h-4" />} onClick={() => setShowEdit(true)}>
              Edit Configuration
            </DropdownItem>
            <DropdownItem icon={site.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}>
              {site.status === 'active' ? 'Disable' : 'Enable'}
            </DropdownItem>
            <DropdownItem icon={<RefreshCw className="w-4 h-4" />}>Reload</DropdownItem>
            {!site.ssl && (
              <DropdownItem icon={<Shield className="w-4 h-4" />}>Enable SSL</DropdownItem>
            )}
            <DropdownDivider />
            <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger onClick={() => setShowDelete(true)}>
              Delete
            </DropdownItem>
          </Dropdown>
        </div>

        {/* Status & Type */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={site.status === 'active' ? 'success' : 'gray'} dot>
            {site.status}
          </Badge>
          <Badge variant="primary">
            {typeIcons[site.type]}
            <span className="ml-1">{typeLabels[site.type]}</span>
          </Badge>
          {site.ssl ? (
            <Badge variant="success">
              <Lock className="w-3 h-3 mr-1" />
              SSL
            </Badge>
          ) : (
            <Badge variant="warning">
              <Unlock className="w-3 h-3 mr-1" />
              No SSL
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm mb-4">
          {site.type === 'proxy' && site.proxyTarget && (
            <div className="flex items-center justify-between">
              <span className="text-dark-500">Proxy to</span>
              <span className="text-dark-300 font-mono">{site.proxyTarget}</span>
            </div>
          )}
          {site.type !== 'proxy' && site.rootPath && (
            <div className="flex items-center justify-between">
              <span className="text-dark-500">Root</span>
              <span className="text-dark-300 font-mono">{site.rootPath}</span>
            </div>
          )}
          {site.phpVersion && (
            <div className="flex items-center justify-between">
              <span className="text-dark-500">PHP Version</span>
              <span className="text-dark-300">{site.phpVersion}</span>
            </div>
          )}
          {site.ssl && site.sslExpiry && (
            <div className="flex items-center justify-between">
              <span className="text-dark-500">SSL Expires</span>
              <span className="text-dark-300">{site.sslExpiry}</span>
            </div>
          )}
        </div>

        {/* Traffic stats */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dark-700">
          <div>
            <p className="text-xs text-dark-500 mb-1">Requests (30d)</p>
            <p className="text-lg font-semibold text-dark-100">{site.traffic.requests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 mb-1">Bandwidth (30d)</p>
            <p className="text-lg font-semibold text-dark-100">{site.traffic.bandwidth}</p>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirm */}
      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => setShowDelete(false)}
        type="danger"
        title="Delete Site"
        message={`Are you sure you want to delete "${site.domain}"? This will remove all configuration files.`}
        confirmText="Delete"
      />

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Site Configuration" size="lg">
        <Tabs defaultValue="general">
          <TabList className="mb-4">
            <Tab value="general">General</Tab>
            <Tab value="ssl">SSL</Tab>
            <Tab value="advanced">Advanced</Tab>
          </TabList>

          <TabPanel value="general">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Domain</label>
                <Input defaultValue={site.domain} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Aliases (comma separated)</label>
                <Input defaultValue={site.aliases.join(', ')} placeholder="www.example.com, app.example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Site Type</label>
                <Select defaultValue={site.type}>
                  <option value="static">Static Files</option>
                  <option value="proxy">Reverse Proxy</option>
                  <option value="php">PHP Application</option>
                </Select>
              </div>
              {site.type === 'proxy' && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Proxy Target</label>
                  <Input defaultValue={site.proxyTarget} placeholder="http://localhost:3000" />
                </div>
              )}
              {site.type !== 'proxy' && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Document Root</label>
                  <Input defaultValue={site.rootPath} placeholder="/var/www/html" />
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value="ssl">
            <div className="space-y-4">
              <Switch label="Enable SSL" checked={site.ssl} />
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">SSL Provider</label>
                <Select defaultValue="letsencrypt">
                  <option value="letsencrypt">Let's Encrypt (Free)</option>
                  <option value="custom">Custom Certificate</option>
                </Select>
              </div>
              <Switch label="Force HTTPS" checked={true} />
              <Switch label="HTTP/2" checked={true} />
            </div>
          </TabPanel>

          <TabPanel value="advanced">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Custom Nginx Configuration</label>
                <textarea
                  className="w-full h-32 px-4 py-2.5 bg-dark-900/50 border border-dark-700 rounded-lg text-dark-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="# Add custom configuration here"
                />
              </div>
              <Switch label="Enable Gzip Compression" checked={true} />
              <Switch label="Enable Browser Caching" checked={true} />
            </div>
          </TabPanel>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-700">
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button>Save Changes</Button>
        </div>
      </Modal>
    </>
  );
}

export default function NginxSites() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const filteredSites = mockSites.filter((s) => {
    const matchesSearch = s.domain.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark-100">Sites</h1>
          <p className="text-dark-400">Manage Nginx sites and virtual hosts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Reload Nginx
          </Button>
          <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreate(true)}>
            Add Site
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding className="text-center">
          <p className="text-3xl font-bold text-dark-100">{mockSites.length}</p>
          <p className="text-sm text-dark-400">Total Sites</p>
        </Card>
        <Card padding className="text-center">
          <p className="text-3xl font-bold text-green-400">{mockSites.filter(s => s.status === 'active').length}</p>
          <p className="text-sm text-dark-400">Active</p>
        </Card>
        <Card padding className="text-center">
          <p className="text-3xl font-bold text-primary-400">{mockSites.filter(s => s.ssl).length}</p>
          <p className="text-sm text-dark-400">SSL Enabled</p>
        </Card>
        <Card padding className="text-center">
          <p className="text-3xl font-bold text-dark-100">665K</p>
          <p className="text-sm text-dark-400">Total Requests</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <Tabs defaultValue="all" onChange={setStatusFilter}>
          <TabList>
            <Tab value="all">All Sites</Tab>
            <Tab value="active">Active</Tab>
            <Tab value="disabled">Disabled</Tab>
          </TabList>
        </Tabs>
      </div>

      {/* Sites Grid */}
      {filteredSites.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredSites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card padding>
          <Empty
            icon={<Globe className="w-8 h-8 text-dark-500" />}
            title="No sites found"
            description="Add your first site to get started"
            action={
              <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowCreate(true)}>
                Add Site
              </Button>
            }
          />
        </Card>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Site" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Domain</label>
            <Input placeholder="example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Site Type</label>
            <Select>
              <option value="static">Static Files</option>
              <option value="proxy">Reverse Proxy</option>
              <option value="php">PHP Application</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Document Root</label>
            <Input placeholder="/var/www/html" />
          </div>
          <Switch label="Enable SSL with Let's Encrypt" />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button>Create Site</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
