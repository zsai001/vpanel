import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Terminal,
  FileText,
  Info,
  Folder,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  Badge,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Spinner,
  Empty,
} from '@/components/ui';
import toast from 'react-hot-toast';
import * as dockerApi from '../api/docker';
import type { Container } from '../api/docker';
import DockerTerminal from '../components/DockerTerminal';
import ContainerFileBrowser from '../components/ContainerFileBrowser';
import ContainerLogs from '../components/ContainerLogs';

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [container, setContainer] = useState<Container | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'logs' | 'terminal' | 'files'>('info');

  // Load container details
  const loadContainer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await dockerApi.getContainer(id);
      setContainer(data);
    } catch (error) {
      toast.error('Failed to load container details');
      navigate('/docker/containers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadContainer();
  }, [loadContainer]);

  // Handle container actions
  const handleAction = async (action: string) => {
    if (!container || !id) return;
    try {
      switch (action) {
        case 'start':
          await dockerApi.startContainer(id);
          toast.success(`Container "${container.name}" started`);
          break;
        case 'stop':
          await dockerApi.stopContainer(id);
          toast.success(`Container "${container.name}" stopped`);
          break;
        case 'restart':
          await dockerApi.restartContainer(id);
          toast.success(`Container "${container.name}" restarted`);
          break;
      }
      await loadContainer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} container`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!container) {
    return (
      <div className="flex items-center justify-center h-64">
        <Empty
          title="Container not found"
          description="The container you're looking for doesn't exist or has been removed"
          action={
            <Button onClick={() => navigate('/docker/containers')}>
              Back to Containers
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/docker/containers')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-dark-100">{container.name}</h1>
            <p className="text-dark-400">{container.image}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {container.state === 'running' ? (
            <>
              <Button
                variant="ghost"
                leftIcon={<Square className="w-4 h-4" />}
                onClick={() => handleAction('stop')}
              >
                Stop
              </Button>
              <Button
                variant="ghost"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => handleAction('restart')}
              >
                Restart
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => handleAction('start')}
            >
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabList className="mb-4">
          <Tab value="info" leftIcon={<Info className="w-4 h-4" />}>
            Info
          </Tab>
          <Tab value="logs" leftIcon={<FileText className="w-4 h-4" />}>
            Logs
          </Tab>
          <Tab
            value="terminal"
            leftIcon={<Terminal className="w-4 h-4" />}
            disabled={container.state !== 'running'}
          >
            Terminal
          </Tab>
          <Tab
            value="files"
            leftIcon={<Folder className="w-4 h-4" />}
            disabled={container.state !== 'running'}
          >
            Files
          </Tab>
        </TabList>

        {/* Info Tab */}
        <TabPanel value="info">
          <div className="card p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-dark-400 mb-1 block">ID</label>
                <p className="text-sm text-dark-100 font-mono">{container.id.substring(0, 12)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-dark-400 mb-1 block">Status</label>
                <Badge
                  variant={
                    container.status === 'running'
                      ? 'success'
                      : container.status === 'stopped' || container.status === 'exited'
                      ? 'gray'
                      : container.status === 'paused'
                      ? 'warning'
                      : 'info'
                  }
                  dot
                >
                  {container.status}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-dark-400 mb-1 block">Image</label>
                <p className="text-sm text-dark-100">{container.image}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-dark-400 mb-1 block">Created</label>
                <p className="text-sm text-dark-100">{container.created}</p>
              </div>
              {container.network && (
                <div>
                  <label className="text-sm font-medium text-dark-400 mb-1 block">Network</label>
                  <p className="text-sm text-dark-100">{container.network}</p>
                </div>
              )}
              {container.command && (
                <div>
                  <label className="text-sm font-medium text-dark-400 mb-1 block">Command</label>
                  <p className="text-sm text-dark-100 font-mono">{container.command}</p>
                </div>
              )}
            </div>
            {container.ports && container.ports.length > 0 && (
              <div>
                <label className="text-sm font-medium text-dark-400 mb-2 block">Ports</label>
                <div className="flex flex-wrap gap-2">
                  {container.ports.map((port, i) => (
                    <Badge key={i} variant="gray">
                      {port}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {container.labels && Object.keys(container.labels).length > 0 && (
              <div>
                <label className="text-sm font-medium text-dark-400 mb-2 block">Labels</label>
                <div className="bg-dark-900/50 rounded-lg p-4 space-y-1 max-h-64 overflow-auto">
                  {Object.entries(container.labels).map(([key, value]) => (
                    <div key={key} className="text-xs font-mono">
                      <span className="text-dark-400">{key}:</span>{' '}
                      <span className="text-dark-200">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabPanel>

        {/* Logs Tab */}
        <TabPanel value="logs">
          <div className="card overflow-hidden relative">
            <ContainerLogs
              containerId={container.id}
              containerName={container.name}
              isRunning={container.state === 'running'}
              className="h-[600px]"
            />
          </div>
        </TabPanel>

        {/* Terminal Tab */}
        <TabPanel value="terminal">
          {container.state === 'running' ? (
            <div className="card overflow-hidden">
              <DockerTerminal
                containerId={container.id}
                containerName={container.name}
                className="h-[600px]"
              />
            </div>
          ) : (
            <div className="card p-6">
              <div className="bg-dark-900/50 rounded-lg p-8 text-center">
                <Terminal className="w-12 h-12 text-dark-500 mx-auto mb-2" />
                <p className="text-dark-400">Container must be running to access terminal</p>
              </div>
            </div>
          )}
        </TabPanel>

        {/* Files Tab */}
        <TabPanel value="files">
          {container.state === 'running' ? (
            <div className="card overflow-hidden">
              <ContainerFileBrowser
                containerId={container.id}
                containerName={container.name}
                className="h-[600px]"
              />
            </div>
          ) : (
            <div className="card p-6">
              <div className="bg-dark-900/50 rounded-lg p-8 text-center">
                <Folder className="w-12 h-12 text-dark-500 mx-auto mb-2" />
                <p className="text-dark-400">Container must be running to access files</p>
              </div>
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

