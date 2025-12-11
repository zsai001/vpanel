import { motion } from 'framer-motion';

export default function NginxCertificates() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">SSL Certificates</h1>
        <p className="page-subtitle">Manage SSL/TLS certificates</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center">
        <p className="text-dark-400">SSL certificate management coming soon</p>
      </motion.div>
    </div>
  );
}

