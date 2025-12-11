import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import DockerContainers from '@/pages/docker/Containers';
import DockerImages from '@/pages/docker/Images';
import DockerNetworks from '@/pages/docker/Networks';
import DockerVolumes from '@/pages/docker/Volumes';
import DockerCompose from '@/pages/docker/Compose';
import NginxSites from '@/pages/nginx/Sites';
import NginxCertificates from '@/pages/nginx/Certificates';
import NginxLogs from '@/pages/nginx/Logs';
import DatabaseServers from '@/pages/database/Servers';
import DatabaseBackups from '@/pages/database/Backups';
import FileManager from '@/pages/files/FileManager';
import Terminal from '@/pages/Terminal';
import CronJobs from '@/pages/cron/Jobs';
import FirewallRules from '@/pages/firewall/Rules';
import SoftwareList from '@/pages/software/List';
import PluginList from '@/pages/plugins/List';
import PluginMarket from '@/pages/plugins/Market';
import Users from '@/pages/settings/Users';
import Roles from '@/pages/settings/Roles';
import Teams from '@/pages/settings/Teams';
import SystemSettings from '@/pages/settings/System';
import AuditLogs from '@/pages/logs/Audit';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  // Initialize theme on mount
  useEffect(() => {
    useThemeStore.getState();
  }, []);

  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Docker */}
        <Route path="/docker/containers" element={<DockerContainers />} />
        <Route path="/docker/images" element={<DockerImages />} />
        <Route path="/docker/networks" element={<DockerNetworks />} />
        <Route path="/docker/volumes" element={<DockerVolumes />} />
        <Route path="/docker/compose" element={<DockerCompose />} />

        {/* Nginx */}
        <Route path="/nginx/sites" element={<NginxSites />} />
        <Route path="/nginx/certificates" element={<NginxCertificates />} />
        <Route path="/nginx/logs" element={<NginxLogs />} />

        {/* Database */}
        <Route path="/database/servers" element={<DatabaseServers />} />
        <Route path="/database/backups" element={<DatabaseBackups />} />

        {/* Files */}
        <Route path="/files" element={<FileManager />} />

        {/* Terminal */}
        <Route path="/terminal" element={<Terminal />} />

        {/* Cron */}
        <Route path="/cron/jobs" element={<CronJobs />} />

        {/* Firewall */}
        <Route path="/firewall/rules" element={<FirewallRules />} />

        {/* Software */}
        <Route path="/software" element={<SoftwareList />} />

        {/* Plugins */}
        <Route path="/plugins" element={<PluginList />} />
        <Route path="/plugins/market" element={<PluginMarket />} />

        {/* Settings */}
        <Route path="/settings/users" element={<Users />} />
        <Route path="/settings/roles" element={<Roles />} />
        <Route path="/settings/teams" element={<Teams />} />
        <Route path="/settings/system" element={<SystemSettings />} />

        {/* Logs */}
        <Route path="/logs/audit" element={<AuditLogs />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

