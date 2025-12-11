import { motion } from 'framer-motion';
import { Package, Sparkles, Zap, Shield, RefreshCw } from 'lucide-react';

export default function SoftwareList() {
  const features = [
    { icon: Package, label: 'Package Management', description: 'Install, update & remove packages' },
    { icon: Zap, label: 'Quick Deploy', description: 'One-click software installation' },
    { icon: Shield, label: 'Security Updates', description: 'Automated security patching' },
    { icon: RefreshCw, label: 'Version Control', description: 'Rollback & upgrade with ease' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Software</h1>
        <p className="page-subtitle">Manage installed software</p>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="card relative overflow-hidden"
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="relative z-10 py-16 px-8">
          {/* Main content */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-purple-500/25"
            >
              <Package className="w-10 h-10 text-white" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-4"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Coming Soon</span>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-dark-100 mb-3"
            >
              Software Management
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-dark-400 max-w-md mx-auto text-lg"
            >
              A powerful software management system is being crafted to simplify your server operations.
            </motion.p>
          </div>

          {/* Feature preview cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-dark-200 text-sm mb-1">{feature.label}</h3>
                <p className="text-dark-500 text-xs">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-dark-800/80 border border-dark-700/50">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse animation-delay-200" />
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse animation-delay-400" />
              </div>
              <span className="text-sm text-dark-400">Actively in development</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

