import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  File,
  FileText,
  FileCode,
  FileImage,
  ChevronRight,
  ArrowUp,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  FolderPlus,
  Eye,
  X,
  Home,
} from 'lucide-react';
import { Button, Spinner, Modal, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import * as dockerApi from '../api/docker';
import type { ContainerFile, ContainerFileContent } from '../api/docker';

interface ContainerFileBrowserProps {
  containerId: string;
  containerName: string;
  className?: string;
}

// File type icon mapping
function getFileIcon(file: ContainerFile) {
  if (file.is_dir) {
    return <Folder className="w-4 h-4 text-blue-400" />;
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'php', 'rb', 'sh', 'bash', 'zsh'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-green-400" />;
  }
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    return <FileImage className="w-4 h-4 text-purple-400" />;
  }
  
  // Text/config files
  if (['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'log', 'xml', 'html', 'css'].includes(ext)) {
    return <FileText className="w-4 h-4 text-yellow-400" />;
  }
  
  return <File className="w-4 h-4 text-dark-400" />;
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// Check if file is viewable
function isViewable(file: ContainerFile): boolean {
  if (file.is_dir) return false;
  if (file.size > 1024 * 1024) return false; // Max 1MB
  
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const viewableExts = [
    'txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'log',
    'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java',
    'c', 'cpp', 'h', 'php', 'rb', 'sh', 'bash', 'zsh', 'sql', 'env', 'gitignore',
    'dockerfile', 'makefile',
  ];
  
  // Check extension or common config file names
  if (viewableExts.includes(ext)) return true;
  if (['dockerfile', 'makefile', '.env', '.gitignore', '.dockerignore'].includes(file.name.toLowerCase())) return true;
  
  return false;
}

export default function ContainerFileBrowser({
  containerId,
  containerName,
  className,
}: ContainerFileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<ContainerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ContainerFile | null>(null);
  const [viewingFile, setViewingFile] = useState<ContainerFileContent | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files
  const loadFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    
    try {
      const fileList = await dockerApi.listContainerFiles(containerId, path);
      
      // Sort: directories first, then by name
      const sorted = [...fileList].sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sorted);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    loadFiles('/');
  }, [loadFiles]);

  // Navigate to directory
  const navigateTo = (path: string) => {
    loadFiles(path);
  };

  // Go up one level
  const goUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo('/' + parts.join('/') || '/');
  };

  // Handle file click
  const handleFileClick = (file: ContainerFile) => {
    if (file.is_dir) {
      navigateTo(file.path);
    } else {
      setSelectedFile(file);
    }
  };

  // View file content
  const viewFile = async (file: ContainerFile) => {
    setViewingLoading(true);
    try {
      const content = await dockerApi.getContainerFileContent(containerId, file.path);
      setViewingFile(content);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setViewingLoading(false);
    }
  };

  // Download file
  const downloadFile = (file: ContainerFile) => {
    const token = localStorage.getItem('token') || '';
    const url = dockerApi.getContainerFileDownloadUrl(containerId, file.path);
    
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url + `&token=${token}`;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Delete file
  const deleteFile = async (file: ContainerFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;
    
    setDeleting(true);
    try {
      await dockerApi.deleteContainerFile(containerId, file.path);
      toast.success(`Deleted ${file.name}`);
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Upload file
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      await dockerApi.uploadContainerFile(containerId, currentPath, file);
      toast.success(`Uploaded ${file.name}`);
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Create folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setCreatingFolder(true);
    try {
      const path = currentPath === '/' 
        ? `/${newFolderName}` 
        : `${currentPath}/${newFolderName}`;
      await dockerApi.createContainerDirectory(containerId, path);
      toast.success(`Created folder ${newFolderName}`);
      setShowNewFolderModal(false);
      setNewFolderName('');
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Build breadcrumb
  const breadcrumbs = [
    { name: containerName, path: '/' },
    ...currentPath.split('/').filter(Boolean).map((part, index, arr) => ({
      name: part,
      path: '/' + arr.slice(0, index + 1).join('/'),
    })),
  ];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700 bg-dark-900">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateTo('/')}
            title="Go to root"
          >
            <Home className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={goUp}
            disabled={currentPath === '/'}
            title="Go up"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => loadFiles(currentPath)}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewFolderModal(true)}
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 text-sm text-dark-400 bg-dark-900/50 overflow-x-auto">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center gap-1 whitespace-nowrap">
            {index > 0 && <ChevronRight className="w-3 h-3" />}
            <button
              onClick={() => navigateTo(crumb.path)}
              className={cn(
                'hover:text-dark-200 transition-colors',
                index === breadcrumbs.length - 1 && 'text-dark-200 font-medium'
              )}
            >
              {index === 0 ? <Folder className="w-4 h-4 inline mr-1" /> : null}
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-400">
            <p className="mb-2">{error}</p>
            <Button size="sm" variant="ghost" onClick={() => loadFiles(currentPath)}>
              Retry
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            Empty directory
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-dark-900/90 backdrop-blur">
              <tr className="text-left text-xs text-dark-400 border-b border-dark-700">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-24 text-right">Size</th>
                <th className="px-4 py-2 font-medium w-32">Mode</th>
                <th className="px-4 py-2 font-medium w-40">Modified</th>
                <th className="px-4 py-2 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.path}
                  className={cn(
                    'border-b border-dark-800 hover:bg-dark-800/50 transition-colors cursor-pointer',
                    selectedFile?.path === file.path && 'bg-dark-800'
                  )}
                  onClick={() => handleFileClick(file)}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file)}
                      <span className={cn(
                        'text-sm',
                        file.is_dir ? 'text-blue-400' : 'text-dark-200',
                        file.is_link && 'italic'
                      )}>
                        {file.name}
                        {file.is_link && <span className="text-dark-500 ml-1">(link)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-dark-400 font-mono">
                    {file.is_dir ? '-' : formatSize(file.size)}
                  </td>
                  <td className="px-4 py-2 text-xs text-dark-500 font-mono">
                    {file.mode}
                  </td>
                  <td className="px-4 py-2 text-xs text-dark-500">
                    {file.mod_time}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!file.is_dir && isViewable(file) && (
                        <button
                          onClick={() => viewFile(file)}
                          className="p-1 hover:bg-dark-700 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5 text-dark-400 hover:text-dark-200" />
                        </button>
                      )}
                      {!file.is_dir && (
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-1 hover:bg-dark-700 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5 text-dark-400 hover:text-dark-200" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteFile(file)}
                        disabled={deleting}
                        className="p-1 hover:bg-dark-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-dark-400 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* File viewer modal */}
      <Modal
        isOpen={viewingFile !== null}
        onClose={() => setViewingFile(null)}
        title={viewingFile?.name || 'File'}
        size="xl"
      >
        {viewingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : viewingFile ? (
          <div className="relative">
            <div className="flex items-center justify-between mb-2 text-sm text-dark-400">
              <span>{viewingFile.path}</span>
              <span>{formatSize(viewingFile.size)}</span>
            </div>
            <pre className="bg-dark-950 border border-dark-700 rounded-lg p-4 overflow-auto max-h-[60vh] text-sm text-dark-200 font-mono whitespace-pre-wrap">
              {viewingFile.content}
            </pre>
          </div>
        ) : null}
      </Modal>

      {/* New folder modal */}
      <Modal
        isOpen={showNewFolderModal}
        onClose={() => {
          setShowNewFolderModal(false);
          setNewFolderName('');
        }}
        title="New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="folder-name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createFolder();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewFolderModal(false);
                setNewFolderName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createFolder}
              disabled={!newFolderName.trim() || creatingFolder}
              loading={creatingFolder}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

