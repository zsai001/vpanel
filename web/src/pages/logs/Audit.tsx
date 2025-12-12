import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Clock,
  Globe,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  SearchInput,
  Empty,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme';
import * as auditApi from '@/api/audit';
import type { AuditLog, AuditLogQuery, AuditStats } from '@/api/audit';

// Action type colors
const actionColors: Record<string, string> = {
  login: 'bg-green-500/10 text-green-500',
  logout: 'bg-gray-500/10 text-gray-500',
  create: 'bg-blue-500/10 text-blue-500',
  update: 'bg-amber-500/10 text-amber-500',
  delete: 'bg-red-500/10 text-red-500',
  view: 'bg-purple-500/10 text-purple-500',
  export: 'bg-cyan-500/10 text-cyan-500',
  import: 'bg-indigo-500/10 text-indigo-500',
  start: 'bg-green-500/10 text-green-500',
  stop: 'bg-red-500/10 text-red-500',
  restart: 'bg-amber-500/10 text-amber-500',
  enable: 'bg-green-500/10 text-green-500',
  disable: 'bg-gray-500/10 text-gray-500',
};

// Resource type icons/colors
const resourceColors: Record<string, string> = {
  auth: 'bg-purple-500/10 text-purple-500',
  user: 'bg-blue-500/10 text-blue-500',
  container: 'bg-cyan-500/10 text-cyan-500',
  image: 'bg-indigo-500/10 text-indigo-500',
  site: 'bg-green-500/10 text-green-500',
  database: 'bg-amber-500/10 text-amber-500',
  file: 'bg-gray-500/10 text-gray-500',
  firewall: 'bg-red-500/10 text-red-500',
  cron: 'bg-orange-500/10 text-orange-500',
  settings: 'bg-slate-500/10 text-slate-500',
};

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';
  const [expanded, setExpanded] = useState(false);

  const actionColor = actionColors[log.action.toLowerCase()] || 'bg-gray-500/10 text-gray-500';
  const resourceColor = resourceColors[log.resource.toLowerCase()] || 'bg-gray-500/10 text-gray-500';

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'border-b transition-colors cursor-pointer',
          isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-800 hover:bg-gray-800/50'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {log.status === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
              {formatTimeAgo(log.created_at)}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isLight ? 'bg-gray-100' : 'bg-gray-800'
            )}>
              <User className="w-4 h-4" />
            </div>
            <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>
              {log.username || 'System'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={actionColor}>
            {log.action}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <Badge className={resourceColor}>
            {log.resource}
          </Badge>
          {log.resource_id && (
            <span className={cn('ml-2 text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
              #{log.resource_id.substring(0, 8)}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-gray-400" />
            <span className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
              {log.ip_address || '-'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
            {log.status}
          </Badge>
        </td>
      </motion.tr>
      {expanded && log.details && Object.keys(log.details).length > 0 && (
        <tr className={cn(
          'border-b',
          isLight ? 'bg-gray-50 border-gray-100' : 'bg-gray-900/50 border-gray-800'
        )}>
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className={cn(isLight ? 'text-gray-500' : 'text-gray-400')}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDateTime(log.created_at)}
                </span>
                {log.user_agent && (
                  <span className={cn('text-xs', isLight ? 'text-gray-400' : 'text-gray-500')}>
                    {log.user_agent.substring(0, 50)}...
                  </span>
                )}
              </div>
              <div className={cn(
                'p-3 rounded-lg text-sm font-mono overflow-x-auto',
                isLight ? 'bg-gray-100' : 'bg-gray-800'
              )}>
                <pre className={isLight ? 'text-gray-700' : 'text-gray-300'}>
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResource, setFilterResource] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  // Load data
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAction, filterResource, filterStatus]);

  useEffect(() => {
    loadFilters();
    loadStats();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        loadData();
      } else {
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      const query: AuditLogQuery = {
        page,
        page_size: pageSize,
      };
      
      if (search) query.search = search;
      if (filterAction) query.action = filterAction;
      if (filterResource) query.resource = filterResource;
      if (filterStatus) query.status = filterStatus;
      
      const result = await auditApi.listAuditLogs(query);
      setLogs(result.logs || []);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const data = await auditApi.getAuditStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load audit stats:', err);
    }
  }

  async function loadFilters() {
    try {
      const [actionsData, resourcesData] = await Promise.all([
        auditApi.getAuditActions(),
        auditApi.getAuditResources(),
      ]);
      setActions(actionsData || []);
      setResources(resourcesData || []);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }

  function handleRefresh() {
    loadData();
    loadStats();
  }

  function handleClearFilters() {
    setSearch('');
    setFilterAction('');
    setFilterResource('');
    setFilterStatus('');
    setPage(1);
  }

  const hasFilters = search || filterAction || filterResource || filterStatus;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={cn('text-2xl font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            Audit Logs
          </h1>
          <p className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>
            Track and review all system activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={cn(
          'mb-4 p-4 rounded-lg flex items-center gap-2',
          isLight ? 'bg-red-50 text-red-700' : 'bg-red-900/20 text-red-400'
        )}>
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card padding className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                {stats.total_logs.toLocaleString()}
              </p>
              <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Total Logs</p>
            </div>
          </Card>
          <Card padding className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                {stats.today_logs.toLocaleString()}
              </p>
              <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Today</p>
            </div>
          </Card>
          <Card padding className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                {stats.failed_actions.toLocaleString()}
              </p>
              <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Failed</p>
            </div>
          </Card>
          <Card padding className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
                {stats.unique_users.toLocaleString()}
              </p>
              <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>Active Users</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card padding className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <SearchInput
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm border',
                isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
              )}
            >
              <option value="">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <select
              value={filterResource}
              onChange={(e) => {
                setFilterResource(e.target.value);
                setPage(1);
              }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm border',
                isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
              )}
            >
              <option value="">All Resources</option>
              {resources.map((resource) => (
                <option key={resource} value={resource}>{resource}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm border',
                isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'
              )}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            {hasFilters && (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    'border-b text-left text-sm',
                    isLight ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-400'
                  )}>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Resource</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <AuditLogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && !loading && (
                <div className="py-12">
                  <Empty
                    icon={<FileText className="w-8 h-8" />}
                    title="No audit logs found"
                    description={hasFilters ? "Try adjusting your filters" : "Audit logs will appear here as users perform actions"}
                  />
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={cn(
                'flex items-center justify-between px-4 py-3 border-t',
                isLight ? 'border-gray-200' : 'border-gray-700'
              )}>
                <div className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} logs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className={cn('text-sm px-2', isLight ? 'text-gray-600' : 'text-gray-400')}>
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
