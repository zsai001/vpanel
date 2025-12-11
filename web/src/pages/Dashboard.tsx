import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Container,
  Globe,
  Database,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardContent, Badge, Progress, Button } from '@/components/ui';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/utils/cn';

// Mock chart data
const cpuHistory = [
  { time: '00:00', value: 35 },
  { time: '04:00', value: 28 },
  { time: '08:00', value: 45 },
  { time: '12:00', value: 65 },
  { time: '16:00', value: 52 },
  { time: '20:00', value: 48 },
  { time: '24:00', value: 42 },
];

const memoryHistory = [
  { time: '00:00', value: 55 },
  { time: '04:00', value: 52 },
  { time: '08:00', value: 58 },
  { time: '12:00', value: 72 },
  { time: '16:00', value: 68 },
  { time: '20:00', value: 62 },
  { time: '24:00', value: 58 },
];

const networkHistory = [
  { time: '00:00', rx: 120, tx: 80 },
  { time: '04:00', rx: 85, tx: 65 },
  { time: '08:00', rx: 180, tx: 120 },
  { time: '12:00', rx: 250, tx: 180 },
  { time: '16:00', rx: 220, tx: 150 },
  { time: '20:00', rx: 190, tx: 130 },
  { time: '24:00', rx: 150, tx: 100 },
];

const containerStats = [
  { name: 'Running', value: 18, color: '#22c55e' },
  { name: 'Stopped', value: 4, color: '#64748b' },
  { name: 'Paused', value: 2, color: '#eab308' },
];

// Stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
  delay = 0,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'primary' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  delay?: number;
  href?: string;
}) {
  const navigate = useNavigate();
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn('card p-6', href && 'cursor-pointer hover:border-dark-600/50')}
      onClick={() => href && navigate(href)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          )}>
            {trend === 'up' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-dark-100 mb-1">{value}</h3>
      <p className="text-dark-400">{title}</p>
      {subtitle && <p className="text-sm text-dark-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

// Resource gauge component
function ResourceGauge({
  title,
  value,
  total,
  unit,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  total: number;
  unit: string;
  icon: React.ElementType;
  color: string;
}) {
  const percentage = (value / total) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-dark-800"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-5 h-5 text-dark-400 mb-1" />
          <span className="text-xl font-bold text-dark-100">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-dark-400">{title}</p>
      <p className="text-xs text-dark-500">{value.toFixed(1)} / {total} {unit}</p>
    </div>
  );
}

// Alert item
function AlertItem({
  severity,
  title,
  time,
  node,
}: {
  severity: 'warning' | 'critical' | 'info';
  title: string;
  time: string;
  node?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-dark-800/50 rounded-lg transition-colors cursor-pointer">
      {severity === 'critical' ? (
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
      ) : severity === 'warning' ? (
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-blue-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-dark-200">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {node && <Badge variant="gray" size="sm">{node}</Badge>}
          <span className="text-xs text-dark-500">{time}</span>
        </div>
      </div>
    </div>
  );
}

// Quick action card
function QuickAction({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/50 cursor-pointer hover:border-dark-600/50 transition-all"
      onClick={() => navigate(href)}
    >
      <Icon className="w-6 h-6 text-primary-400 mb-2" />
      <h4 className="font-medium text-dark-100 mb-1">{title}</h4>
      <p className="text-xs text-dark-500">{description}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('24h');

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark-100">Dashboard</h1>
          <p className="text-dark-400">Overview of your server infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Nodes"
          value={5}
          subtitle="3 online, 2 offline"
          icon={Server}
          color="primary"
          delay={0}
          href="/nodes"
        />
        <StatCard
          title="Containers"
          value={24}
          subtitle="18 running"
          icon={Container}
          trend="up"
          trendValue="+3"
          color="blue"
          delay={0.1}
          href="/docker/containers"
        />
        <StatCard
          title="Websites"
          value={12}
          subtitle="All healthy"
          icon={Globe}
          color="green"
          delay={0.2}
          href="/nginx/sites"
        />
        <StatCard
          title="Databases"
          value={8}
          subtitle="MySQL, PostgreSQL, Redis"
          icon={Database}
          color="purple"
          delay={0.3}
          href="/database/servers"
        />
      </div>

      {/* Charts & Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* CPU & Memory Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                <h2 className="font-semibold text-dark-100">System Performance</h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-500" />
                  CPU
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  Memory
                </span>
              </div>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#06b6d4"
                    fill="url(#cpuGradient)"
                    strokeWidth={2}
                    name="CPU"
                  />
                  <Area
                    type="monotone"
                    data={memoryHistory}
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="url(#memGradient)"
                    strokeWidth={2}
                    name="Memory"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resource Gauges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-dark-100">Resource Usage</h2>
              <Badge variant="success">Healthy</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <ResourceGauge
                  title="CPU"
                  value={45.2}
                  total={100}
                  unit="%"
                  icon={Cpu}
                  color="#06b6d4"
                />
                <ResourceGauge
                  title="Memory"
                  value={12.4}
                  total={32}
                  unit="GB"
                  icon={MemoryStick}
                  color="#8b5cf6"
                />
                <ResourceGauge
                  title="Disk"
                  value={234}
                  total={500}
                  unit="GB"
                  icon={HardDrive}
                  color="#22c55e"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Network & Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Network Traffic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                <h2 className="font-semibold text-dark-100">Network Traffic</h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Download
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  Upload
                </span>
              </div>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkHistory}>
                  <defs>
                    <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="rx" stroke="#22c55e" fill="url(#rxGradient)" strokeWidth={2} name="Download" />
                  <Area type="monotone" dataKey="tx" stroke="#3b82f6" fill="url(#txGradient)" strokeWidth={2} name="Upload" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Container Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-dark-100">Containers</h2>
              <span className="text-sm text-dark-400">24 total</span>
            </CardHeader>
            <CardContent>
              <div className="h-36 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={containerStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {containerStats.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {containerStats.map((stat) => (
                  <div key={stat.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-dark-400">{stat.name}</span>
                    <span className="text-dark-100 font-medium">{stat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h2 className="font-semibold text-dark-100">Recent Alerts</h2>
              </div>
              <Badge variant="danger">2 critical</Badge>
            </CardHeader>
            <CardContent className="p-2">
              <AlertItem
                severity="critical"
                title="High CPU usage (95%)"
                time="5 minutes ago"
                node="prod-01"
              />
              <AlertItem
                severity="critical"
                title="Disk space low (92%)"
                time="15 minutes ago"
                node="db-01"
              />
              <AlertItem
                severity="warning"
                title="Memory usage high (78%)"
                time="1 hour ago"
                node="prod-02"
              />
              <AlertItem
                severity="info"
                title="SSL certificate renewed"
                time="2 hours ago"
                node="prod-01"
              />
              <AlertItem
                severity="info"
                title="Backup completed successfully"
                time="3 hours ago"
                node="backup-01"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-dark-100">Quick Actions</h2>
              <Zap className="w-5 h-5 text-primary-400" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction
                  icon={Container}
                  title="New Container"
                  description="Create Docker container"
                  href="/docker/containers"
                />
                <QuickAction
                  icon={Globe}
                  title="Add Site"
                  description="Configure new website"
                  href="/nginx/sites"
                />
                <QuickAction
                  icon={Database}
                  title="Create Database"
                  description="Add new database"
                  href="/database/servers"
                />
                <QuickAction
                  icon={Server}
                  title="Add Node"
                  description="Connect new server"
                  href="/nodes"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
