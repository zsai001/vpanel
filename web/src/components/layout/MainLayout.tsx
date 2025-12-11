import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/utils/cn';

export default function MainLayout() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isLight = resolvedMode === 'light';

  return (
    <div className={cn("min-h-screen", isLight ? "bg-gray-50" : "bg-gray-950")}>
      {/* Background effects - Dify Style */}
      <div className={cn(
        "fixed inset-0 pointer-events-none",
        isLight 
          ? "bg-gradient-to-br from-gray-100 via-white to-gray-100"
          : "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      )} />
      <div className={cn(
        "fixed top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none",
        isLight ? "bg-blue-500/5" : "bg-blue-500/5"
      )} />
      <div className={cn(
        "fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none",
        isLight ? "bg-purple-500/5" : "bg-purple-500/5"
      )} />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <motion.div
        className="transition-all duration-300"
        style={{
          marginLeft: sidebarCollapsed ? '80px' : '256px',
        }}
      >
        <Header />
        
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}

