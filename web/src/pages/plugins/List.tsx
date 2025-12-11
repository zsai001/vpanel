import { motion } from 'framer-motion';

export default function PluginList() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Installed Plugins</h1>
        <p className="page-subtitle">Manage your plugins</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center">
        <p className="text-dark-400">Plugin management coming soon</p>
      </motion.div>
    </div>
  );
}

