import { useState, useEffect, useRef, useCallback } from 'react';
import { History, ChevronDown, ChevronUp, X, Check, TrendingUp, Flag, Eye, Award, Trash2, GripVertical } from 'lucide-react';

export type ActionType = 
  | 'fold' 
  | 'check' 
  | 'call' 
  | 'raise' 
  | 'declare' 
  | 'post_blind' 
  | 'post_ante'
  | 'showdown_winner'  
  | 'discards'         
  | 'new_hand';        

export interface ActionLogEntry {
  id: string;
  playerName: string;
  action: ActionType;
  amount?: number;
  declaration?: 'high' | 'low' | 'both' | 'hidden';
  side?: 'high' | 'low';
  points?: number;
  cards?: string;
  message?: string;
  timestamp: number;
}

interface ActionLogProps {
  entries: ActionLogEntry[];
  defaultMaxVisible?: number;
}

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  fold: <X className="w-3 h-3 text-red-400" />,
  check: <Check className="w-3 h-3 text-emerald-400" />,
  call: <Flag className="w-3 h-3 text-blue-400" />,
  raise: <TrendingUp className="w-3 h-3 text-amber-400" />,
  declare: <Eye className="w-3 h-3 text-purple-400" />,
  post_blind: <Flag className="w-3 h-3 text-slate-400" />,
  post_ante: <Flag className="w-3 h-3 text-slate-400" />,
  showdown_winner: <Award className="w-3 h-3 text-amber-400" />,
  discards: <Trash2 className="w-3 h-3 text-orange-400" />,
  new_hand: <History className="w-3 h-3 text-cyan-400" />,
};

const ACTION_COLORS: Record<ActionType, string> = {
  fold: 'text-red-400',
  check: 'text-emerald-400',
  call: 'text-blue-400',
  raise: 'text-amber-400',
  declare: 'text-purple-400',
  post_blind: 'text-slate-400',
  post_ante: 'text-slate-400',
  showdown_winner: 'text-amber-400',
  discards: 'text-orange-400',
  new_hand: 'text-cyan-400',
};

function formatAction(entry: ActionLogEntry): string {
  switch (entry.action) {
    case 'fold':
      return 'folded';
    case 'check':
      return 'checked';
    case 'call':
      return entry.amount ? `called $${entry.amount}` : 'called';
    case 'raise':
      return entry.amount ? `raised to $${entry.amount}` : 'raised';
    case 'declare':
        return 'declared';
      // return `declared ${entry.declaration?.toUpperCase()}`;
    case 'post_blind':
      return entry.amount ? `posted blind $${entry.amount}` : 'posted blind';
    case 'post_ante':
      return entry.amount ? `posted ante $${entry.amount}` : 'posted ante';
    case 'showdown_winner':
      return `won $${entry.amount} on ${entry.side?.toUpperCase()}`;
    case 'discards':
      return `discarded ${entry.cards}`;
    case 'new_hand':
      return entry.message || 'New hand starting';
    default:
      return entry.action;
  }
}

const DEFAULT_SIZE = { width: 280, height: 200 };
const MIN_SIZE = { width: 200, height: 120 };
const MAX_SIZE = { width: 500, height: 400 };

export function ActionLog({ entries, defaultMaxVisible = 50 }: ActionLogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  // Use top/left positioning (simpler than bottom)
  const [position, setPosition] = useState({ x: 16, y: 0 }); // Will be set on mount
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount
  useEffect(() => {
    if (!initialized) {
      setPosition({
        x: 16,
        y: window.innerHeight - DEFAULT_SIZE.height - 120, // 120px from bottom for action bar
      });
      setInitialized(true);
    }
  }, [initialized]);

  // Auto-scroll to bottom when new entries come in
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  // Dragging handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - size.width - 16;
    const maxY = window.innerHeight - (isExpanded ? size.height : 44) - 16;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(60, Math.min(maxY, newY)), // 60px for header
    });
  }, [isDragging, dragOffset, size, isExpanded]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resizing handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX - position.x;
    const newHeight = e.clientY - position.y;
    
    setSize({
      width: Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, newWidth)),
      height: Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, newHeight)),
    });
  }, [isResizing, position]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Don't render until position is initialized
  if (!initialized) return null;

  const visibleEntries = entries.slice(-defaultMaxVisible);

  return (
    <div
      ref={containerRef}
      className={`fixed bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden shadow-2xl ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isExpanded ? size.height : 'auto',
        zIndex: 50,
        userSelect: isDragging || isResizing ? 'none' : 'auto',
      }}
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleDragStart}
        className={`flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-500" />
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Action Log</span>
          <span className="text-xs text-slate-500">({entries.length})</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Entries */}
      {isExpanded && (
        <div
          ref={logRef}
          className="overflow-y-auto"
          style={{ height: size.height - 44 }}
        >
          {visibleEntries.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No actions yet
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/30 animate-fadeIn"
                >
                  {ACTION_ICONS[entry.action]}
                  <span className="text-xs text-slate-400 font-medium truncate max-w-[80px]">
                    {entry.playerName}
                  </span>
                  <span className={`text-xs ${ACTION_COLORS[entry.action]} truncate`}>
                    {formatAction(entry)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resize Handle */}
      {isExpanded && (
        <div
          className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-4 h-4 text-slate-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// Hook to manage action log state
export function useActionLog() {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);

  const addEntry = useCallback((entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActionLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setEntries((prev) => [...prev, newEntry]);
  }, []);

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  return { entries, addEntry, clearLog };
}