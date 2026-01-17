import { useMemo } from 'react';

interface CardProps {
  rank?: string;
  suit?: string;
  faceUp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// SVG suit symbols
const SUIT_SYMBOLS: Record<string, { symbol: string; color: string }> = {
  Hearts: { symbol: '♥', color: '#ef4444' },
  Diamonds: { symbol: '♦', color: '#ef4444' },
  Clubs: { symbol: '♣', color: '#1e293b' },
  Spades: { symbol: '♠', color: '#1e293b' },
  hearts: { symbol: '♥', color: '#ef4444' },
  diamonds: { symbol: '♦', color: '#ef4444' },
  clubs: { symbol: '♣', color: '#1e293b' },
  spades: { symbol: '♠', color: '#1e293b' },
  h: { symbol: '♥', color: '#ef4444' },
  d: { symbol: '♦', color: '#ef4444' },
  c: { symbol: '♣', color: '#1e293b' },
  s: { symbol: '♠', color: '#1e293b' },
};

const SIZE_CLASSES = {
  sm: 'w-8 h-11 text-xs',
  md: 'w-12 h-16 text-sm',
  lg: 'w-16 h-22 text-base',
};

export function PlayingCard({ rank, suit, faceUp = true, size = 'md', className = '' }: CardProps) {
  const sizeClass = SIZE_CLASSES[size];
  const suitData = suit ? SUIT_SYMBOLS[suit] : null;

  // Generate a deterministic pattern for card back
  const patternId = useMemo(() => `cardback-${Math.random().toString(36).substr(2, 9)}`, []);

  if (!faceUp) {
    return (
      <div
        className={`${sizeClass} rounded-lg shadow-lg overflow-hidden relative ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
          border: '2px solid #334155',
        }}
      >
        {/* Elegant card back pattern */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140">
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="10" height="10">
              <circle cx="5" cy="5" r="1" fill="#f59e0b" opacity="0.4" />
            </pattern>
            <linearGradient id={`${patternId}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Background pattern */}
          <rect width="100" height="140" fill={`url(#${patternId})`} />
          
          {/* Inner border */}
          <rect x="8" y="8" width="84" height="124" rx="4" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
          
          {/* Center diamond */}
          <polygon 
            points="50,35 65,70 50,105 35,70" 
            fill={`url(#${patternId}-grad)`} 
            stroke="#f59e0b" 
            strokeWidth="1"
          />
          
          {/* Corner decorations */}
          <circle cx="20" cy="20" r="6" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.6" />
          <circle cx="80" cy="20" r="6" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.6" />
          <circle cx="20" cy="120" r="6" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.6" />
          <circle cx="80" cy="120" r="6" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.6" />
        </svg>
      </div>
    );
  }

  // Face up card
  return (
    <div
      className={`${sizeClass} rounded-lg shadow-lg bg-white flex flex-col justify-between p-1 relative ${className}`}
      style={{
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Top left corner */}
      <div className="flex flex-col items-center leading-none" style={{ color: suitData?.color || '#1e293b' }}>
        <span className="font-bold">{rank}</span>
        <span className="text-lg -mt-1">{suitData?.symbol}</span>
      </div>

      {/* Center suit (large) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-3xl opacity-20" style={{ color: suitData?.color || '#1e293b' }}>
          {suitData?.symbol}
        </span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div
        className="flex flex-col items-center leading-none self-end rotate-180"
        style={{ color: suitData?.color || '#1e293b' }}
      >
        <span className="font-bold">{rank}</span>
        <span className="text-lg -mt-1">{suitData?.symbol}</span>
      </div>
    </div>
  );
}

// Mini card for showing multiple cards in hand
export function MiniCardStack({ count, className = '' }: { count: number; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: '44px', height: '60px' }}>
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${i * 4}px`,
            top: `${i * 2}px`,
            zIndex: i,
          }}
        >
          <PlayingCard faceUp={false} size="sm" />
        </div>
      ))}
    </div>
  );
}