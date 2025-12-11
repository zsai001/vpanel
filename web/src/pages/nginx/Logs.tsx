import { motion } from 'framer-motion';

export default function NginxLogs() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nginx Logs</h1>
        <p className="page-subtitle">View access and error logs</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center">
        <p className="text-dark-400">Log viewer coming soon</p>
      </motion.div>
    </div>
  );
}

