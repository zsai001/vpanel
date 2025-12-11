import { motion } from 'framer-motion';

export default function PluginMarket() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Plugin Market</h1>
        <p className="page-subtitle">Discover and install plugins</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center">
        <p className="text-dark-400">Plugin market coming soon</p>
      </motion.div>
    </div>
  );
}

