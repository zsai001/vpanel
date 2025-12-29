/**
 * Frontend Plugin Registry
 *
 * This module provides a central registry for all frontend plugins.
 * It allows plugins to register their routes, components, and menu items.
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Plugin route definition
export interface PluginRoute {
  path: string;
  component: LazyExoticComponent<ComponentType<unknown>>;
  title?: string;
  exact?: boolean;
}

// Plugin menu item definition
export interface PluginMenuItem {
  id: string;
  title: string;
  icon: string;
  path: string;
  order?: number;
  parent?: string;
  children?: PluginMenuItem[];
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger';
}

// Plugin definition
export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  routes: PluginRoute[];
  menuItems: PluginMenuItem[];
  enabled: boolean;
}

// Plugin registry
class PluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();

  // Register a plugin
  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
  }

  // Get a plugin by ID
  get(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  // Get all plugins
  getAll(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  // Get all enabled plugins
  getEnabled(): PluginDefinition[] {
    return this.getAll().filter((p) => p.enabled);
  }

  // Get all routes from enabled plugins
  getAllRoutes(): PluginRoute[] {
    return this.getEnabled().flatMap((p) => p.routes);
  }

  // Get all menu items from enabled plugins
  getAllMenuItems(): PluginMenuItem[] {
    return this.getEnabled().flatMap((p) => p.menuItems);
  }

  // Enable a plugin
  enable(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = true;
    }
  }

  // Disable a plugin
  disable(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
    }
  }
}

// Global registry instance
export const pluginRegistry = new PluginRegistry();

// ============================================================================
// BUILTIN PLUGIN REGISTRATIONS
// ============================================================================

// Monitor Plugin
pluginRegistry.register({
  id: 'monitor',
  name: 'System Monitor',
  version: '1.0.0',
  description: 'System monitoring and dashboard',
  enabled: true,
  routes: [
    {
      path: '/',
      component: lazy(() => import('@plugins/monitor/frontend/pages/Dashboard')),
      title: 'Dashboard',
    },
    {
      path: '/dashboard',
      component: lazy(() => import('@plugins/monitor/frontend/pages/Dashboard')),
      title: 'Dashboard',
    },
  ],
  menuItems: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'LayoutDashboard',
      path: '/dashboard',
      order: 0,
    },
  ],
});

// Docker Plugin - uses internal routing
pluginRegistry.register({
  id: 'docker',
  name: 'Docker',
  version: '1.0.0',
  description: 'Docker container management',
  enabled: true,
  routes: [
    {
      // Single wildcard route - plugin handles all sub-routes internally
      path: '/docker/*',
      component: lazy(() => import('@plugins/docker/frontend/routes')),
      title: 'Docker',
    },
  ],
  menuItems: [
    {
      id: 'docker',
      title: 'Docker',
      icon: 'Box',
      path: '/docker/containers',
      order: 10,
      children: [
        { id: 'docker-containers', title: 'Containers', icon: 'Box', path: '/docker/containers' },
        { id: 'docker-images', title: 'Images', icon: 'Layers', path: '/docker/images' },
        { id: 'docker-networks', title: 'Networks', icon: 'Network', path: '/docker/networks' },
        { id: 'docker-volumes', title: 'Volumes', icon: 'HardDrive', path: '/docker/volumes' },
        { id: 'docker-compose', title: 'Compose', icon: 'FileCode', path: '/docker/compose' },
      ],
    },
  ],
});

// Files Plugin
pluginRegistry.register({
  id: 'files',
  name: 'File Manager',
  version: '1.0.0',
  description: 'File system management',
  enabled: true,
  routes: [
    {
      path: '/files',
      component: lazy(() => import('@plugins/files/frontend/pages/FileManager')),
      title: 'File Manager',
    },
  ],
  menuItems: [
    {
      id: 'files',
      title: 'Files',
      icon: 'FolderOpen',
      path: '/files',
      order: 20,
    },
  ],
});

// Terminal Plugin
pluginRegistry.register({
  id: 'terminal',
  name: 'Terminal',
  version: '1.0.0',
  description: 'Web terminal',
  enabled: true,
  routes: [
    {
      path: '/terminal',
      component: lazy(() => import('@plugins/terminal/frontend/pages/Terminal')),
      title: 'Terminal',
    },
  ],
  menuItems: [
    {
      id: 'terminal',
      title: 'Terminal',
      icon: 'Terminal',
      path: '/terminal',
      order: 25,
    },
  ],
});

// Nginx Plugin
pluginRegistry.register({
  id: 'nginx',
  name: 'Nginx',
  version: '1.0.0',
  description: 'Nginx web server management',
  enabled: true,
  routes: [
    {
      path: '/nginx/instances',
      component: lazy(() => import('@plugins/nginx/frontend/pages/Instances')),
      title: 'Instances',
    },
    {
      path: '/nginx/sites',
      component: lazy(() => import('@plugins/nginx/frontend/pages/Sites')),
      title: 'Sites',
    },
    {
      path: '/nginx/certificates',
      component: lazy(() => import('@plugins/nginx/frontend/pages/Certificates')),
      title: 'Certificates',
    },
    {
      path: '/nginx/logs',
      component: lazy(() => import('@plugins/nginx/frontend/pages/Logs')),
      title: 'Logs',
    },
  ],
  menuItems: [
    {
      id: 'nginx',
      title: 'Nginx',
      icon: 'Server',
      path: '/nginx/instances',
      order: 30,
      children: [
        { id: 'nginx-instances', title: 'Instances', icon: 'Server', path: '/nginx/instances' },
        { id: 'nginx-sites', title: 'Sites', icon: 'Globe', path: '/nginx/sites' },
        { id: 'nginx-certs', title: 'Certificates', icon: 'Shield', path: '/nginx/certificates' },
        { id: 'nginx-logs', title: 'Logs', icon: 'FileText', path: '/nginx/logs' },
      ],
    },
  ],
});

// Database Plugin
pluginRegistry.register({
  id: 'database',
  name: 'Database',
  version: '1.0.0',
  description: 'Database management',
  enabled: true,
  routes: [
    {
      path: '/database/servers',
      component: lazy(() => import('@plugins/database/frontend/pages/Servers')),
      title: 'Servers',
    },
    {
      path: '/database/backups',
      component: lazy(() => import('@plugins/database/frontend/pages/Backups')),
      title: 'Backups',
    },
  ],
  menuItems: [
    {
      id: 'database',
      title: 'Database',
      icon: 'Database',
      path: '/database/servers',
      order: 40,
      children: [
        { id: 'db-servers', title: 'Servers', icon: 'Database', path: '/database/servers' },
        { id: 'db-backups', title: 'Backups', icon: 'Archive', path: '/database/backups' },
      ],
    },
  ],
});

// Apps Plugin
pluginRegistry.register({
  id: 'apps',
  name: 'Applications',
  version: '1.0.0',
  description: 'Application management',
  enabled: true,
  routes: [
    {
      path: '/apps',
      component: lazy(() => import('@plugins/apps/frontend/pages/List')),
      title: 'Apps',
    },
    {
      path: '/apps/create',
      component: lazy(() => import('@plugins/apps/frontend/pages/Create')),
      title: 'Create App',
    },
    {
      path: '/apps/runtimes',
      component: lazy(() => import('@plugins/apps/frontend/pages/Runtimes')),
      title: 'Runtimes',
    },
    {
      path: '/apps/:id',
      component: lazy(() => import('@plugins/apps/frontend/pages/Detail')),
      title: 'App Detail',
    },
  ],
  menuItems: [
    {
      id: 'apps',
      title: 'Applications',
      icon: 'AppWindow',
      path: '/apps',
      order: 50,
      children: [
        { id: 'apps-list', title: 'All Apps', icon: 'AppWindow', path: '/apps' },
        { id: 'apps-create', title: 'Create', icon: 'Plus', path: '/apps/create' },
        { id: 'apps-runtimes', title: 'Runtimes', icon: 'Cpu', path: '/apps/runtimes' },
      ],
    },
  ],
});

// SSL Plugin
pluginRegistry.register({
  id: 'ssl',
  name: 'SSL Certificates',
  version: '1.0.0',
  description: 'SSL/TLS certificate management',
  enabled: true,
  routes: [
    {
      path: '/ssl',
      component: lazy(() => import('@plugins/ssl/frontend/pages/List')),
      title: 'SSL Certificates',
    },
    {
      path: '/ssl/add',
      component: lazy(() => import('@plugins/ssl/frontend/pages/Add')),
      title: 'Add Certificate',
    },
    {
      path: '/ssl/:id',
      component: lazy(() => import('@plugins/ssl/frontend/pages/Detail')),
      title: 'Certificate Detail',
    },
  ],
  menuItems: [
    {
      id: 'ssl',
      title: 'SSL Certificates',
      icon: 'ShieldCheck',
      path: '/ssl',
      order: 53,
      children: [
        { id: 'ssl-list', title: 'All Certificates', icon: 'Shield', path: '/ssl' },
        { id: 'ssl-add', title: 'Add Certificate', icon: 'Plus', path: '/ssl/add' },
      ],
    },
  ],
});

// Sites Plugin
pluginRegistry.register({
  id: 'sites',
  name: 'Sites',
  version: '1.0.0',
  description: 'Website management',
  enabled: true,
  routes: [
    {
      path: '/sites',
      component: lazy(() => import('@plugins/sites/frontend/pages/List')),
      title: 'Sites',
    },
    {
      path: '/sites/add',
      component: lazy(() => import('@plugins/sites/frontend/pages/Add')),
      title: 'Add Site',
    },
    {
      path: '/sites/:id',
      component: lazy(() => import('@plugins/sites/frontend/pages/Detail')),
      title: 'Site Detail',
    },
  ],
  menuItems: [
    {
      id: 'sites',
      title: 'Sites',
      icon: 'Globe',
      path: '/sites',
      order: 55,
    },
  ],
});

// Cron Plugin
pluginRegistry.register({
  id: 'cron',
  name: 'Cron Jobs',
  version: '1.0.0',
  description: 'Scheduled task management',
  enabled: true,
  routes: [
    {
      path: '/cron/jobs',
      component: lazy(() => import('@plugins/cron/frontend/pages/Jobs')),
      title: 'Cron Jobs',
    },
  ],
  menuItems: [
    {
      id: 'cron',
      title: 'Cron Jobs',
      icon: 'Clock',
      path: '/cron/jobs',
      order: 60,
    },
  ],
});

// Firewall Plugin
pluginRegistry.register({
  id: 'firewall',
  name: 'Firewall',
  version: '1.0.0',
  description: 'Firewall rules management',
  enabled: true,
  routes: [
    {
      path: '/firewall/rules',
      component: lazy(() => import('@plugins/firewall/frontend/pages/Rules')),
      title: 'Firewall Rules',
    },
  ],
  menuItems: [
    {
      id: 'firewall',
      title: 'Firewall',
      icon: 'Shield',
      path: '/firewall/rules',
      order: 70,
    },
  ],
});

export default pluginRegistry;

