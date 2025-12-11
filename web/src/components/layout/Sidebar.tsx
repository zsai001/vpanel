import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  Container,
  Globe,
  Database,
  FolderOpen,
  Terminal,
  Clock,
  Shield,
  Package,
  Puzzle,
  Settings,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  children?: { title: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    title: 'Docker',
    icon: Container,
    children: [
      { title: 'Containers', path: '/docker/containers' },
      { title: 'Images', path: '/docker/images' },
      { title: 'Networks', path: '/docker/networks' },
      { title: 'Volumes', path: '/docker/volumes' },
      { title: 'Compose', path: '/docker/compose' },
    ],
  },
  {
    title: 'Nginx',
    icon: Globe,
    children: [
      { title: 'Sites', path: '/nginx/sites' },
      { title: 'Certificates', path: '/nginx/certificates' },
      { title: 'Logs', path: '/nginx/logs' },
    ],
  },
  {
    title: 'Database',
    icon: Database,
    children: [
      { title: 'Servers', path: '/database/servers' },
      { title: 'Backups', path: '/database/backups' },
    ],
  },
  { title: 'Files', icon: FolderOpen, path: '/files' },
  { title: 'Terminal', icon: Terminal, path: '/terminal' },
  { title: 'Cron Jobs', icon: Clock, path: '/cron/jobs' },
  { title: 'Firewall', icon: Shield, path: '/firewall/rules' },
  { title: 'Software', icon: Package, path: '/software' },
  {
    title: 'Plugins',
    icon: Puzzle,
    children: [
      { title: 'Installed', path: '/plugins' },
      { title: 'Market', path: '/plugins/market' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'Users', path: '/settings/users' },
      { title: 'Roles', path: '/settings/roles' },
      { title: 'Teams', path: '/settings/teams' },
      { title: 'System', path: '/settings/system' },
    ],
  },
  { title: 'Audit Logs', icon: FileText, path: '/logs/audit' },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const isLight = resolvedMode === 'light';

  // Auto-expand menu items that contain the current active path
  useEffect(() => {
    const activeParents = menuItems
      .filter((item) => item.children?.some((child) => location.pathname.startsWith(child.path)))
      .map((item) => item.title);
    
    if (activeParents.length > 0) {
      setExpandedItems((prev) => {
        const newItems = [...new Set([...prev, ...activeParents])];
        return newItems;
      });
    }
  }, [location.pathname]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (children: { path: string }[]) =>
    children.some((child) => location.pathname.startsWith(child.path));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-30 flex flex-col',
        'transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-64',
        isLight 
          ? 'bg-white border-r border-gray-200' 
          : 'bg-gray-900 border-r border-gray-800'
      )}
    >
      {/* Logo - Dify Style */}
      <div className={cn(
        "h-16 flex items-center justify-between px-4 border-b",
        isLight ? "border-gray-200" : "border-gray-800"
      )}>
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl dify-gradient flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-semibold text-xl dify-gradient-text overflow-hidden"
              >
                Panel
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Navigation - Dify Style */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              {item.path ? (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-blue-500/10 text-blue-600 border-l-[3px] border-blue-500 -ml-[3px] pl-[calc(0.75rem+3px)]'
                        : isLight
                          ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="truncate"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              ) : (
                <div>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isChildActive(item.children || [])
                        ? 'bg-blue-500/10 text-blue-600 border-l-[3px] border-blue-500 -ml-[3px] pl-[calc(0.75rem+3px)]'
                        : isLight
                          ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <>
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 text-left truncate"
                          >
                            {item.title}
                          </motion.span>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform',
                                expandedItems.includes(item.title) && 'rotate-180'
                              )}
                            />
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </button>

                  <AnimatePresence>
                    {!sidebarCollapsed && expandedItems.includes(item.title) && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-4 mt-1 space-y-1"
                      >
                        {item.children?.map((child) => (
                          <li key={child.path}>
                            <NavLink
                              to={child.path}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                                  isActive
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : isLight
                                      ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                )
                              }
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                              {child.title}
                            </NavLink>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse button - Dify style */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-lg",
          isLight
            ? "bg-white border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-700"
        )}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}

