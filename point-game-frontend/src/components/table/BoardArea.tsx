import { Coins } from 'lucide-react';
import { PlayingCard } from './PlayingCard';

interface BoardAreaProps {
  boardCards: Array<{ rank: string; suit: string }>;
  totalPot: number;
  street: string;
}

export function BoardArea({ boardCards, totalPot, street }: BoardAreaProps) {
  // Point Game has up to 5 community cards
  const maxCards = 5;
  const emptySlots = maxCards - boardCards.length;

  return (
    <div className="flex flex-col items-center gap-20">
      {/* Street indicator */}
      <div className="px-4 py-1.5 bg-slate-900/80 border border-slate-700 rounded-full">
        <span className="text-sm font-medium text-slate-400">
          {street || 'Waiting'}
        </span>
      </div>

      {/* Community cards */}
      <div className="flex items-center gap-2">
        {boardCards.map((card, i) => (
          <div
            key={i}
            className="transform hover:scale-105 transition-transform"
            style={{
              animation: `cardDeal 0.3s ease-out ${i * 0.1}s both`,
            }}
          >
            <PlayingCard
              rank={card.rank}
              suit={card.suit}
              faceUp={true}
              size="lg"
            />
          </div>
        ))}
        
        {/* Empty card slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-16 h-22 rounded-lg border-2 border-dashed border-slate-700/40 bg-slate-900/20"
          />
        ))}
      </div>

      {/* Pot display */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-500/30 rounded-full">
        <Coins className="w-5 h-5 text-amber-400" />
        <span className="text-lg font-bold text-amber-400">
          ${totalPot.toLocaleString()}
        </span>
      </div>
    </div>
  );
}