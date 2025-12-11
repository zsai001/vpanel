import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  File,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  ChevronRight,
  Home,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Edit,
  Copy,
  Scissors,
  MoreVertical,
  Grid,
  List,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  Card,
  SearchInput,
  Dropdown,
  DropdownItem,
  DropdownDivider,
  Modal,
  ConfirmModal,
} from '@/components/ui';
import { cn } from '@/utils/cn';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: string;
  permissions: string;
  extension?: string;
}

const mockFiles: FileItem[] = [
  { name: 'config', type: 'folder', modified: '2024-01-15', permissions: 'drwxr-xr-x' },
  { name: 'logs', type: 'folder', modified: '2024-01-16', permissions: 'drwxr-xr-x' },
  { name: 'www', type: 'folder', modified: '2024-01-14', permissions: 'drwxr-xr-x' },
  { name: 'backup', type: 'folder', modified: '2024-01-10', permissions: 'drwxr-xr-x' },
  { name: 'nginx.conf', type: 'file', size: 2048, modified: '2024-01-15', permissions: '-rw-r--r--', extension: 'conf' },
  { name: 'docker-compose.yml', type: 'file', size: 1024, modified: '2024-01-16', permissions: '-rw-r--r--', extension: 'yml' },
  { name: 'app.log', type: 'file', size: 524288, modified: '2024-01-16', permissions: '-rw-r--r--', extension: 'log' },
  { name: 'database.sql', type: 'file', size: 10485760, modified: '2024-01-14', permissions: '-rw-r--r--', extension: 'sql' },
  { name: 'backup.tar.gz', type: 'file', size: 52428800, modified: '2024-01-13', permissions: '-rw-r--r--', extension: 'gz' },
  { name: 'index.html', type: 'file', size: 4096, modified: '2024-01-15', permissions: '-rw-r--r--', extension: 'html' },
  { name: 'styles.css', type: 'file', size: 8192, modified: '2024-01-15', permissions: '-rw-r--r--', extension: 'css' },
  { name: 'script.js', type: 'file', size: 16384, modified: '2024-01-15', permissions: '-rw-r--r--', extension: 'js' },
  { name: 'logo.png', type: 'file', size: 32768, modified: '2024-01-12', permissions: '-rw-r--r--', extension: 'png' },
];

