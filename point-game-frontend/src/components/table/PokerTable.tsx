import { useMemo } from 'react';
import type { DisplayState, DisplaySeat } from '../../stores/gameStore';
import { PlayerSeat, type LastActionType } from './PlayerSeat';
import { BoardArea } from './BoardArea';

interface PokerTableProps {
  gameState: DisplayState | null;
  myUserID: string;
  onSeatClick: (seatIndex: number) => void;
  isSeated?: boolean;
  // Map of seat index to their last action
  seatActions?: Map<number, { action: LastActionType; amount?: number }>;
}

// Seat positions around an oval table (8 seats)
// Positions are relative percentages from center
const SEAT_POSITIONS = [
  { x: 50, y: 100, label: 'bottom' },      // Seat 0 - bottom center
  { x: 15, y: 85, label: 'bottom-left' },  // Seat 1
  { x: 0, y: 50, label: 'left' },          // Seat 2 - left
  { x: 15, y: 15, label: 'top-left' },     // Seat 3
  { x: 50, y: 0, label: 'top' },           // Seat 4 - top center
  { x: 85, y: 15, label: 'top-right' },    // Seat 5
  { x: 100, y: 50, label: 'right' },       // Seat 6 - right
  { x: 85, y: 85, label: 'bottom-right' }, // Seat 7
];

export function PokerTable({ 
  gameState, 
  myUserID, 
  onSeatClick, 
  isSeated = false,
  seatActions,
}: PokerTableProps) {
  // Calculate total pot
  const totalPot = useMemo(() => {
    if (!gameState?.pots) return 0;
    return gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
  }, [gameState?.pots]);

  // Get seats with fallback for empty state
  const seats: DisplaySeat[] = useMemo(() => {
    if (!gameState?.seats) {
      return Array.from({ length: 8 }, (_, i) => ({
        seat: i,
        playerID: '',
        username: '',
        stack: 0,
        bet: 0,
        holeCards: null,
        folded: false,
        active: false,
      }));
    }
    return gameState.seats;
  }, [gameState?.seats]);

  return (
    <div className="relative w-full aspect-[16/10] max-w-5xl mx-auto">
      {/* Table surface */}
      <div className="absolute inset-[8%] rounded-[50%] bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 shadow-2xl border-8 border-amber-900/80 overflow-hidden">
        {/* Inner border ring */}
        <div className="absolute inset-4 rounded-[50%] border-2 border-emerald-700/50" />

        {/* Center logo (faded) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/transparent_point_game.png"
            alt="Point Game"
            className="w-56 h-56 object-contain opacity-15"
          />
        </div>

        {/* Board area - community cards and pot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <BoardArea
            boardCards={gameState?.boardCards || []}
            totalPot={totalPot}
            street={gameState?.street || 'Waiting'}
          />
        </div>
      </div>

      {/* Wood rail (outer ring) */}
      <div className="absolute inset-0 rounded-[50%] pointer-events-none" style={{
        background: 'linear-gradient(135deg, #78350f 0%, #451a03 50%, #78350f 100%)',
        mask: 'radial-gradient(ellipse 48% 48% at 50% 50%, transparent 95%, black 95%)',
        WebkitMask: 'radial-gradient(ellipse 48% 48% at 50% 50%, transparent 95%, black 95%)',
      }} />

      {/* Player seats */}
      {seats.map((seat, index) => {
        const position = SEAT_POSITIONS[index];
        const isEmpty = !seat.playerID;
        const isCurrentPlayer = gameState?.currentPlayerSeat === index && !isEmpty;
        const isButton = gameState?.button === index && !isEmpty;
        const isMe = seat.playerID === myUserID;
        
        // Get last action for this seat
        const seatActionData = seatActions?.get(index);

        return (
          <div
            key={index}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: '140px',
            }}
          >
            <PlayerSeat
              seat={seat}
              isCurrentPlayer={isCurrentPlayer}
              isButton={isButton}
              isMe={isMe}
              onSeatClick={!isSeated && isEmpty ? () => onSeatClick(index) : undefined}
              isEmpty={isEmpty}
              hideEmptySeats={isSeated}
              lastAction={seatActionData?.action}
              lastActionAmount={seatActionData?.amount}
            />
          </div>
        );
      })}
    </div>
  );
}