import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  Trash2,
  Search,
  X,
  ChevronDown,
  Clock,
  WrapText,
  ArrowDown,
} from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import * as dockerApi from '../api/docker';
import type { LogLine } from '../api/docker';
import { useAuthStore } from '@/stores/auth';

interface ContainerLogsProps {
  containerId: string;
  containerName: string;
  isRunning: boolean;
  className?: string;
}

// Parse log level from content
function getLogLevel(content: string): 'error' | 'warn' | 'info' | 'debug' | null {
  const lower = content.toLowerCase();
  const firstPart = lower.substring(0, 100);
  
  if (firstPart.includes('error') || firstPart.includes('fatal') || firstPart.includes('panic')) {
    return 'error';
  }
  if (firstPart.includes('warn')) {
    return 'warn';
  }
  if (firstPart.includes('debug') || firstPart.includes('trace')) {
    return 'debug';
  }
  if (firstPart.includes('info')) {
    return 'info';
  }
  return null;
}

// Format timestamp for display
function formatTime(time: string): string {
  try {
    const date = new Date(time);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  } catch {
    return time;
  }
}

export default function ContainerLogs({
  containerId,
  containerName,
  isRunning,
  className,
}: ContainerLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [tailLines, setTailLines] = useState(500);
  
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom - use direct DOM manipulation to avoid animation issues
  const scrollToBottom = useCallback((smooth = false) => {
    const container = logsContainerRef.current;
    if (!container) return;
    
    // Mark that we're programmatically scrolling
    isScrollingRef.current = true;
    
    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
    
    // Reset the flag after a short delay
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, []);

  // Load initial logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const logLines = await dockerApi.getContainerLogs(containerId, {
        tail: tailLines,
        timestamps: true,
      });
      setLogs(logLines);
      setTimeout(() => scrollToBottom(false), 50);
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [containerId, tailLines, scrollToBottom]);

  // Start streaming logs
  const startStreaming = useCallback(() => {
    if (!isRunning || wsRef.current) return;

    const token = useAuthStore.getState().token;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams();
    params.set('tail', '0'); // Don't include historical logs, we already have them
    params.set('timestamps', 'true');
    if (token) params.set('token', token);

    const url = `${protocol}//${host}/api/docker/containers/${containerId}/logs/stream?${params.toString()}`;
    
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStreaming(true);
    };

    ws.onmessage = (event) => {
      try {
        const logLine: LogLine = JSON.parse(event.data);
        setLogs(prev => {
          const newLogs = [...prev, logLine];
          // Keep max 10000 lines
          if (newLogs.length > 10000) {
            return newLogs.slice(-10000);
          }
          return newLogs;
        });
      } catch (e) {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      setStreaming(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStreaming(false);
      
      // Auto-reconnect if container is still running
      if (isRunning) {
        reconnectTimeoutRef.current = setTimeout(() => {
          startStreaming();
        }, 3000);
      }
    };
  }, [containerId, isRunning]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Load logs on mount
  useEffect(() => {
    loadLogs();
    return () => {
      stopStreaming();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loadLogs, stopStreaming]);

  // Auto-start streaming when container is running
  useEffect(() => {
    if (isRunning && !streaming && !loading) {
      startStreaming();
    } else if (!isRunning) {
      stopStreaming();
    }
  }, [isRunning, streaming, loading, startStreaming, stopStreaming]);

  // Handle scroll to detect auto-scroll state
  const handleScroll = useCallback(() => {
    // Ignore scroll events triggered by programmatic scrolling
    if (isScrollingRef.current) return;
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  }, []);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && logs.length > 0 && streaming) {
      // Use requestAnimationFrame to batch with React's render
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
  }, [logs.length, autoScroll, streaming, scrollToBottom]);

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Download logs
  const downloadLogs = () => {
    const content = logs
      .map(log => {
        const time = log.time ? `[${log.time}] ` : '';
        const stream = `[${log.stream}] `;
        return `${time}${stream}${log.content}`;
      })
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${containerName}-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded');
  };

  // Filter logs by search term
  const filteredLogs = searchTerm
    ? logs.filter(log => 
        log.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  // Count by stream type
  const stdoutCount = logs.filter(l => l.stream === 'stdout').length;
  const stderrCount = logs.filter(l => l.stream === 'stderr').length;

  return (
    <div className={cn('flex flex-col h-full bg-dark-950 rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-dark-800 bg-dark-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Streaming control */}
          {isRunning ? (
            streaming ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={stopStreaming}
                className="text-green-400"
                title="Pause streaming"
              >
                <Pause className="w-4 h-4 mr-1" />
                Live
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={startStreaming}
                title="Start streaming"
              >
                <Play className="w-4 h-4 mr-1" />
                Stream
              </Button>
            )
          ) : (
            <Badge variant="gray" className="text-xs">
              Container stopped
            </Badge>
          )}

          <div className="w-px h-4 bg-dark-700" />

          {/* Refresh */}
          <Button
            size="sm"
            variant="ghost"
            onClick={loadLogs}
            disabled={loading}
            title="Refresh logs"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>

          {/* Clear */}
          <Button
            size="sm"
            variant="ghost"
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* Download */}
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadLogs}
            disabled={logs.length === 0}
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </Button>

          <div className="w-px h-4 bg-dark-700" />

          {/* Timestamps toggle */}
          <Button
            size="sm"
            variant={showTimestamps ? 'default' : 'ghost'}
            onClick={() => setShowTimestamps(!showTimestamps)}
            title="Toggle timestamps"
          >
            <Clock className="w-4 h-4" />
          </Button>

          {/* Wrap toggle */}
          <Button
            size="sm"
            variant={wrapLines ? 'default' : 'ghost'}
            onClick={() => setWrapLines(!wrapLines)}
            title="Toggle line wrap"
          >
            <WrapText className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-2 text-xs text-dark-400 mr-2">
            <span>{logs.length.toLocaleString()} lines</span>
            {stderrCount > 0 && (
              <Badge variant="error" className="text-xs">
                {stderrCount} stderr
              </Badge>
            )}
          </div>

          {/* Search */}
          {searchVisible ? (
            <div className="flex items-center gap-1">
              <Input
                size="sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-48 h-7 text-xs"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchVisible(false);
                  setSearchTerm('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSearchVisible(true)}
              title="Search"
            >
              <Search className="w-4 h-4" />
            </Button>
          )}

          {/* Tail lines selector */}
          <select
            value={tailLines}
            onChange={(e) => setTailLines(Number(e.target.value))}
            className="h-7 px-2 text-xs bg-dark-800 border border-dark-700 rounded text-dark-200 outline-none focus:border-dark-500"
          >
            <option value={100}>100 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
            <option value={5000}>5000 lines</option>
          </select>
        </div>
      </div>

      {/* Logs container */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto font-mono text-xs"
        style={{ overscrollBehavior: 'contain' }}
      >
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            No logs available
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            No logs match "{searchTerm}"
          </div>
        ) : (
          <div className="p-2">
            {filteredLogs.map((log, index) => {
              const level = getLogLevel(log.content);
              return (
                <div
                  key={index}
                  className={cn(
                    'py-0.5 leading-relaxed flex',
                    log.stream === 'stderr' && 'bg-red-500/5',
                    level === 'error' && 'text-red-400',
                    level === 'warn' && 'text-yellow-400',
                    level === 'debug' && 'text-dark-500',
                    level === 'info' && 'text-blue-400',
                    !level && log.stream === 'stderr' && 'text-red-300',
                    !level && log.stream === 'stdout' && 'text-dark-300',
                    wrapLines ? 'break-all' : 'whitespace-nowrap'
                  )}
                >
                  {/* Line number */}
                  <span className="text-dark-600 select-none w-12 flex-shrink-0 text-right pr-3">
                    {index + 1}
                  </span>
                  
                  {/* Timestamp */}
                  {showTimestamps && log.time && (
                    <span className="text-dark-500 flex-shrink-0 pr-2">
                      {formatTime(log.time)}
                    </span>
                  )}
                  
                  {/* Stream indicator */}
                  <span className={cn(
                    'flex-shrink-0 pr-2 font-medium',
                    log.stream === 'stderr' ? 'text-red-500' : 'text-dark-600'
                  )}>
                    {log.stream === 'stderr' ? 'ERR' : 'OUT'}
                  </span>
                  
                  {/* Content */}
                  <span className="flex-1">
                    {searchTerm ? (
                      <HighlightedText text={log.content} highlight={searchTerm} />
                    ) : (
                      log.content
                    )}
                  </span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && logs.length > 0 && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            onClick={() => {
              setAutoScroll(true);
              scrollToBottom();
            }}
            className="shadow-lg"
          >
            <ArrowDown className="w-4 h-4 mr-1" />
            Scroll to bottom
          </Button>
        </div>
      )}

      {/* Streaming indicator */}
      {streaming && (
        <div className="flex items-center justify-center py-1 bg-green-500/10 border-t border-dark-800 text-xs text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
          Streaming live logs...
        </div>
      )}
    </div>
  );
}

// Highlight search matches in text
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

