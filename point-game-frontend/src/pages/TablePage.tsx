import { useParams } from 'react-router-dom';

import { useTableConnection } from '../hooks/useTableConnection';
import { useAuthStore } from '../stores/authStore';

function ConnectionStatus({ status }: { status: string }) {
  const statusConfig = {
    disconnected: { color: 'bg-red-500', text: 'Disconnected' },
    connecting: { color: 'bg-yellow-500', text: 'Connecting...' },
    connected: { color: 'bg-emerald-500', text: 'Connected' },
    reconnecting: { color: 'bg-orange-500', text: 'Reconnecting...' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-sm text-slate-400">{config.text}</span>
    </div>
  );
}

export function TablePage() {
  const { tableID } = useParams<{ tableID: string }>();
  const user = useAuthStore((state) => state.user);

  const {
    connectionStatus,
    gameState,
    sendAction,
    requestResync
  } = useTableConnection({ 
    tableID: tableID || '',
    autoConnect: true 
  });

  // Find the current user's seat
  const mySeat = gameState?.seats.find(s => s.playerID === user?.userID);
  const isMyTurn = gameState?.seats[gameState.currentPlayerSeat]?.playerID === user?.userID;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">Table: {tableID?.slice(0, 8)}...</h1>
            <ConnectionStatus status={connectionStatus} />
          </div>
          <div className="flex items-center gap-4">
            {gameState && (
              <div className="text-sm">
                <span className="text-slate-400">Hand #</span>
                <span className="font-mono">{gameState.handSeq}</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="text-slate-400">Street:</span>
                <span className="ml-1 font-medium">{gameState.street}</span>
              </div>
            )}
            <button
              onClick={requestResync}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              Resync
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Connection states */}
        {connectionStatus === 'connecting' && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-400">Connecting to table...</p>
            </div>
          </div>
        )}

        {connectionStatus === 'reconnecting' && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
            <p className="text-orange-400">Connection lost. Attempting to reconnect...</p>
          </div>
        )}

        {connectionStatus === 'disconnected' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400">Disconnected from table. Please refresh the page.</p>
          </div>
        )}

        {/* Game state display */}
        {connectionStatus === 'connected' && !gameState && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400 mb-2">Connected to table</p>
            <p className="text-sm text-slate-500">Waiting for game to start...</p>
          </div>
        )}

        {gameState && (
          <div className="space-y-6">
            {/* Poker table visualization placeholder */}
            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
              <div className="text-center mb-8">
                <h2 className="text-lg font-medium text-slate-300 mb-2">Game Table</h2>
                <p className="text-sm text-slate-500">(Table visualization coming soon)</p>
              </div>

              {/* Board cards */}
              <div className="flex justify-center gap-2 mb-8">
                {gameState.boardCards.length > 0 ? (
                  gameState.boardCards.map((card, i) => (
                    <div 
                      key={i} 
                      className="w-16 h-24 bg-white rounded-lg flex items-center justify-center text-black font-bold"
                    >
                      {card.rank}{card.suit[0]}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No community cards yet</div>
                )}
              </div>

              {/* Pot */}
              <div className="text-center mb-8">
                <span className="text-slate-400">Pot: </span>
                <span className="text-xl font-bold text-emerald-400">
                  {gameState.pots.reduce((sum, pot) => sum + pot.amount, 0)}
                </span>
              </div>

              {/* Seats grid */}
              <div className="grid grid-cols-4 gap-4">
                {gameState.seats.map((seat) => (
                  <div 
                    key={seat.seat}
                    className={`p-4 rounded-lg border ${
                      seat.playerID 
                        ? gameState.currentPlayerSeat === seat.seat
                          ? 'bg-emerald-500/20 border-emerald-500'
                          : seat.folded
                            ? 'bg-slate-700/50 border-slate-600 opacity-50'
                            : 'bg-slate-700 border-slate-600'
                        : 'bg-slate-800/50 border-slate-700 border-dashed'
                    }`}
                  >
                    {seat.playerID ? (
                      <>
                        <div className="font-medium truncate">
                          {seat.playerID === user?.userID ? 'You' : seat.playerID.slice(0, 8)}
                        </div>
                        <div className="text-sm text-slate-400">
                          Stack: {seat.stack}
                        </div>
                        {seat.bet > 0 && (
                          <div className="text-sm text-yellow-400">
                            Bet: {seat.bet}
                          </div>
                        )}
                        {seat.folded && (
                          <div className="text-xs text-red-400">Folded</div>
                        )}
                        {/* Show hole cards for current user */}
                        {seat.holeCards && seat.holeCards.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {seat.holeCards.map((card, i) => (
                              <div 
                                key={i}
                                className="w-8 h-12 bg-white rounded text-xs text-black flex items-center justify-center font-bold"
                              >
                                {card.rank}{card.suit[0]}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-500 text-sm">Empty Seat</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons (only when it's your turn) */}
            {isMyTurn && mySeat && !mySeat.folded && (
              <div className="bg-slate-800 rounded-xl p-4 border border-emerald-500/50">
                <div className="text-center text-emerald-400 font-medium mb-4">
                  Your Turn!
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => sendAction('fold')}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                  >
                    Fold
                  </button>
                  {mySeat.bet === gameState.currentBet ? (
                    <button
                      onClick={() => sendAction('check')}
                      className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors"
                    >
                      Check
                    </button>
                  ) : (
                    <button
                      onClick={() => sendAction('call')}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                    >
                      Call {gameState.currentBet - mySeat.bet}
                    </button>
                  )}
                  <button
                    onClick={() => sendAction('raise', { raiseAmount: gameState.minRaise })}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                  >
                    Raise
                  </button>
                </div>
              </div>
            )}

            {/* Debug info */}
            <details className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <summary className="cursor-pointer text-slate-400 text-sm">
                Debug Info (gameSeq: {gameState.gameSeq})
              </summary>
              <pre className="mt-4 text-xs text-slate-500 overflow-auto max-h-64">
                {JSON.stringify(gameState, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}