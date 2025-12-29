import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
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
        "fixed inset-0 pointer-events-none -z-10",
        isLight 
          ? "bg-gradient-to-br from-gray-100 via-white to-gray-100"
          : "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      )} />
      <div className={cn(
        "fixed top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none -z-10",
        isLight ? "bg-blue-500/5" : "bg-blue-500/5"
      )} />
      <div className={cn(
        "fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none -z-10",
        isLight ? "bg-purple-500/5" : "bg-purple-500/5"
      )} />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className="transition-all duration-300 relative z-0 flex flex-col min-h-screen"
        style={{
          marginLeft: sidebarCollapsed ? '80px' : '256px',
        }}
      >
        <Header />
        
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

