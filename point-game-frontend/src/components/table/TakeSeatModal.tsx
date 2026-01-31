import { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface TakeSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (buyIn: number) => void;
  minBuyIn: number;
  maxBuyIn: number;
  seatNumber: number;
  isLoading?: boolean;
  error?: string | null;
}

export function TakeSeatModal({
  isOpen,
  onClose,
  onConfirm,
  minBuyIn,
  maxBuyIn,
  seatNumber,
  isLoading = false,
  error = null,
}: TakeSeatModalProps) {
  const [buyIn, setBuyIn] = useState(Math.max(minBuyIn, 100000));

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (buyIn >= minBuyIn && buyIn <= maxBuyIn) {
      onConfirm(buyIn);
    }
  };

  const isValidBuyIn = buyIn >= minBuyIn && buyIn <= maxBuyIn;

  const presets = [
    { label: 'Min', value: minBuyIn },
    { label: '50BB', value: minBuyIn * 50 },
    { label: '100BB', value: minBuyIn * 100 },
    { label: 'Max', value: maxBuyIn },
  ].filter((p, i, arr) => {
    // Remove duplicates and out of range
    if (p.value > maxBuyIn) return false;
    return arr.findIndex((x) => x.value === p.value) === i;
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Take Seat #{seatNumber + 1}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Buy-in info */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Buy-in Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={buyIn}
                  onChange={(e) => setBuyIn(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg font-mono focus:border-amber-500 focus:outline-none"
                  min={minBuyIn}
                  max={maxBuyIn}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Min: ${minBuyIn}</span>
                <span>Max: ${maxBuyIn}</span>
              </div>
            </div>

            {/* Quick select presets */}
            <div className="flex gap-2 mb-6">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setBuyIn(preset.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    buyIn === preset.value
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="mb-6">
              <input
                type="range"
                min={minBuyIn}
                max={maxBuyIn}
                value={buyIn}
                onChange={(e) => setBuyIn(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${
                    ((buyIn - minBuyIn) / (maxBuyIn - minBuyIn)) * 100
                  }%, #334155 ${((buyIn - minBuyIn) / (maxBuyIn - minBuyIn)) * 100}%, #334155 100%)`,
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValidBuyIn || isLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-amber-500/50 disabled:to-amber-600/50 text-slate-900 font-bold rounded-lg transition-all shadow-lg shadow-amber-500/20"
              >
                {isLoading ? 'Joining...' : `Sit with $${buyIn}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom slider thumb styles */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
        }
      `}</style>
    </>
  );
}