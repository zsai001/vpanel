import { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useAuthStore } from '@/stores/auth';

interface DockerTerminalProps {
  containerId: string;
  containerName: string;
  onClose?: () => void;
  className?: string;
}

export default function DockerTerminal({
  containerId,
  containerName,
  onClose,
  className,
}: DockerTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Connect to WebSocket
  const connectWebSocket = useCallback((xterm: XTerm, _fitAddon: FitAddon) => {
    const token = useAuthStore.getState().token;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    const cols = xterm.cols;
    const rows = xterm.rows;

    const params = new URLSearchParams();
    params.set('cols', String(cols));
    params.set('rows', String(rows));
    params.set('shell', '/bin/sh'); // Default shell, works in most containers
    if (token) {
      params.set('token', token);
    }

    const url = `${protocol}//${host}/api/docker/containers/${containerId}/exec?${params.toString()}`;
    console.log('Connecting to Docker terminal WebSocket:', url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Docker terminal WebSocket connected');
      setConnected(true);
      setError(null);

      // Focus terminal
      xterm.focus();
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        event.data.text().then((text) => {
          xterm.write(text);
        });
      } else if (typeof event.data === 'string') {
        xterm.write(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        const decoder = new TextDecoder();
        xterm.write(decoder.decode(event.data));
      }
    };

    ws.onerror = (event) => {
      console.error('Docker terminal WebSocket error:', event);
      setError('WebSocket connection error');
      setConnected(false);
    };

    ws.onclose = (event) => {
      console.log('Docker terminal WebSocket closed:', event.code, event.reason);
      setConnected(false);
      if (event.code !== 1000) {
        setError(`Connection closed: ${event.reason || 'Unknown error'}`);
      }
    };

    // Send terminal input to WebSocket
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Handle terminal resize
    xterm.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send resize message: \x01<cols>;<rows>
        ws.send(`\x01${cols};${rows}`);
      }
    });
  }, [containerId]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const container = terminalRef.current;
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 100;

    // Wait for container to have proper dimensions before initializing
    const initTerminal = () => {
      if (cancelled) return;

      const rect = container.getBoundingClientRect();
      if ((rect.width === 0 || rect.height === 0) && retryCount < maxRetries) {
        retryCount++;
        requestAnimationFrame(initTerminal);
        return;
      }

      // Create xterm instance
      const xterm = new XTerm({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontWeight: '400',
        fontWeightBold: '600',
        letterSpacing: 0,
        lineHeight: 1.0,
        theme: {
          background: '#0a0a0a',
          foreground: '#e5e5e5',
          cursor: '#22c55e',
          cursorAccent: '#0a0a0a',
          selectionBackground: '#3b82f680',
          black: '#171717',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e5e5e5',
          brightBlack: '#525252',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        allowTransparency: false,
        scrollback: 10000,
        allowProposedApi: true,
      });

      // Add addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);

      // Open terminal in container
      if (cancelled) {
        xterm.dispose();
        return;
      }
      xterm.open(container);

      // Try to load WebGL addon for better rendering
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon.dispose();
        });
        xterm.loadAddon(webglAddon);
      } catch (e) {
        console.warn('WebGL not available, using canvas renderer');
      }

      // Fit after a short delay
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          try {
            fitAddon.fit();
          } catch (e) {
            console.warn('Initial fit failed, will retry on resize');
          }
        });
      });

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      // Connect WebSocket
      connectWebSocket(xterm, fitAddon);
    };

    // Start initialization
    requestAnimationFrame(initTerminal);

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [containerId, connectWebSocket]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && terminalRef.current) {
        requestAnimationFrame(() => {
          try {
            fitAddonRef.current?.fit();
            if (xtermRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
              const { cols, rows } = xtermRef.current;
              wsRef.current.send(`\x01${cols};${rows}`);
            }
          } catch (e) {
            // Ignore resize errors
          }
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    if (fitAddonRef.current && xtermRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          if (xtermRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            const { cols, rows } = xtermRef.current;
            wsRef.current.send(`\x01${cols};${rows}`);
          }
        } catch (e) {
          // Ignore
        }
      }, 100);
    }
  }, [isFullscreen]);

  // Reconnect function
  const handleReconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (xtermRef.current) {
      xtermRef.current.clear();
      setError(null);
      connectWebSocket(xtermRef.current, fitAddonRef.current!);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0a0a0a] rounded-lg overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      style={{ minHeight: isFullscreen ? '100vh' : '400px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-dark-900 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-green-400' : 'bg-red-400'
          )} />
          <span className="text-sm text-dark-300">
            {containerName}
          </span>
          {connected && (
            <span className="text-xs text-dark-500">
              (connected)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReconnect}
            title="Reconnect"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Connection status */}
      {(!connected || error) && (
        <div
          className={cn(
            'px-3 py-1 text-xs flex-shrink-0',
            error
              ? 'bg-red-500/20 text-red-400'
              : 'bg-yellow-500/20 text-yellow-400'
          )}
        >
          {error || 'Connecting to container terminal...'}
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 terminal-container"
        style={{
          minHeight: 0,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      />

      {/* Style for xterm canvas optimization */}
      <style>{`
        .terminal-container {
          padding: 4px !important;
        }
        .terminal-container .xterm {
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        .terminal-container .xterm-viewport {
          overflow-y: auto !important;
        }
        .terminal-container .xterm-screen {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        .terminal-container canvas {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}

