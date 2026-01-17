import { LogOut, Coffee, ArrowLeft } from 'lucide-react';

interface PlayerControlsProps {
  isSeated: boolean;
  isSittingOut: boolean;
  onLeaveSeat: () => void;
  onToggleSitOut: () => void;
  isLoading?: boolean;
}

export function PlayerControls({
  isSeated,
  isSittingOut,
  onLeaveSeat,
  onToggleSitOut,
  isLoading = false,
}: PlayerControlsProps) {
  if (!isSeated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sit Out Toggle */}
      <button
        onClick={onToggleSitOut}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isSittingOut
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
        }`}
      >
        {isSittingOut ? (
          <>
            <ArrowLeft className="w-4 h-4" />
            I'm Back
          </>
        ) : (
          <>
            <Coffee className="w-4 h-4" />
            Sit Out
          </>
        )}
      </button>

      {/* Leave Seat */}
      <button
        onClick={onLeaveSeat}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Leave Seat
      </button>
    </div>
  );
}