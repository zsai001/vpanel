import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Edit,
  Shield,
  ShieldOff,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
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
  Input,
  Select,
  Textarea,
  Switch,
  Empty,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import * as firewallApi from '@/api/firewall';
import type { FirewallRule, FirewallStatus, CreateFirewallRuleRequest, Fail2BanJail } from '@/api/firewall';

function RuleRow({ rule, onEdit, onDelete, onToggle }: {
  rule: FirewallRule;
  onEdit: (rule: FirewallRule) => void;
  onDelete: (rule: FirewallRule) => void;
  onToggle: (rule: FirewallRule) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  const actionColors: Record<string, 'success' | 'danger'> = {
    allow: 'success',
    deny: 'danger',
  };

  const directionColors: Record<string, 'info' | 'warning'> = {
    in: 'info',
    out: 'warning',
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-2 h-2 rounded-full',
              rule.enabled ? 'bg-green-500' : 'bg-dark-500'
            )} />
            <div>
              <div className="font-medium text-dark-100">{rule.name}</div>
              {rule.description && (
                <div className="text-sm text-dark-500">{rule.description}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={directionColors[rule.direction]}>
            {rule.direction.toUpperCase()}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={actionColors[rule.action]}>
            {rule.action.toUpperCase()}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="text-sm text-dark-300">
            <div>{rule.protocol.toUpperCase()}</div>
            {rule.port && <div className="text-dark-500">{rule.port}</div>}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-dark-300">
            {rule.source || <span className="text-dark-500">Any</span>}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-dark-300">
            {rule.destination || <span className="text-dark-500">Any</span>}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-dark-300">{rule.priority}</div>
        </TableCell>
        <TableCell>
          <Switch
            checked={rule.enabled}
            onChange={() => onToggle(rule)}
          />
        </TableCell>
        <TableCell>
          <Dropdown
            trigger={
              <Button size="sm" variant="ghost" leftIcon={<MoreVertical className="w-4 h-4" />} />
            }
          >
            <DropdownItem onClick={() => onEdit(rule)}>
              <Edit className="w-4 h-4" />
              Edit
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={() => setShowDelete(true)} className="text-red-400">
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownItem>
          </Dropdown>
        </TableCell>
      </TableRow>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          await onDelete(rule);
          setShowDelete(false);
        }}
        type="danger"
        title="Delete Firewall Rule"
        message={`Are you sure you want to delete "${rule.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

function RuleFormModal({ 
  open, 
  onClose, 
  rule, 
  onSubmit 
}: { 
  open: boolean; 
  onClose: () => void; 
  rule?: FirewallRule;
  onSubmit: (data: CreateFirewallRuleRequest) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateFirewallRuleRequest>({
    node_id: '1',
    name: '',
    direction: 'in',
    action: 'allow',
    protocol: 'tcp',
    port: '',
    source: '',
    destination: '',
    priority: 100,
    enabled: true,
    description: '',
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        node_id: rule.node_id,
        name: rule.name,
        direction: rule.direction,
        action: rule.action,
        protocol: rule.protocol,
        port: rule.port || '',
        source: rule.source || '',
        destination: rule.destination || '',
        priority: rule.priority,
        enabled: rule.enabled,
        description: rule.description || '',
      });
    } else {
      setFormData({
        node_id: '1',
        name: '',
        direction: 'in',
        action: 'allow',
        protocol: 'tcp',
        port: '',
        source: '',
        destination: '',
        priority: 100,
        enabled: true,
        description: '',
      });
    }
  }, [rule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? 'Edit Firewall Rule' : 'Create Firewall Rule'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Rule Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Allow SSH"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Direction *
            </label>
            <Select
              value={formData.direction}
              onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'in' | 'out' })}
              required
            >
              <option value="in">Inbound</option>
              <option value="out">Outbound</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Action *
            </label>
            <Select
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value as 'allow' | 'deny' })}
              required
            >
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Protocol *
            </label>
            <Select
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value as any })}
              required
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="icmp">ICMP</option>
              <option value="all">All</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Port
            </label>
            <Input
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              placeholder="e.g., 22, 80-90, 443"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Source
            </label>
            <Input
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., 192.168.1.0/24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Destination
            </label>
            <Input
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="e.g., 10.0.0.0/8"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Priority
            </label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
              min={0}
              max={65535}
            />
          </div>

          <div className="flex items-end">
            <Switch
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              label="Enabled"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {rule ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function FirewallRules() {
  const [status, setStatus] = useState<FirewallStatus | null>(null);
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [jails, setJails] = useState<Fail2BanJail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<FirewallRule | undefined>();
  const [activeTab, setActiveTab] = useState<string>('rules');

  const nodeId = '1';

  // Fetch firewall status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await firewallApi.getFirewallStatus(nodeId);
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch firewall status:', error);
    }
  }, [nodeId]);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      const data = await firewallApi.listFirewallRules(nodeId);
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch firewall rules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [nodeId]);

  // Fetch Fail2Ban jails
  const fetchJails = useCallback(async () => {
    try {
      const data = await firewallApi.listFail2BanJails(nodeId);
      setJails(data);
    } catch (error) {
      console.error('Failed to fetch Fail2Ban jails:', error);
    }
  }, [nodeId]);

  useEffect(() => {
    if (nodeId) {
      fetchStatus();
      fetchRules();
      fetchJails();
    }
  }, [nodeId, fetchStatus, fetchRules, fetchJails]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStatus(), fetchRules(), fetchJails()]);
  };

  // Toggle firewall
  const handleToggleFirewall = async () => {
    if (!status) return;
    try {
      if (status.enabled) {
        await firewallApi.disableFirewall(nodeId);
        toast.success('Firewall disabled');
      } else {
        await firewallApi.enableFirewall(nodeId);
        toast.success('Firewall enabled');
      }
      await fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle firewall');
    }
  };

  // Create rule
  const handleCreateRule = async (data: CreateFirewallRuleRequest) => {
    await firewallApi.createFirewallRule(data);
    toast.success('Firewall rule created');
    await fetchRules();
    await fetchStatus();
  };

  // Update rule
  const handleUpdateRule = async (data: CreateFirewallRuleRequest) => {
    if (!editingRule) return;
    await firewallApi.updateFirewallRule(editingRule.id, data);
    toast.success('Firewall rule updated');
    setEditingRule(undefined);
    await fetchRules();
    await fetchStatus();
  };

  // Delete rule
  const handleDeleteRule = async (rule: FirewallRule) => {
    try {
      await firewallApi.deleteFirewallRule(rule.id);
      toast.success('Firewall rule deleted');
      await fetchRules();
      await fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete rule');
    }
  };

  // Toggle rule
  const handleToggleRule = async (rule: FirewallRule) => {
    try {
      await firewallApi.updateFirewallRule(rule.id, { enabled: !rule.enabled });
      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`);
      await fetchRules();
      await fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle rule');
    }
  };

  // Filtered rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch = !search || 
      rule.name.toLowerCase().includes(search.toLowerCase()) ||
      rule.description?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'enabled' && rule.enabled) ||
      (filter === 'disabled' && !rule.enabled);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Firewall Rules</h1>
          <p className="page-subtitle">Manage firewall settings and rules</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          {status && (
            <Button
              variant={status.enabled ? 'danger' : 'primary'}
              size="sm"
              leftIcon={status.enabled ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              onClick={handleToggleFirewall}
            >
              {status.enabled ? 'Disable Firewall' : 'Enable Firewall'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Firewall Status</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              {status.enabled ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-dark-500" />
              )}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Active Rules</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">{status.activeRules}</p>
              </div>
              <Info className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Blocked IPs</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">{status.blockedIPs}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="rules" onChange={setActiveTab}>
        <TabList>
          <Tab value="rules">Firewall Rules</Tab>
          <Tab value="fail2ban">Fail2Ban</Tab>
        </TabList>

        {/* Rules Tab */}
        <TabPanel value="rules">
          <div className="mt-6">
            <Card>
              <div className="p-4 border-b border-dark-700">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <SearchInput
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search rules..."
                      className="max-w-xs"
                    />
                    <Select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="w-40"
                    >
                      <option value="all">All Rules</option>
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </Select>
                  </div>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create Rule
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <Spinner />
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="p-8">
                  <Empty
                    icon={<Shield className="w-12 h-12" />}
                    title="No Rules Found"
                    description={search || filter !== 'all' ? 'Try adjusting your filters' : 'Create your first firewall rule'}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Direction</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Protocol / Port</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Destination</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Enabled</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredRules.map((rule) => (
                        <RuleRow
                          key={rule.id}
                          rule={rule}
                          onEdit={setEditingRule}
                          onDelete={handleDeleteRule}
                          onToggle={handleToggleRule}
                        />
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </TabPanel>

        {/* Fail2Ban Tab */}
        <TabPanel value="fail2ban">
          <div className="mt-6">
            <Card>
              <div className="p-4 border-b border-dark-700">
                <h3 className="text-lg font-semibold text-dark-100">Fail2Ban Jails</h3>
                <p className="text-sm text-dark-500 mt-1">Manage IP bans and jail configurations</p>
              </div>
              {jails.length === 0 ? (
                <div className="p-8">
                  <Empty
                    icon={<Shield className="w-12 h-12" />}
                    title="No Jails Found"
                    description="Fail2Ban jails will appear here when configured"
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Jail Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Banned IPs</TableCell>
                      <TableCell>Max Retry</TableCell>
                      <TableCell>Find Time</TableCell>
                      <TableCell>Ban Time</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jails.map((jail) => (
                      <TableRow key={jail.name}>
                        <TableCell>
                          <div className="font-medium text-dark-100">{jail.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={jail.enabled ? 'success' : 'gray'}>
                            {jail.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-dark-300">{jail.bannedIPs}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-dark-300">{jail.maxRetry}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-dark-300">{jail.findTime}s</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-dark-300">{jail.banTime}s</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </TabPanel>
      </Tabs>

      {/* Create/Edit Modal */}
      <RuleFormModal
        open={showCreateModal || !!editingRule}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(undefined);
        }}
        rule={editingRule}
        onSubmit={editingRule ? handleUpdateRule : handleCreateRule}
      />
    </div>
  );
}