function getFileIcon(item: FileItem) {
  if (item.type === 'folder') return <Folder className="w-5 h-5 text-yellow-400" />;
  
  const iconMap: Record<string, React.ReactNode> = {
    conf: <FileCode className="w-5 h-5 text-green-400" />,
    yml: <FileCode className="w-5 h-5 text-purple-400" />,
    yaml: <FileCode className="w-5 h-5 text-purple-400" />,
    json: <FileCode className="w-5 h-5 text-yellow-400" />,
    js: <FileCode className="w-5 h-5 text-yellow-400" />,
    ts: <FileCode className="w-5 h-5 text-blue-400" />,
    html: <FileCode className="w-5 h-5 text-orange-400" />,
    css: <FileCode className="w-5 h-5 text-blue-400" />,
    log: <FileText className="w-5 h-5 text-gray-400" />,
    txt: <FileText className="w-5 h-5 text-gray-400" />,
    sql: <FileText className="w-5 h-5 text-blue-400" />,
    gz: <FileArchive className="w-5 h-5 text-red-400" />,
    zip: <FileArchive className="w-5 h-5 text-red-400" />,
    tar: <FileArchive className="w-5 h-5 text-red-400" />,
    png: <FileImage className="w-5 h-5 text-pink-400" />,
    jpg: <FileImage className="w-5 h-5 text-pink-400" />,
    jpeg: <FileImage className="w-5 h-5 text-pink-400" />,
    gif: <FileImage className="w-5 h-5 text-pink-400" />,
    svg: <FileImage className="w-5 h-5 text-pink-400" />,
  };

  return iconMap[item.extension || ''] || <File className="w-5 h-5 text-dark-400" />;
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export default function FileManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPath, setCurrentPath] = useState('/var/www');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const pathParts = currentPath.split('/').filter(Boolean);

  const filteredFiles = mockFiles
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const toggleSelect = (name: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelected(newSelected);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark-100">File Manager</h1>
            <p className="text-dark-400">Browse and manage files</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setShowUpload(true)}>
            Upload
          </Button>
          <Button variant="secondary" leftIcon={<FolderPlus className="w-4 h-4" />} onClick={() => setShowNewFolder(true)}>
            New Folder
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="mb-4">
        <div className="p-3 flex items-center gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              onClick={() => setCurrentPath('/')}
              className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors"
            >
              <Home className="w-4 h-4" />
            </button>
            {pathParts.map((part, i) => (
              <div key={i} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-dark-600" />
                <button
                  onClick={() => setCurrentPath('/' + pathParts.slice(0, i + 1).join('/'))}
                  className="px-2 py-1 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors truncate max-w-[150px]"
                >
                  {part}
                </button>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="w-64">
            <SearchInput
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 border-l border-dark-700 pl-4">
            <button className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid' ? 'text-primary-400 bg-primary-500/10' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list' ? 'text-primary-400 bg-primary-500/10' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selection toolbar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-dark-700 overflow-hidden"
            >
              <div className="p-3 flex items-center gap-4">
                <span className="text-sm text-dark-400">
                  {selected.size} item{selected.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" leftIcon={<Download className="w-4 h-4" />}>
                    Download
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<Copy className="w-4 h-4" />}>
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<Scissors className="w-4 h-4" />}>
                    Cut
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDelete(true)}>
                    Delete
                  </Button>
                </div>
                <button
                  onClick={() => setSelected(new Set())}
                  className="ml-auto text-sm text-dark-400 hover:text-dark-100 transition-colors"
                >
                  Clear selection
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* File List */}
      <Card className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-auto h-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-800 z-10">
                <tr className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredFiles.length && filteredFiles.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(filteredFiles.map((f) => f.name)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500"
                    />
                  </th>
                  <th className="p-3">Name</th>
                  <th className="p-3 w-24">Size</th>
                  <th className="p-3 w-32">Modified</th>
                  <th className="p-3 w-32">Permissions</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((item) => (
                  <tr
                    key={item.name}
                    className={cn(
                      'border-t border-dark-800 hover:bg-dark-800/50 transition-colors cursor-pointer',
                      selected.has(item.name) && 'bg-primary-500/10'
                    )}
                    onClick={() => item.type === 'folder' && setCurrentPath(`${currentPath}/${item.name}`)}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.name)}
                        onChange={() => toggleSelect(item.name)}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(item)}
                        <span className="text-dark-100">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-dark-400 text-sm">{formatSize(item.size)}</td>
                    <td className="p-3 text-dark-400 text-sm">{item.modified}</td>
                    <td className="p-3 text-dark-400 text-sm font-mono">{item.permissions}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Dropdown
                        trigger={
                          <button className="p-1 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        {item.type === 'file' && (
                          <DropdownItem icon={<Edit className="w-4 h-4" />}>Edit</DropdownItem>
                        )}
                        <DropdownItem icon={<Download className="w-4 h-4" />}>Download</DropdownItem>
                        <DropdownItem icon={<Copy className="w-4 h-4" />}>Copy</DropdownItem>
                        <DropdownItem icon={<Scissors className="w-4 h-4" />}>Cut</DropdownItem>
                        <DropdownDivider />
                        <DropdownItem icon={<Trash2 className="w-4 h-4" />} danger>Delete</DropdownItem>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-auto h-full">
            {filteredFiles.map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  'p-3 rounded-lg border border-dark-700 hover:border-dark-600 cursor-pointer transition-all',
                  selected.has(item.name) && 'border-primary-500 bg-primary-500/10'
                )}
                onClick={() => item.type === 'folder' && setCurrentPath(`${currentPath}/${item.name}`)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center">
                    {item.type === 'folder' ? (
                      <Folder className="w-10 h-10 text-yellow-400" />
                    ) : (
                      getFileIcon(item)
                    )}
                  </div>
                  <span className="text-sm text-dark-200 text-center truncate w-full">{item.name}</span>
                  <span className="text-xs text-dark-500">{formatSize(item.size)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Files" size="md">
        <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-primary-500/50 transition-colors cursor-pointer">
          <Upload className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-300 mb-2">Drag and drop files here, or click to browse</p>
          <p className="text-sm text-dark-500">Maximum file size: 100MB</p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
          <Button>Upload</Button>
        </div>
      </Modal>

      {/* New Folder Modal */}
      <Modal open={showNewFolder} onClose={() => setShowNewFolder(false)} title="New Folder" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Folder Name</label>
            <input
              type="text"
              placeholder="my-folder"
              className="w-full px-4 py-2.5 bg-dark-900/50 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          setSelected(new Set());
          setShowDelete(false);
        }}
        type="danger"
        title="Delete Files"
        message={`Are you sure you want to delete ${selected.size} item${selected.size > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
