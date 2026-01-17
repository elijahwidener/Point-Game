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

function CardBackPattern({ patternId }: { patternId: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140">
      <defs>
        <linearGradient id={`${patternId}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8a61aff" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width="100" height="140" fill={`url(#${patternId})`} />
      <rect x="8" y="8" width="84" height="124" rx="4" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.6" />
      <polygon
        points="50,35 65,70 50,105 35,70"
        fill={`url(#${patternId}-grad)`}
        stroke="#f5b039ff"
        strokeWidth="1"
      />
      <circle cx="20" cy="20" r="6" fill="none" stroke="#fbb131ff" strokeWidth="0.7" opacity="1" />
      <circle cx="80" cy="20" r="6" fill="none" stroke="#fbb131ff" strokeWidth="0.7" opacity="1" />
      <circle cx="20" cy="120" r="6" fill="none" stroke="#fbb131ff" strokeWidth="0.7" opacity="1" />
      <circle cx="80" cy="120" r="6" fill="none" stroke="#fbb131ff" strokeWidth="0.7" opacity="1" />
    </svg>
  );
}

export function PlayingCard({ rank, suit, faceUp = true, size = 'md', className = '' }: CardProps) {
  const sizeClass = SIZE_CLASSES[size];
  const suitData = suit ? SUIT_SYMBOLS[suit] : null;
  const patternId = useMemo(() => `cardback-${Math.random().toString(36).slice(2, 9)}`, []);

  if (!faceUp) {
    return (
      <div
        className={`${sizeClass} rounded-lg shadow-lg overflow-hidden relative ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
          border: '2px solid #334155',
        }}
      >
        <CardBackPattern patternId={patternId} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-lg shadow-lg bg-white flex flex-col justify-between p-1 relative ${className}`}
      style={{ border: '1px solid #e2e8f0' }}
    >
      <div className="flex flex-col items-center leading-none" style={{ color: suitData?.color || '#1e293b' }}>
        <span className="font-bold">{rank}</span>
        <span className="text-lg -mt-1">{suitData?.symbol}</span>
      </div>
    </div>
  );
}

export function MiniCardStack({ count, className = '' }: { count: number; className?: string }) {
  if (count === 0) return null;

  return (
    <div className={`relative ${className}`} style={{ width: '56px', height: '56px' }}>
      {Array.from({ length: count }).map((_, i) => {
        const patternId = `stack-${i}`;
        return (
          <div
            key={i}
            className="absolute rounded overflow-hidden"
            style={{
              width: '32px',
              height: '44px',
              left: `${i * 4}px`,
              top: `${i * 3}px`,
              zIndex: i,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
              border: '1.5px solid #475569',
            }}
          >
            <CardBackPattern patternId={patternId} />
          </div>
        );
      })}

      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{count}</span>
      </div>
    </div>
  );
}
