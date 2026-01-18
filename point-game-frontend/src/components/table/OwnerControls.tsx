import { useState } from 'react';
import { Play, Pause, Square, AlertTriangle } from 'lucide-react';

interface OwnerControlsProps {
  tableStatus: 'Waiting' | 'Running' | 'Paused' | 'Ended';
  onStartGame: () => void;
  onTogglePause: () => void;
  onEndGame: () => void;
  isLoading?: boolean;
}

export function OwnerControls({
  tableStatus,
  onStartGame,
  onTogglePause,
  onEndGame,
  isLoading = false,
}: OwnerControlsProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleEndClick = () => {
    if (showEndConfirm) {
      onEndGame();
      setShowEndConfirm(false);
    } else {
      setShowEndConfirm(true);
      // Auto-reset confirmation after 5 seconds
      setTimeout(() => setShowEndConfirm(false), 5000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Start Game - only when waiting */}
      {tableStatus === 'Waiting' && (
        <button
          onClick={onStartGame}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Play className="w-4 h-4" />
          Start Game
        </button>
      )}

      {/* Pause/Unpause - only when running or paused */}
      {(tableStatus === 'Running' || tableStatus === 'Paused') && (
        <button
          onClick={onTogglePause}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
            tableStatus === 'Paused'
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          {tableStatus === 'Paused' ? (
            <>
              <Play className="w-4 h-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          )}
        </button>
      )}

      {/* End Game - only when not ended */}
      {tableStatus !== 'Ended' && tableStatus !== 'Waiting' && (
        <button
          onClick={handleEndClick}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
            showEndConfirm
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400'
          }`}
        >
          {showEndConfirm ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              Confirm End
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              End Game
            </>
          )}
        </button>
      )}
    </div>
  );
}