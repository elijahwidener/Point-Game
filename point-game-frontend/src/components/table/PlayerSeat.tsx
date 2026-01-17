import { User, Clock, Target } from 'lucide-react';
import type { DisplaySeat } from '../../stores/gameStore';
import { MiniCardStack, PlayingCard } from './PlayingCard';

interface PlayerSeatProps {
  seat: DisplaySeat;
  isCurrentPlayer: boolean;
  isButton: boolean;
  isMe: boolean;
  onSeatClick?: () => void;
  isEmpty: boolean;
  hideEmptySeats?: boolean;
}

export function PlayerSeat({
  seat,
  isCurrentPlayer,
  isButton,
  isMe,
  onSeatClick,
  isEmpty,
  hideEmptySeats = false,
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

  return (
    <div
      className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
        isCurrentPlayer
          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500 shadow-lg shadow-amber-500/20'
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

      {/* Player avatar and name */}
      <div className="flex items-center gap-2 mb-2">
        {/* This can be used later for a profile pic area or something */}
        {/* <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isMe
              ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
              : 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-300'
          }`}
        >
          {seat.username ? seat.username.slice(0, 2).toUpperCase() : '?'}
        </div> */}
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
    </div>
  );
}