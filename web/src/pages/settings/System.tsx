import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Globe,
  Shield,
  Bell,
  Database,
  Server,
  Moon,
  Sun,
  Save,
  RefreshCw,
  Key,
  Mail,
  Webhook,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Input,
  Select,
  Switch,
  Badge,
} from '@/components/ui';

export default function SystemSettings() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark-100">System Settings</h1>
          <p className="text-dark-400">Configure system preferences</p>
        </div>
        <Button leftIcon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabList className="mb-6">
          <Tab value="general" icon={<Settings className="w-4 h-4" />}>General</Tab>
          <Tab value="security" icon={<Shield className="w-4 h-4" />}>Security</Tab>
          <Tab value="notifications" icon={<Bell className="w-4 h-4" />}>Notifications</Tab>
          <Tab value="backup" icon={<Database className="w-4 h-4" />}>Backup</Tab>
          <Tab value="advanced" icon={<Server className="w-4 h-4" />}>Advanced</Tab>
        </TabList>

        {/* General Settings */}
        <TabPanel value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Site Information</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Site Name</label>
                    <Input defaultValue="VPanel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Site URL</label>
                    <Input defaultValue="https://panel.example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
                  <Input defaultValue="Server Management Panel" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Appearance</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Theme</label>
                    <Select defaultValue="dark">
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Language</label>
                    <Select defaultValue="en">
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Timezone</label>
                  <Select defaultValue="UTC">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Authentication</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Switch label="Enable Two-Factor Authentication (2FA)" defaultChecked />
                <Switch label="Require 2FA for all users" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Session Timeout (minutes)</label>
                    <Input type="number" defaultValue="30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Max Login Attempts</label>
                    <Input type="number" defaultValue="5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">OAuth Providers</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-dark-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-dark-100">GitHub</h4>
                        <p className="text-sm text-dark-500">OAuth login with GitHub</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-400 mb-1">Client ID</label>
                      <Input placeholder="Enter client ID" />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-400 mb-1">Client Secret</label>
                      <Input type="password" placeholder="Enter client secret" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-dark-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-dark-100">Google</h4>
                        <p className="text-sm text-dark-500">OAuth login with Google</p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">API Keys</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg">
                    <div>
                      <p className="font-medium text-dark-200">Admin API Key</p>
                      <p className="text-sm text-dark-500">Created 30 days ago</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-dark-700 rounded text-sm text-dark-300">sk-••••••••••••••••</code>
                      <Button size="sm" variant="ghost">Regenerate</Button>
                    </div>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="mt-4" leftIcon={<Key className="w-4 h-4" />}>
                  Create New API Key
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Notifications Settings */}
        <TabPanel value="notifications">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Email Notifications</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Switch label="Enable email notifications" defaultChecked />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">SMTP Host</label>
                    <Input placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">SMTP Port</label>
                    <Input type="number" defaultValue="587" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">SMTP Username</label>
                    <Input placeholder="username" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">SMTP Password</label>
                    <Input type="password" placeholder="password" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">From Email</label>
                  <Input placeholder="noreply@example.com" />
                </div>
                <Button variant="secondary" size="sm" leftIcon={<Mail className="w-4 h-4" />}>
                  Send Test Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Alert Types</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <Switch label="CPU usage alerts" defaultChecked />
                <Switch label="Memory usage alerts" defaultChecked />
                <Switch label="Disk space alerts" defaultChecked />
                <Switch label="Service down alerts" defaultChecked />
                <Switch label="SSL certificate expiry alerts" defaultChecked />
                <Switch label="Security alerts" defaultChecked />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Webhook Integration</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Switch label="Enable webhooks" />
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Webhook URL</label>
                  <Input placeholder="https://example.com/webhook" />
                </div>
                <Button variant="secondary" size="sm" leftIcon={<Webhook className="w-4 h-4" />}>
                  Test Webhook
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Backup Settings */}
        <TabPanel value="backup">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Automatic Backups</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Switch label="Enable automatic backups" defaultChecked />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Backup Schedule</label>
                    <Select defaultValue="daily">
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Retention (days)</label>
                    <Input type="number" defaultValue="30" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Backup Time</label>
                  <Input type="time" defaultValue="02:00" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Backup Storage</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Storage Type</label>
                  <Select defaultValue="local">
                    <option value="local">Local Storage</option>
                    <option value="s3">Amazon S3</option>
                    <option value="gcs">Google Cloud Storage</option>
                    <option value="azure">Azure Blob Storage</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Backup Path</label>
                  <Input defaultValue="/opt/vpanel/backups" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Recent Backups</h3>
                <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Backup Now
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'backup-2024-01-16-02-00.tar.gz', size: '245 MB', time: 'Today, 02:00 AM' },
                    { name: 'backup-2024-01-15-02-00.tar.gz', size: '243 MB', time: 'Yesterday, 02:00 AM' },
                    { name: 'backup-2024-01-14-02-00.tar.gz', size: '241 MB', time: '2 days ago' },
                  ].map((backup, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg">
                      <div>
                        <p className="text-sm text-dark-200 font-mono">{backup.name}</p>
                        <p className="text-xs text-dark-500">{backup.time} • {backup.size}</p>
                      </div>
                      <Button size="sm" variant="ghost">Download</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Advanced Settings */}
        <TabPanel value="advanced">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Server Configuration</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Server Port</label>
                    <Input type="number" defaultValue="8080" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Max Upload Size (MB)</label>
                    <Input type="number" defaultValue="100" />
                  </div>
                </div>
                <Switch label="Enable HTTPS" defaultChecked />
                <Switch label="Enable API rate limiting" defaultChecked />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-medium text-dark-100">Logging</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Log Level</label>
                  <Select defaultValue="info">
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Log Retention (days)</label>
                  <Input type="number" defaultValue="30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-500/30">
              <CardHeader>
                <h3 className="font-medium text-red-400">Danger Zone</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
                  <div>
                    <p className="font-medium text-dark-100">Reset All Settings</p>
                    <p className="text-sm text-dark-500">Reset all settings to default values</p>
                  </div>
                  <Button variant="danger" size="sm">Reset</Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
                  <div>
                    <p className="font-medium text-dark-100">Clear All Data</p>
                    <p className="text-sm text-dark-500">Delete all data including logs and backups</p>
                  </div>
                  <Button variant="danger" size="sm">Clear</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
