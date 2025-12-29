import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  RefreshCw,
  Play,
  Square,
  FileText,
  Code as CodeIcon,
  ChevronDown,
  ChevronRight,
  Container,
  Layers,
} from 'lucide-react';
import {
  Button,
  Badge,
  SearchInput,
  Modal,
  ConfirmModal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Empty,
  Spinner,
  Input,
  Textarea,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import * as dockerApi from '../api/docker';
import type { ComposeProject, CreateComposeProjectRequest, ComposeServiceInfo } from '../api/docker';

export default function DockerCompose() {
  const [projects, setProjects] = useState<ComposeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ComposeProject | null>(null);
  const [createForm, setCreateForm] = useState<CreateComposeProjectRequest>({
    name: '',
    path: '',
    content: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Toggle expanded state for a project
  const toggleExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const data = await dockerApi.listComposeProjects();
      setProjects(data);
    } catch {
      // Silently handle error when Docker is unavailable
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle create project
  const handleCreateProject = async () => {
    if (!createForm.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    if (!createForm.path.trim()) {
      toast.error('Please enter a project path');
      return;
    }
    if (!createForm.content.trim()) {
      toast.error('Please enter docker-compose.yml content');
      return;
    }

    setCreating(true);
    try {
      await dockerApi.createComposeProject(createForm);
      toast.success(`Compose project "${createForm.name}" created successfully`);
      setShowCreateModal(false);
      setCreateForm({ name: '', path: '', content: '', description: '' });
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create compose project');
    } finally {
      setCreating(false);
    }
  };

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      await dockerApi.removeComposeProject(selectedProject.id);
      toast.success('Compose project deleted successfully');
      setShowDeleteModal(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete compose project');
    }
  };

  // Handle compose up
  const handleComposeUp = async (project: ComposeProject) => {
    setActionLoading(project.id);
    try {
      await dockerApi.composeUp(project.id);
      toast.success(`Compose project "${project.name}" started`);
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start compose project');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle compose down
  const handleComposeDown = async (project: ComposeProject) => {
    setActionLoading(project.id);
    try {
      await dockerApi.composeDown(project.id);
      toast.success(`Compose project "${project.name}" stopped`);
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop compose project');
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'success' | 'gray' | 'warning' => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'gray';
      case 'partial':
        return 'warning';
      default:
        return 'gray';
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      project.path.toLowerCase().includes(searchLower) ||
      project.description.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark-100">Compose</h1>
          <p className="text-dark-400">Manage Docker Compose projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchProjects();
            }}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Project
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          placeholder="Search compose projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Projects table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {filteredProjects.length === 0 ? (
          <Empty
            title="No compose projects found"
            description={search ? 'Try adjusting your search' : 'Create a compose project to get started'}
            icon={<CodeIcon className="w-8 h-8 text-dark-500" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="w-8"></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Path</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Containers</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const isLoading = actionLoading === project.id;
                const isExpanded = expandedProjects.has(project.id);
                const hasServices = project.services && project.services.length > 0;
                return (
                  <React.Fragment key={project.id}>
                    <TableRow className={cn(isExpanded && 'border-b-0')}>
                      <TableCell className="w-8">
                        {hasServices && (
                          <button
                            onClick={() => toggleExpanded(project.id)}
                            className="p-1 hover:bg-dark-700 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-dark-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-dark-400" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <span className="font-medium text-dark-100">{project.name}</span>
                          {project.is_auto_detected && (
                            <Badge variant="gray" className="text-xs">Auto</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-dark-400 font-mono text-sm">
                        {project.path || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(project.status)}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-dark-400">
                        <span className="text-green-400">{project.running_count}</span>
                        {' / '}
                        <span>{project.container_count}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<FileText className="w-4 h-4" />}
                            onClick={() => {
                              setSelectedProject(project);
                              setShowViewModal(true);
                            }}
                            disabled={isLoading}
                          >
                            View
                          </Button>
                          {project.status === 'running' || project.status === 'partial' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={isLoading ? <Spinner size="sm" /> : <Square className="w-4 h-4" />}
                              onClick={() => handleComposeDown(project)}
                              disabled={isLoading}
                              className="text-yellow-400 hover:text-yellow-300"
                            >
                              Stop
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={isLoading ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
                              onClick={() => handleComposeUp(project)}
                              disabled={isLoading}
                              className="text-green-400 hover:text-green-300"
                            >
                              Start
                            </Button>
                          )}
                          {!project.is_auto_detected && (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Trash2 className="w-4 h-4" />}
                              onClick={() => {
                                setSelectedProject(project);
                                setShowDeleteModal(true);
                              }}
                              disabled={isLoading}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <AnimatePresence>
                      {isExpanded && hasServices && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-dark-850"
                        >
                          <td colSpan={6} className="p-0">
                            <div className="px-6 py-3 ml-8 border-l-2 border-dark-700">
                              <div className="text-xs font-medium text-dark-500 uppercase mb-2">Services</div>
                              <div className="space-y-2">
                                {project.services.map((service: ComposeServiceInfo) => (
                                  <div
                                    key={service.container_id}
                                    className="flex items-center justify-between bg-dark-800 rounded-lg px-4 py-2"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Container className="w-4 h-4 text-dark-500" />
                                      <div>
                                        <div className="text-sm font-medium text-dark-200">
                                          {service.name}
                                          <span className="text-dark-500 ml-2 font-normal">
                                            ({service.container_name})
                                          </span>
                                        </div>
                                        <div className="text-xs text-dark-500">{service.image}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {service.ports && service.ports.length > 0 && (
                                        <div className="text-xs text-dark-400 font-mono">
                                          {service.ports.join(', ')}
                                        </div>
                                      )}
                                      <Badge
                                        variant={service.state === 'running' ? 'success' : 'gray'}
                                        className="text-xs"
                                      >
                                        {service.state}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Create Project Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateForm({ name: '', path: '', content: '', description: '' });
        }}
        title="Create Compose Project"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <Input
              placeholder="e.g., my-app"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Project Path</label>
            <Input
              placeholder="e.g., /opt/compose/my-app"
              value={createForm.path}
              onChange={(e) => setCreateForm({ ...createForm, path: e.target.value })}
            />
            <p className="text-sm text-dark-500 mt-1">
              Directory where docker-compose.yml will be created
            </p>
          </div>
          <div>
            <label className="label">Description</label>
            <Input
              placeholder="Optional description"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">docker-compose.yml Content</label>
            <Textarea
              placeholder="version: '3.8'&#10;services:&#10;  web:&#10;    image: nginx"
              value={createForm.content}
              onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-sm text-dark-500 mt-1">
              YAML content for docker-compose.yml file
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                setCreateForm({ name: '', path: '', content: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              disabled={creating || !createForm.name.trim() || !createForm.path.trim() || !createForm.content.trim()}
              leftIcon={creating ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Project Modal */}
      <Modal
        open={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedProject(null);
        }}
        title={selectedProject ? `Compose Project: ${selectedProject.name}` : ''}
        size="xl"
      >
        {selectedProject && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Path</label>
                <p className="text-dark-100 font-mono text-sm">{selectedProject.path || '-'}</p>
              </div>
              <div>
                <label className="label">Status</label>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                  {selectedProject.is_auto_detected && (
                    <Badge variant="gray">Auto-detected</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Containers</label>
                <p className="text-dark-100">
                  <span className="text-green-400">{selectedProject.running_count}</span>
                  {' running / '}
                  <span>{selectedProject.container_count}</span>
                  {' total'}
                </p>
              </div>
              <div>
                <label className="label">Config Files</label>
                <p className="text-dark-100 font-mono text-sm">
                  {selectedProject.config_files || '-'}
                </p>
              </div>
            </div>
            {selectedProject.description && (
              <div>
                <label className="label">Description</label>
                <p className="text-dark-100">{selectedProject.description}</p>
              </div>
            )}
            {selectedProject.services && selectedProject.services.length > 0 && (
              <div>
                <label className="label">Services ({selectedProject.services.length})</label>
                <div className="space-y-2 mt-2">
                  {selectedProject.services.map((service: ComposeServiceInfo) => (
                    <div
                      key={service.container_id}
                      className="flex items-center justify-between bg-dark-800 rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Container className="w-4 h-4 text-dark-500" />
                        <div>
                          <div className="text-sm font-medium text-dark-200">
                            {service.name}
                            <span className="text-dark-500 ml-2 font-normal">
                              ({service.container_name})
                            </span>
                          </div>
                          <div className="text-xs text-dark-500">{service.image}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {service.ports && service.ports.length > 0 && (
                          <div className="text-xs text-dark-400 font-mono">
                            {service.ports.join(', ')}
                          </div>
                        )}
                        <Badge
                          variant={service.state === 'running' ? 'success' : 'gray'}
                          className="text-xs"
                        >
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProject(null);
        }}
        onConfirm={handleDeleteProject}
        type="danger"
        title="Delete Compose Project"
        message={
          selectedProject
            ? `Are you sure you want to delete compose project "${selectedProject.name}"? This will stop and remove all containers, networks, and volumes. This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
      />
    </div>
  );
}
