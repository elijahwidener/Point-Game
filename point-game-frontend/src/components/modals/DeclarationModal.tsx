import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Minimize2, Maximize2 } from 'lucide-react';

interface DeclarationModalProps {
  isOpen: boolean;
  onDeclare: (declaration: 'high' | 'low' | 'both') => void;
  isLoading?: boolean;
}

export function DeclarationModal({ isOpen, onDeclare, isLoading = false }: DeclarationModalProps) {
  const [selected, setSelected] = useState<'high' | 'low' | 'both' | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selected) {
      onDeclare(selected);
      setSelected(null);
      setIsMinimized(false);
    }
  };

  // Minimized view - floating button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold rounded-full shadow-lg shadow-amber-500/30 animate-pulse"
      >
        <Maximize2 className="w-5 h-5" />
        Declare Now
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold text-white">Declare</h2>
              <p className="text-sm text-slate-400 mt-1">Choose which pot(s) you're playing for</p>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Minimize to see table"
            >
              <Minimize2 className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Options */}
          <div className="p-6 space-y-3">
            {/* High */}
            <button
              onClick={() => setSelected('high')}
              disabled={isLoading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selected === 'high'
                  ? 'border-red-500 bg-red-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className={`p-3 rounded-full ${selected === 'high' ? 'bg-red-500' : 'bg-slate-700'}`}>
                <ArrowUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className={`font-bold text-lg ${selected === 'high' ? 'text-red-400' : 'text-white'}`}>
                  High
                </div>
                <div className="text-sm text-slate-400">Win with the highest point total</div>
              </div>
            </button>

            {/* Low */}
            <button
              onClick={() => setSelected('low')}
              disabled={isLoading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selected === 'low'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className={`p-3 rounded-full ${selected === 'low' ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <ArrowDown className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className={`font-bold text-lg ${selected === 'low' ? 'text-blue-400' : 'text-white'}`}>
                  Low
                </div>
                <div className="text-sm text-slate-400">Win with the lowest point total</div>
              </div>
            </button>

            {/* Both */}
            <button
              onClick={() => setSelected('both')}
              disabled={isLoading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selected === 'both'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className={`p-3 rounded-full ${selected === 'both' ? 'bg-purple-500' : 'bg-slate-700'}`}>
                <ArrowUpDown className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className={`font-bold text-lg ${selected === 'both' ? 'text-purple-400' : 'text-white'}`}>
                  Both
                </div>
                <div className="text-sm text-slate-400">Must win both high AND low to take the pot</div>
              </div>
            </button>
          </div>

          {/* Confirm button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleConfirm}
              disabled={!selected || isLoading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selected
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Declaring...' : selected ? `Declare ${selected.charAt(0).toUpperCase() + selected.slice(1)}` : 'Select an option'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}