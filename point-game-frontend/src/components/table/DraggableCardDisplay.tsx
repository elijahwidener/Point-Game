import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Move, Minimize2, Maximize2 } from 'lucide-react';
import { PlayingCard } from './PlayingCard';

interface Card {
  rank: string;
  suit: string;
}

interface DraggableCardDisplayProps {
  cards: Card[];
  stack: number;
  className?: string;
}

type CardSize = 'sm' | 'md' | 'lg';

const SIZE_CONFIG: Record<CardSize, { cardClass: string; label: string; cardSize: CardSize }> = {
  sm: { cardClass: 'w-10 h-14', label: 'S', cardSize: 'sm' },
  md: { cardClass: 'w-14 h-20', label: 'M', cardSize: 'md' },
  lg: { cardClass: 'w-20 h-28', label: 'L', cardSize: 'lg' },
};

function getCardValue(rank: string): { low: number; high: number } {
  const r = rank.toUpperCase();
  if (r === 'A') return { low: 1, high: 11 };
  if (['K', 'Q', 'J', 'T', '10'].includes(r)) return { low: 10, high: 10 };
  const num = parseInt(r, 10);
  if (!isNaN(num)) return { low: num, high: num };
  return { low: 0, high: 0 };
}

function calculatePoints(cards: Card[]): { low: number; high: number; hasAce: boolean } {
  let low = 0;
  let high = 0;
  let hasAce = false;

  for (const card of cards) {
    const value = getCardValue(card.rank);
    low += value.low;
    high += value.high;
    if (value.low !== value.high) {
      hasAce = true;
    }
  }

  return { low, high, hasAce };
}

export function DraggableCardDisplay({ cards, stack, className = '' }: DraggableCardDisplayProps) {
  // Position state - default to top right
  const [position, setPosition] = useState({ x: window.innerWidth - 280, y: 100 });

  const points = useMemo(() => calculatePoints(cards), [cards]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cardSize, setCardSize] = useState<CardSize>('md');
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cardDisplayPosition');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed.position || { x: window.innerWidth - 280, y: 100 });
        setCardSize(parsed.size || 'md');
      } catch {
        // Invalid saved data, use defaults
      }
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('cardDisplayPosition', JSON.stringify({ position, size: cardSize }));
  }, [position, cardSize]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 150, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Cycle through sizes
  const cycleSize = useCallback(() => {
    setCardSize(prev => {
      if (prev === 'sm') return 'md';
      if (prev === 'md') return 'lg';
      return 'sm';
    });
  }, []);

  const sizeConfig = SIZE_CONFIG[cardSize];

  if (!cards || cards.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl z-20 ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Header with drag handle */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-400 font-medium">Your Cards</span>
        </div>
        
        {/* Size toggle button */}
        <button
          onClick={cycleSize}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
          title="Change card size"
        >
          {cardSize === 'sm' ? (
            <Maximize2 className="w-3 h-3" />
          ) : cardSize === 'lg' ? (
            <Minimize2 className="w-3 h-3" />
          ) : (
            <Maximize2 className="w-3 h-3" />
          )}
          <span>{sizeConfig.label}</span>
        </button>
      </div>

        {/* Cards */}
        <div className="p-3">
            <div className="flex gap-2 flex-wrap justify-center">
            {cards.map((card, i) => (
                <PlayingCard
                key={i}
                rank={card.rank}
                suit={card.suit}
                faceUp={true}
                size={sizeConfig.cardSize}
                />
            ))}
            </div>
            
            {/* Point  and stack total display */}
            <div className="mt-3 flex justify-center items-center gap-3">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700">
                <span className="text-xs text-slate-400">Points:</span>
                {points.hasAce ? (
                // Show both values when aces are present (high/low)
                <span className="text-sm font-bold">
                    <span className="text-red-400">{points.high}</span>
                    <span className="text-slate-500 mx-0.5">/</span>
                    <span className="text-blue-400">{points.low}</span>
                </span>
                ) : (
                // Single value when no aces
                <span className="text-sm font-bold text-amber-400">{points.low}</span>
                )}
            </div>
            {/* Stack display */}
            {/* <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700">

                <span className="text-sm font-bold text-amber-400">${stack.toLocaleString()}</span>
                </div>
            </div> */}
         </div>
      </div>
    </div>
  );
}