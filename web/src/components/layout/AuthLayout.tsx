import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Background effects */}
      <div className="fixed inset-0 bg-mesh-gradient opacity-50 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 to-secondary-900/50" />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-2xl shadow-primary-500/30">
              <span className="text-white font-bold text-4xl">V</span>
            </div>
            
            <h1 className="text-5xl font-bold mb-4">
              <span className="gradient-text">VPanel</span>
            </h1>
            
            <p className="text-xl text-dark-300 mb-8 max-w-md">
              Enterprise Server Management Platform
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
              {[
                { icon: '🐳', title: 'Docker', desc: 'Container Management' },
                { icon: '🌐', title: 'Nginx', desc: 'Web Server Config' },
                { icon: '🗄️', title: 'Database', desc: 'DB Administration' },
                { icon: '🔌', title: 'Plugins', desc: 'Extensible System' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                  className="bg-dark-800/30 backdrop-blur-sm border border-dark-700/50 rounded-xl p-4 text-left"
                >
                  <span className="text-2xl mb-2 block">{feature.icon}</span>
                  <h3 className="font-semibold text-dark-100">{feature.title}</h3>
                  <p className="text-sm text-dark-400">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}

