import { User, Clock, Target, Check, X, TrendingUp, Flag, Eye } from 'lucide-react';
import type { DisplaySeat } from '../../stores/gameStore';
import { MiniCardStack, PlayingCard } from './PlayingCard';

// Action badge types
export type LastActionType = 'check' | 'call' | 'raise' | 'fold' | 'declare' | null;

interface PlayerSeatProps {
  seat: DisplaySeat;
  isCurrentPlayer: boolean;
  isButton: boolean;
  isMe: boolean;
  onSeatClick?: () => void;
  isEmpty: boolean;
  hideEmptySeats?: boolean;
  lastAction?: LastActionType;
  lastActionAmount?: number;
}

// Action badge configuration
const ACTION_BADGE_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  bgColor: string; 
  textColor: string;
  label: string;
}> = {
  check: {
    icon: <Check className="w-3 h-3" />,
    bgColor: 'bg-emerald-500/90',
    textColor: 'text-white',
    label: 'CHECK',
  },
  call: {
    icon: <Flag className="w-3 h-3" />,
    bgColor: 'bg-blue-500/90',
    textColor: 'text-white',
    label: 'CALL',
  },
  raise: {
    icon: <TrendingUp className="w-3 h-3" />,
    bgColor: 'bg-amber-500/90',
    textColor: 'text-slate-900',
    label: 'RAISE',
  },
  fold: {
    icon: <X className="w-3 h-3" />,
    bgColor: 'bg-red-500/90',
    textColor: 'text-white',
    label: 'FOLD',
  },
  declare: {
    icon: <Eye className="w-3 h-3" />,
    bgColor: 'bg-purple-500/90',
    textColor: 'text-white',
    label: 'DECLARED',
  },
};

export function PlayerSeat({
  seat,
  isCurrentPlayer,
  isButton,
  isMe,
  onSeatClick,
  isEmpty,
  hideEmptySeats = false,
  lastAction,
  lastActionAmount,
}: PlayerSeatProps) {
  if (isEmpty) {
    if (hideEmptySeats) return null;
    return (
      <button
        onClick={onSeatClick}
        className="group relative flex flex-col items-center justify-center w-full h-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-600/50 hover:border-amber-500/60 hover:bg-slate-800/30 transition-all duration-300"
      >
        <div className="p-3 rounded-full bg-slate-800/50 group-hover:bg-amber-500/20 transition-colors">
          <User className="w-6 h-6 text-slate-500 group-hover:text-amber-400" />
        </div>
        <span className="mt-2 text-xs text-slate-500 group-hover:text-amber-400 font-medium">
          Open Seat
        </span>
        <span className="text-[10px] text-slate-600 group-hover:text-amber-500/70">
          Click to join
        </span>
      </button>
    );
  }

  const actionConfig = lastAction ? ACTION_BADGE_CONFIG[lastAction] : null;

  return (
    <div
      className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
        isCurrentPlayer
          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500 shadow-lg shadow-amber-500/20 animate-pulse-border'
          : seat.folded || !seat.active
          ? 'bg-slate-900/60 border border-slate-700/50 opacity-50'
          : 'bg-slate-800/80 border border-slate-700'
      } ${isMe ? 'ring-2 ring-cyan-500/50' : ''}`}
    >
      {/* Button indicator */}
      {isButton && (
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-amber-400">
          D
        </div>
      )}

      {/* Active turn indicator */}
      {isCurrentPlayer && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-slate-900 rounded-full text-[10px] font-bold">
          <Clock className="w-3 h-3" />
          ACTION
        </div>
      )}

      {/* Action badge - shows last action taken */}
      {actionConfig && !isCurrentPlayer && (
        <div 
          className={`absolute -top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 ${actionConfig.bgColor} ${actionConfig.textColor} rounded-full text-[10px] font-bold shadow-lg animate-action-badge`}
        >
          {actionConfig.icon}
          <span>
            {actionConfig.label}
            {lastAction === 'raise' && lastActionAmount ? ` $${lastActionAmount}` : ''}
            {lastAction === 'call' && lastActionAmount ? ` $${lastActionAmount}` : ''}
          </span>
        </div>
      )}

      {/* Player avatar and name */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex flex-col">
          <span className={`text-sm font-medium truncate max-w-[80px] ${isMe ? 'text-cyan-400' : 'text-slate-200'}`}>
            {isMe ? 'You' : (seat.username?.slice(0, 8) || 'Player')}
          </span>
          {seat.folded && (
            <span className="text-[10px] text-red-400 font-medium">FOLDED</span>
          )}
          {!seat.active && !seat.folded && (
            <span className="text-[10px] text-orange-400 font-medium">SITTING OUT</span>
          )}
          {seat.declaration && (
            <span className={`text-[10px] font-bold ${
              seat.declaration === 'high' ? 'text-red-400' :
              seat.declaration === 'low' ? 'text-blue-400' :
              'text-purple-400'
            }`}>
              {seat.declaration.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Hole cards */}
      <div className="flex gap-1 mb-2">
        {isMe && seat.holeCards && seat.holeCards.length > 0 ? (
          // Show my actual cards
          seat.holeCards.map((card, i) => (
            <PlayingCard
              key={i}
              rank={card.rank}
              suit={card.suit}
              faceUp={true}
              size="sm"
            />
          ))
        ) : seat.holeCards && seat.holeCards.length > 0 ? (
          // Show card backs for other players
          <MiniCardStack count={seat.holeCards.length} />
        ) : (
          // No cards
          <div className="flex gap-1">
            <div className="w-8 h-11 rounded border border-slate-700 border-dashed opacity-30" />
            <div className="w-8 h-11 rounded border border-slate-700 border-dashed opacity-30" />
          </div>
        )}
      </div>

      {/* Stack */}
      <div className="flex items-center gap-1 px-3 py-1 bg-slate-900/60 rounded-full">
        <span className="text-amber-400 font-bold text-sm">
          ${seat.stack.toLocaleString()}
        </span>
      </div>

      {/* Bet (shown below the seat if there's a bet) */}
      {seat.bet > 0 && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-amber-500/90 text-slate-900 rounded-full text-xs font-bold shadow-lg">
          <Target className="w-3 h-3" />
          ${seat.bet}
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4), 0 10px 15px -3px rgba(245, 158, 11, 0.2);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(245, 158, 11, 0), 0 10px 15px -3px rgba(245, 158, 11, 0.2);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        
        @keyframes action-badge-in {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        .animate-action-badge {
          animation: action-badge-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}