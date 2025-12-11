import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Maximize2, Minimize2, Settings, Trash2, Server, ChevronDown } from 'lucide-react';
import { Button, Card, Dropdown, DropdownItem, DropdownDivider } from '@/components/ui';
import { cn } from '@/utils/cn';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'info';
  content: string;
  timestamp?: Date;
}

interface TerminalTab {
  id: string;
  title: string;
  history: TerminalLine[];
  cwd: string;
}

// Simulated command responses
const executeCommand = (cmd: string, cwd: string): { output: string; type: 'output' | 'error' } => {
  const [command, ...args] = cmd.trim().split(' ');
  
  switch (command) {
    case 'ls':
      return {
        output: `config/  logs/  www/  backup/
nginx.conf  docker-compose.yml  app.log
database.sql  backup.tar.gz`,
        type: 'output',
      };
    case 'pwd':
      return { output: cwd, type: 'output' };
    case 'whoami':
      return { output: 'root', type: 'output' };
    case 'date':
      return { output: new Date().toString(), type: 'output' };
    case 'uptime':
      return { output: ' 14:32:21 up 45 days,  3:42,  2 users,  load average: 0.52, 0.58, 0.59', type: 'output' };
    case 'df':
      return {
        output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       500G  234G  266G  47% /
tmpfs            16G     0   16G   0% /dev/shm`,
        type: 'output',
      };
    case 'free':
      return {
        output: `              total        used        free      shared  buff/cache   available
Mem:       32768000    12582912    10485760      524288     9699328    19660800
Swap:       8388608           0     8388608`,
        type: 'output',
      };
    case 'top':
      return {
        output: `top - 14:32:21 up 45 days,  3:42,  2 users,  load average: 0.52, 0.58, 0.59
Tasks: 156 total,   1 running, 155 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  0.8 sy,  0.0 ni, 96.5 id,  0.3 wa,  0.0 hi,  0.1 si
MiB Mem :  32768.0 total,  10240.0 free,  12288.0 used,  10240.0 buff/cache
MiB Swap:   8192.0 total,   8192.0 free,      0.0 used.  19200.0 avail Mem`,
        type: 'output',
      };
    case 'help':
      return {
        output: `Available commands: ls, pwd, whoami, date, uptime, df, free, top, clear, help`,
        type: 'output',
      };
    case 'clear':
      return { output: '__CLEAR__', type: 'output' };
    case '':
      return { output: '', type: 'output' };
    default:
      return { output: `bash: ${command}: command not found`, type: 'error' };
  }
};

function TerminalComponent({ tab, onUpdate }: { tab: TerminalTab; onUpdate: (history: TerminalLine[]) => void }) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [tab.history]);

  const handleCommand = () => {
    if (!input.trim()) return;

    const newHistory: TerminalLine[] = [
      ...tab.history,
      { type: 'input', content: input, timestamp: new Date() },
    ];

    const result = executeCommand(input, tab.cwd);
    
    if (result.output === '__CLEAR__') {
      onUpdate([]);
    } else if (result.output) {
      newHistory.push({ type: result.type, content: result.output, timestamp: new Date() });
      onUpdate(newHistory);
    } else {
      onUpdate(newHistory);
    }

    setCommandHistory([...commandHistory, input]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion could be implemented here
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onUpdate([]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full bg-dark-950 font-mono text-sm p-4 overflow-auto cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Welcome message */}
      {tab.history.length === 0 && (
        <div className="text-dark-500 mb-4">
          <p>Welcome to VPanel Terminal</p>
          <p>Type 'help' for available commands</p>
        </div>
      )}

      {/* History */}
      {tab.history.map((line, i) => (
        <div key={i} className="mb-1">
          {line.type === 'input' ? (
            <div className="flex items-center gap-2">
              <span className="text-green-400">root@vpanel</span>
              <span className="text-dark-500">:</span>
              <span className="text-blue-400">{tab.cwd}</span>
              <span className="text-dark-500">$</span>
              <span className="text-dark-100 ml-1">{line.content}</span>
            </div>
          ) : line.type === 'error' ? (
            <pre className="text-red-400 whitespace-pre-wrap">{line.content}</pre>
          ) : (
            <pre className="text-dark-300 whitespace-pre-wrap">{line.content}</pre>
          )}
        </div>
      ))}

      {/* Input line */}
      <div className="flex items-center gap-2">
        <span className="text-green-400">root@vpanel</span>
        <span className="text-dark-500">:</span>
        <span className="text-blue-400">{tab.cwd}</span>
        <span className="text-dark-500">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-dark-100 ml-1"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export default function Terminal() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: '1',
      title: 'Terminal 1',
      history: [],
      cwd: '/var/www',
    }
  ]);
  const [activeTab, setActiveTab] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const addTab = () => {
    const newId = String(Date.now());
    const newTab: TerminalTab = {
      id: newId,
      title: `Terminal ${tabs.length + 1}`,
      history: [],
      cwd: '/var/www',
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[0].id);
    }
  };

  const updateTabHistory = (id: string, history: TerminalLine[]) => {
    setTabs(tabs.map((t) => (t.id === id ? { ...t, history } : t)));
  };

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className={cn('flex flex-col', isFullscreen ? 'fixed inset-0 z-50 bg-dark-950' : 'h-[calc(100vh-8rem)]')}>
      {/* Header */}
      {!isFullscreen && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark-100">Terminal</h1>
            <p className="text-dark-400">Web-based SSH terminal</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
              Settings
            </Button>
          </div>
        </div>
      )}

      {/* Terminal Card */}
      <Card className={cn('flex-1 flex flex-col overflow-hidden', isFullscreen && 'rounded-none border-0')}>
        {/* Tab bar */}
        <div className="flex items-center bg-dark-900 border-b border-dark-700">
          <div className="flex-1 flex items-center overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 border-r border-dark-700 cursor-pointer min-w-0',
                  tab.id === activeTab ? 'bg-dark-800 text-dark-100' : 'text-dark-400 hover:bg-dark-800/50'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {/* Status indicator */}
                <span className="w-2 h-2 rounded-full flex-shrink-0 bg-green-400" />
                
                {/* Tab info */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm truncate">{tab.title}</span>
                </div>
                
                {/* Close button */}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-dark-700 rounded transition-all flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            
            {/* Add new tab button */}
            <button
              onClick={addTab}
              className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => updateTabHistory(activeTab, [])}
              className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Terminal content */}
        <div className="flex-1 overflow-hidden">
          {currentTab && (
            <TerminalComponent
              key={currentTab.id}
              tab={currentTab}
              onUpdate={(history) => updateTabHistory(currentTab.id, history)}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
