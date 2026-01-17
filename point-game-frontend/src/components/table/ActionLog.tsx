import { useState, useEffect, useRef } from 'react';
import { History, ChevronDown, ChevronUp, X, Check, TrendingUp, Flag, Eye } from 'lucide-react';
import { useCallback } from 'react';

export interface ActionLogEntry {
  id: string;
  playerName: string;
  action: 'fold' | 'check' | 'call' | 'raise' | 'declare' | 'post_blind' | 'post_ante';
  amount?: number;
  declaration?: 'high' | 'low' | 'both';
  timestamp: number;
}

interface ActionLogProps {
  entries: ActionLogEntry[];
  maxVisible?: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  fold: <X className="w-3 h-3 text-red-400" />,
  check: <Check className="w-3 h-3 text-emerald-400" />,
  call: <Flag className="w-3 h-3 text-blue-400" />,
  raise: <TrendingUp className="w-3 h-3 text-amber-400" />,
  declare: <Eye className="w-3 h-3 text-purple-400" />,
  post_blind: <Flag className="w-3 h-3 text-slate-400" />,
  post_ante: <Flag className="w-3 h-3 text-slate-400" />,
};

const ACTION_COLORS: Record<string, string> = {
  fold: 'text-red-400',
  check: 'text-emerald-400',
  call: 'text-blue-400',
  raise: 'text-amber-400',
  declare: 'text-purple-400',
  post_blind: 'text-slate-400',
  post_ante: 'text-slate-400',
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
      return `declared ${entry.declaration?.toUpperCase()}`;
    case 'post_blind':
      return entry.amount ? `posted blind $${entry.amount}` : 'posted blind';
    case 'post_ante':
      return entry.amount ? `posted ante $${entry.amount}` : 'posted ante';
    default:
      return entry.action;
  }
}

export function ActionLog({ entries, maxVisible = 5 }: ActionLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries come in
  useEffect(() => {
    if (logRef.current && !isExpanded) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries, isExpanded]);

  if (entries.length === 0) {
    return null;
  }

  const visibleEntries = isExpanded ? entries : entries.slice(-maxVisible);

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Action Log</span>
          <span className="text-xs text-slate-500">({entries.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Entries */}
      <div
        ref={logRef}
        className={`overflow-y-auto transition-all ${
          isExpanded ? 'max-h-60' : 'max-h-32'
        }`}
      >
        <div className="p-2 space-y-1">
          {visibleEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/30 animate-fadeIn"
            >
              {ACTION_ICONS[entry.action]}
              <span className="text-xs text-slate-400 font-medium">
                {entry.playerName}
              </span>
              <span className={`text-xs ${ACTION_COLORS[entry.action]}`}>
                {formatAction(entry)}
              </span>
            </div>
          ))}
        </div>
      </div>

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