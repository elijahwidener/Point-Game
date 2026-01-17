import { useState, useEffect } from 'react';
import { X, Check, TrendingUp, Flag, Minus, Plus } from 'lucide-react';

interface ActionBarProps {
  isMyTurn: boolean;
  canCheck: boolean;
  amountToCall: number;
  currentBet: number;
  minRaise: number;
  myStack: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  street: string;
}

export function ActionBar({
  isMyTurn,
  canCheck,
  amountToCall,
  currentBet,
  minRaise,
  myStack,
  onFold,
  onCheck,
  onCall,
  onRaise,
  street,
}: ActionBarProps) {
  const effectiveMinRaise = Math.min(minRaise, myStack + amountToCall);
  const maxRaise = myStack;

  const [raiseAmount, setRaiseAmount] = useState(effectiveMinRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  // Reset raise amount when turn changes
  useEffect(() => {
    setRaiseAmount(effectiveMinRaise);
    setShowRaiseSlider(false);
  }, [isMyTurn, effectiveMinRaise]);

  if (!isMyTurn) {
    return null;
  }

  // Check if we're in a betting street
  const bettingStreets = ['Preflop', 'Flop', 'Turn', 'River'];
  if (!bettingStreets.includes(street)) {
    return null;
  }

  const handleRaiseChange = (value: number) => {
    // Clamp to valid range
    const clamped = Math.max(effectiveMinRaise, Math.min(value, maxRaise));
    setRaiseAmount(clamped);
  };

  const handleRaiseSubmit = () => {
    onRaise(raiseAmount);
    setShowRaiseSlider(false);
  };

  const presetAmounts = [
    { label: 'Min', value: effectiveMinRaise },
    { label: '½ Pot', value: Math.floor((currentBet + amountToCall) * 0.5 + amountToCall) },
    { label: 'Pot', value: currentBet + amountToCall },
    { label: 'All-In', value: maxRaise },
  ].filter(p => p.value <= maxRaise && p.value >= effectiveMinRaise);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-900/98 to-transparent pt-8 pb-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Raise slider panel */}
        {showRaiseSlider && (
          <div className="mb-4 p-4 bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 animate-slideUp">
            {/* Preset buttons */}
            <div className="flex gap-2 mb-4">
              {presetAmounts.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleRaiseChange(preset.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    raiseAmount === preset.value
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Slider and input */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleRaiseChange(raiseAmount - (minRaise - currentBet))}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                disabled={raiseAmount <= effectiveMinRaise}
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex-1 relative">
                <input
                  type="range"
                  min={effectiveMinRaise}
                  max={maxRaise}
                  value={raiseAmount}
                  onChange={(e) => handleRaiseChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div
                  className="absolute top-0 left-0 h-2 bg-gradient-to-r from-amber-500 to-amber-400 rounded-lg pointer-events-none"
                  style={{
                    width: `${((raiseAmount - effectiveMinRaise) / (maxRaise - effectiveMinRaise)) * 100}%`,
                  }}
                />
              </div>

              <button
                onClick={() => handleRaiseChange(raiseAmount + (minRaise - currentBet))}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                disabled={raiseAmount >= maxRaise}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Amount input */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={raiseAmount}
                  onChange={(e) => handleRaiseChange(parseInt(e.target.value) || effectiveMinRaise)}
                  className="w-full pl-7 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-lg focus:border-amber-500 focus:outline-none"
                  min={effectiveMinRaise}
                  max={maxRaise}
                />
              </div>
              <button
                onClick={handleRaiseSubmit}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold rounded-lg transition-all shadow-lg shadow-amber-500/20"
              >
                Raise to ${raiseAmount}
              </button>
              <button
                onClick={() => setShowRaiseSlider(false)}
                className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main action buttons */}
        <div className="flex items-center justify-center gap-3">
          {/* Fold */}
          <button
            onClick={onFold}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
            Fold
          </button>

          {/* Check or Call */}
          {canCheck ? (
            <button
              onClick={onCheck}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-semibold rounded-xl transition-all"
            >
              <Check className="w-5 h-5" />
              Check
            </button>
          ) : (
            <button
              onClick={onCall}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-semibold rounded-xl transition-all"
            >
              <Flag className="w-5 h-5" />
              Call ${amountToCall}
            </button>
          )}

          {/* Raise */}
          {myStack > amountToCall && (
            <button
              onClick={() => setShowRaiseSlider(!showRaiseSlider)}
              className={`flex items-center gap-2 px-8 py-3 font-semibold rounded-xl transition-all ${
                showRaiseSlider
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Raise
            </button>
          )}
        </div>
      </div>

      {/* Custom slider thumb styles */}
      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}