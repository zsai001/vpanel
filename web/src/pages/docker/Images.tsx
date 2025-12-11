import { motion } from 'framer-motion';
import { Download, Trash2, Plus } from 'lucide-react';

export default function DockerImages() {
  const images = [
    { id: '1', name: 'nginx', tag: 'latest', size: '142MB', created: '2 days ago' },
    { id: '2', name: 'mysql', tag: '8.0', size: '516MB', created: '1 week ago' },
    { id: '3', name: 'redis', tag: 'alpine', size: '28MB', created: '3 days ago' },
    { id: '4', name: 'node', tag: '18', size: '991MB', created: '5 days ago' },
  ];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Images</h1>
          <p className="page-subtitle">Manage Docker images</p>
        </div>
        <button className="btn-primary">
          <Download className="w-5 h-5" />
          Pull Image
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Tag</th>
              <th>Size</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image) => (
              <tr key={image.id}>
                <td className="font-medium text-dark-100">{image.name}</td>
                <td><span className="badge badge-primary">{image.tag}</span></td>
                <td className="text-dark-400">{image.size}</td>
                <td className="text-dark-400">{image.created}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="btn-icon btn-ghost text-primary-400">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button className="btn-icon btn-ghost text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

