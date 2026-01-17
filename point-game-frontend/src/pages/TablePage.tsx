import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RefreshCw, Home, Settings } from 'lucide-react';

import { useTableConnection } from '../hooks/useTableConnection';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import type { GameTable } from '../types/game';
import { DeclarationModal } from '../components/modals/DeclarationModal';

import {
  PokerTable,
  ActionBar,
  OwnerControls,
  PlayerControls,
  ActionLog,
  useActionLog,
  TakeSeatModal,
} from '../components/table';

// Connection status indicator
function ConnectionStatus({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; text: string; pulse: boolean }> = {
    disconnected: { color: 'bg-red-500', text: 'Disconnected', pulse: false },
    connecting: { color: 'bg-yellow-500', text: 'Connecting...', pulse: true },
    connected: { color: 'bg-emerald-500', text: 'Connected', pulse: true },
    reconnecting: { color: 'bg-orange-500', text: 'Reconnecting...', pulse: true },
  };

  const config = statusConfig[status] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-slate-400">{config.text}</span>
    </div>
  );
}

export function TablePage() {
  const { tableID } = useParams<{ tableID: string }>();
  const user = useAuthStore((state) => state.user);

  // WebSocket connection
  const {
    connectionStatus,
    gameState,
    sendAction,
    requestResync,
  } = useTableConnection({
    tableID: tableID || '',
    autoConnect: true,
  });

  const refreshUser = useCallback(async () => {
    if (!user?.userID) return;
    try {
      const updatedUser = await api.getMe(user.userID);
      useAuthStore.getState().setUser(updatedUser);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [user?.userID]);

  // Local UI state
  const [takeSeatModal, setTakeSeatModal] = useState<{ isOpen: boolean; seatIndex: number }>({
    isOpen: false,
    seatIndex: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<GameTable | null>(null);

  useEffect(() => {
    async function fetchTable() {
      if (!tableID) return;
      try {
        const table = await api.getTable(tableID);
        setTableData(table);
      } catch(err){
        console.error('Failed to fetch table:', err);
      }
    }
    fetchTable();
  }, [tableID]);


  // Action log
  const { entries: actionLogEntries, addEntry: addLogEntry, clearLog } = useActionLog();

  // Derived state
  const mySeat = gameState?.seats.find((s) => s.playerID === user?.userID);
  const isSeated = !!mySeat;
  const isMyTurn = gameState?.seats[gameState.currentPlayerSeat]?.playerID === user?.userID;
  const isOwner = tableData?.ownerID === user?.userID;
  const isSittingOut = mySeat ? !mySeat.active : false;
  const needsToDeclare = gameState?.street === 'Declare' && !mySeat?.declaration && !mySeat?.folded;


  // Calculate betting values
  const myBet = mySeat?.bet || 0;
  const currentBet = gameState?.currentBet || 0;
  const amountToCall = currentBet - myBet;
  const canCheck = amountToCall === 0;

  // Clear action log when hand changes
  useEffect(() => {
    if (gameState?.handSeq) {
      clearLog();
    }
  }, [gameState?.handSeq, clearLog]);

  // Handle seat click (open modal for empty seats)
  const handleSeatClick = useCallback((seatIndex: number) => {
    if (isSeated) return; // Already seated
    setTakeSeatModal({ isOpen: true, seatIndex });
    setError(null);
  }, [isSeated]);

  // Handle take seat confirmation
  const handleTakeSeat = useCallback(async (buyIn: number) => {
    if (!tableID || !user?.userID) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.sitDown(tableID, user.userID, buyIn);
      setTakeSeatModal({ isOpen: false, seatIndex: 0 });
      // Request resync to get updated state
      requestResync();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to sit down');
    } finally {
      setIsLoading(false);
    }
  }, [tableID, user?.userID, requestResync]);

  // Game actions
  const handleFold = useCallback(() => {
    sendAction('fold');
    addLogEntry({ playerName: 'You', action: 'fold' });
  }, [sendAction, addLogEntry]);

  const handleCheck = useCallback(() => {
    sendAction('check');
    addLogEntry({ playerName: 'You', action: 'check' });
  }, [sendAction, addLogEntry]);

  const handleCall = useCallback(() => {
    sendAction('call');
    addLogEntry({ playerName: 'You', action: 'call', amount: amountToCall });
  }, [sendAction, addLogEntry, amountToCall]);

  const handleRaise = useCallback((amount: number) => {
    sendAction('raise', { raiseAmount: amount - myBet });
    addLogEntry({ playerName: 'You', action: 'raise', amount });
  }, [sendAction, addLogEntry, myBet]);

  const handleDeclare = useCallback((declaration: 'high' | 'low' | 'both') => {
    sendAction('declare', { declaration });
    addLogEntry({ playerName: 'You', action: 'declare', declaration });
  }, [sendAction, addLogEntry]);

  // Owner controls
  const handleStartGame = useCallback(async () => {
    if (!tableID || !user?.userID) return;
    setIsLoading(true);
    try {
      await api.startGame(tableID, user.userID);
      requestResync();
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, user?.userID, requestResync]);

  const handleTogglePause = useCallback(async () => {
    if (!tableID || !user?.userID) return;
    setIsLoading(true);
    try {
      await api.togglePause(tableID, user.userID);
      requestResync();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, user?.userID, requestResync]);

  const handleEndGame = useCallback(async () => {
    if (!tableID || !user?.userID) return;
    setIsLoading(true);
    try {
      await api.endGame(tableID, user.userID);
      requestResync();
    } catch (err) {
      console.error('Failed to end game:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, user?.userID, requestResync]);

  // Player controls
  const handleLeaveSeat = useCallback(async () => {
    if (!tableID || !user?.userID) return;
    setIsLoading(true);
    try {
      await api.leaveSeat(tableID, user.userID);
      requestResync();
      await refreshUser();
    } catch (err) {
      console.error('Failed to leave seat:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, user?.userID, requestResync]);

  const handleToggleSitOut = useCallback(async () => {
    if (!tableID || !user?.userID) return;
    setIsLoading(true);
    try {
      await api.toggleAway(tableID, user.userID);
      requestResync();
    } catch (err) {
      console.error('Failed to toggle sit out:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, user?.userID, requestResync]);

  // Get table status from game state
  const tableStatus: 'Waiting' | 'Running' | 'Paused' | 'Ended' = 
    gameState?.street === 'Interround' && gameState?.handSeq === 0 
      ? 'Waiting' 
      : 'Running';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Navigation & Table info */}
            <div className="flex items-center gap-4">
              <Link
                to="/lobby"
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to Lobby"
              >
                <Home className="w-5 h-5 text-slate-400" />
              </Link>
              
              <div className="h-6 w-px bg-slate-700" />
              
              <div>
                <h1 className="text-lg font-bold text-white">
                  {gameState?.tableName || `Table ${tableID?.slice(0, 8)}...`}
                </h1>
                <div className="flex items-center gap-3">
                  <ConnectionStatus status={connectionStatus} />
                  {gameState && (
                    <>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        Hand #{gameState.handSeq}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {gameState.config.smallBlind}/{gameState.config.bigBlind}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Center: Owner controls */}
            <div className="flex items-center gap-2">
              {isOwner && (
                <OwnerControls
                  tableStatus={tableStatus}
                  onStartGame={handleStartGame}
                  onTogglePause={handleTogglePause}
                  onEndGame={handleEndGame}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Right: Player controls & resync */}
            <div className="flex items-center gap-3">
              <PlayerControls
                isSeated={isSeated}
                isSittingOut={isSittingOut}
                onLeaveSeat={handleLeaveSeat}
                onToggleSitOut={handleToggleSitOut}
                isLoading={isLoading}
              />
              
              <button
                onClick={requestResync}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Resync"
              >
                <RefreshCw className="w-5 h-5 text-slate-400" />
              </button>
              
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main table area */}
      <main className="relative py-8 px-4">
        <PokerTable
          gameState={gameState}
          myUserID={user?.userID || ''}
          onSeatClick={handleSeatClick}
          isSeated={isSeated}
        />

        {/* Action Log - positioned in bottom left */}
        <div className="fixed bottom-24 left-4 w-64 z-10">
          <ActionLog entries={actionLogEntries} maxVisible={5} />
        </div>

        {/* My cards display - positioned in bottom right when seated */}
        {mySeat && mySeat.holeCards && mySeat.holeCards.length > 0 && (
          <div className="fixed bottom-24 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 z-10">
            <div className="text-xs text-slate-400 mb-2 font-medium">Your Cards</div>
            <div className="flex gap-2">
              {mySeat.holeCards.map((card, i) => (
                <div
                  key={i}
                  className="w-14 h-20 rounded-lg bg-white flex flex-col justify-between p-1.5 shadow-lg"
                >
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: ['Hearts', 'Diamonds', 'hearts', 'diamonds', 'h', 'd'].includes(card.suit)
                        ? '#ef4444'
                        : '#1e293b',
                    }}
                  >
                    {card.rank}
                  </span>
                  <span
                    className="text-2xl text-center"
                    style={{
                      color: ['Hearts', 'Diamonds', 'hearts', 'diamonds', 'h', 'd'].includes(card.suit)
                        ? '#ef4444'
                        : '#1e293b',
                    }}
                  >
                    {card.suit === 'Hearts' || card.suit === 'hearts' || card.suit === 'h' ? '♥' :
                     card.suit === 'Diamonds' || card.suit === 'diamonds' || card.suit === 'd' ? '♦' :
                     card.suit === 'Clubs' || card.suit === 'clubs' || card.suit === 'c' ? '♣' : '♠'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-sm font-bold text-amber-400">${mySeat.stack}</span>
            </div>
          </div>
        )}
      </main>

      {/* Action Bar - fixed at bottom */}
      {isSeated && (
        <ActionBar
          isMyTurn={isMyTurn}
          canCheck={canCheck}
          amountToCall={amountToCall}
          currentBet={currentBet}
          minRaise={gameState?.minRaise || 0}
          myStack={mySeat?.stack || 0}
          onFold={handleFold}
          onCheck={handleCheck}
          onCall={handleCall}
          onRaise={handleRaise}
          street={gameState?.street || ''}
        />
      )}

      {/* Take Seat Modal */}
      {/* TODO: Make min/max buy-in configurable in table config */}
      <TakeSeatModal
        isOpen={takeSeatModal.isOpen}
        onClose={() => setTakeSeatModal({ isOpen: false, seatIndex: 0 })}
        onConfirm={handleTakeSeat}
        minBuyIn={gameState?.config.bigBlind || 1}
        maxBuyIn={1000000}
        seatNumber={takeSeatModal.seatIndex}
        isLoading={isLoading}
        error={error}
      />

      {/* Declaration Modal */}
      <DeclarationModal
        isOpen={needsToDeclare}
        onDeclare={handleDeclare}
        isLoading={isLoading}
      />
    </div>
  );
}