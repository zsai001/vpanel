import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { cn } from '@/utils/cn';
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const isLight = resolvedMode === 'light';

  useOnClickOutside(userMenuRef, () => setShowUserMenu(false));
  useOnClickOutside(notificationRef, () => setShowNotifications(false));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={cn(
      "h-16 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20",
      isLight 
        ? "bg-white/95 border-b border-gray-200" 
        : "bg-gray-900/80 border-b border-gray-800"
    )}>
      {/* Search - Dify Style */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
            isLight ? "text-gray-400" : "text-gray-500"
          )} />
          <input
            type="text"
            placeholder="Search..."
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
              isLight 
                ? "bg-gray-100 border border-gray-200 text-gray-900 placeholder:text-gray-400"
                : "bg-gray-800/60 border border-gray-700 text-gray-100 placeholder:text-gray-500"
            )}
          />
          <kbd className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-mono",
            isLight ? "bg-gray-200 text-gray-500" : "bg-gray-700 text-gray-400"
          )}>
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Notifications - Dify Style */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "relative p-2 rounded-lg transition-all",
              isLight 
                ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
            )}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute right-0 mt-2 w-80 rounded-xl shadow-2xl overflow-hidden",
                  isLight 
                    ? "bg-white border border-gray-200" 
                    : "bg-gray-800 border border-gray-700"
                )}
              >
                <div className={cn(
                  "p-4 border-b",
                  isLight ? "border-gray-200" : "border-gray-700"
                )}>
                  <h3 className={cn("font-semibold", isLight ? "text-gray-900" : "text-gray-100")}>
                    Notifications
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-4 text-center text-gray-500">
                    No new notifications
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu - Dify Style */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-all",
              isLight ? "hover:bg-gray-100" : "hover:bg-gray-800"
            )}
          >
            <div className="relative w-8 h-8 rounded-full dify-gradient flex items-center justify-center shadow-md shadow-blue-500/20">
              <span className="text-white font-medium text-sm">
                {user?.displayName?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className={cn("text-sm font-medium", isLight ? "text-gray-900" : "text-gray-100")}>
                {user?.displayName || user?.username}
              </p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute right-0 mt-2 w-56 rounded-xl shadow-2xl overflow-hidden",
                  isLight 
                    ? "bg-white border border-gray-200"
                    : "bg-gray-800 border border-gray-700"
                )}
              >
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/profile');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                      isLight 
                        ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        : "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                    )}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings/system');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                      isLight 
                        ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        : "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className={cn("border-t p-2", isLight ? "border-gray-200" : "border-gray-700")}>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

