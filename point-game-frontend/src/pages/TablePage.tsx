import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RefreshCw, Home } from 'lucide-react';

import { useTableConnection } from '../hooks/useTableConnection';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import type { GameTable } from '../types/game';
import { DeclarationModal } from '../components/modals/DeclarationModal';
import { DraggableCardDisplay } from '../components/table/DraggableCardDisplay';
import type { LastActionType } from '../components/table/PlayerSeat';
import type { ActionLogEntry } from '../components/table/ActionLog';

import {
  PokerTable,
  ActionBar,
  OwnerControls,
  PlayerControls,
  ActionLog,
  useActionLog,
  TakeSeatModal,
} from '../components/table';

// Connection status indicator - includes "joining" state
interface ConnectionStatusProps {
  status: string;
  isJoining?: boolean;
}

function ConnectionStatus({ status, isJoining = false }: ConnectionStatusProps) {
  if (isJoining) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-sm text-amber-400">Joining table...</span>
      </div>
    );
  }

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

  // Action log
  const { entries: actionLogEntries, addEntry: addLogEntry } = useActionLog();

  // Track seat actions for badges
  const [seatActions, setSeatActions] = useState<Map<number, { action: LastActionType; amount?: number }>>(new Map());
  const previousStreetRef = useRef<string | null>(null);
  const previousHandSeqRef = useRef<number | null>(null);
  
  // Ref to access current gameState in callback without causing re-renders
  const gameStateRef = useRef<any>(null);

  // Callback for action received - updates both log and seat actions
  const handleActionReceived = useCallback((entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => {
    addLogEntry(entry);
    
    // Update seat action badge
    if (entry.action && ['check', 'call', 'raise', 'fold', 'declare'].includes(entry.action)) {
      const currentGameState = gameStateRef.current;
      if (currentGameState?.seats) {
        const seatIndex = currentGameState.seats.findIndex(
          (s: any) => s.username === entry.playerName || s.playerID?.slice(0, 8) === entry.playerName
        );
        
        if (seatIndex >= 0) {
          setSeatActions(prev => {
            const next = new Map(prev);
            next.set(seatIndex, { 
              action: entry.action as LastActionType, 
              amount: entry.amount 
            });
            return next;
          });
        }
      }
    }
  }, [addLogEntry]);

  // WebSocket connection
  const {
    connectionStatus,
    gameState,
    sendAction,
    requestResync,
  } = useTableConnection({
    tableID: tableID || '',
    autoConnect: true,
    onActionReceived: handleActionReceived,
  });

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Clear seat actions when street changes or new hand starts
  useEffect(() => {
    if (!gameState) return;
    
    const streetChanged = previousStreetRef.current !== null && 
                          previousStreetRef.current !== gameState.street;
    const handChanged = previousHandSeqRef.current !== null && 
                        previousHandSeqRef.current !== gameState.handSeq;
    
    if (streetChanged || handChanged) {
      setSeatActions(new Map());
    }
    
    previousStreetRef.current = gameState.street;
    previousHandSeqRef.current = gameState.handSeq;
  }, [gameState?.street, gameState?.handSeq]);

  const refreshUser = useCallback(async () => {
    try {
      const updatedUser = await api.getMe();
      useAuthStore.getState().setUser(updatedUser);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  // Local UI state
  const [takeSeatModal, setTakeSeatModal] = useState<{ isOpen: boolean; seatIndex: number }>({
    isOpen: false,
    seatIndex: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<GameTable | null>(null);
  const [tableName, setTableName] = useState<string>('');

  useEffect(() => {
    async function fetchTable() {
      if (!tableID) return;
      try {
        const table = await api.getTable(tableID);
        setTableData(table);
        setTableName(table.name);
      } catch(err){
        console.error('Failed to fetch table:', err);
      }
    }
    fetchTable();
  }, [tableID]);

  

  // Derived state
  const mySeat = gameState?.seats.find((s) => s.playerID === user?.userID);
  const isSeated = !!mySeat;
  const isMyTurn = gameState?.seats[gameState.currentPlayerSeat]?.playerID === user?.userID;
  const isOwner = tableData?.ownerID === user?.userID;
  const isSittingOut = mySeat ? !mySeat.active : false;
  const needsToDeclare = gameState?.street === 'Declare' && !mySeat?.declaration && !mySeat?.folded;

  // Reset isJoining when we become seated
  useEffect(() => {
    if (isSeated) {
      setIsJoining(false);
    }
  }, [isSeated]);

  // Calculate betting values
  const myBet = mySeat?.bet || 0;
  const currentBet = gameState?.currentBet || 0;
  const amountToCall = currentBet - myBet;
  const canCheck = amountToCall === 0;

  // Handle seat click (open modal for empty seats)
  const handleSeatClick = useCallback((seatIndex: number) => {
    if (isSeated) return;
    setTakeSeatModal({ isOpen: true, seatIndex });
    setError(null);
  }, [isSeated]);

  // Handle take seat confirmation
  const handleTakeSeat = useCallback(async (buyIn: number) => {
    if (!tableID) return;

    setIsLoading(true);
    setIsJoining(true);
    setError(null);

    try {
      await api.sitDown(tableID, buyIn);
      setTakeSeatModal({ isOpen: false, seatIndex: 0 });
      requestResync();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to sit down');
      setIsJoining(false);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, requestResync, refreshUser]);

  // Game actions - update seat actions immediately for optimistic UI
  const handleFold = useCallback(() => {
    if (mySeat) {
      setSeatActions(prev => new Map(prev).set(mySeat.seat, { action: 'fold' }));
    }
    sendAction('fold');
  }, [sendAction, mySeat]);

  const handleCheck = useCallback(() => {
    if (mySeat) {
      setSeatActions(prev => new Map(prev).set(mySeat.seat, { action: 'check' }));
    }
    sendAction('check');
  }, [sendAction, mySeat]);

  const handleCall = useCallback(() => {
    if (mySeat) {
      setSeatActions(prev => new Map(prev).set(mySeat.seat, { action: 'call', amount: amountToCall }));
    }
    sendAction('call');
  }, [sendAction, mySeat, amountToCall]);

  const handleRaise = useCallback((amount: number) => {
    if (mySeat) {
      setSeatActions(prev => new Map(prev).set(mySeat.seat, { action: 'raise', amount }));
    }
    sendAction('raise', { amount });
  }, [sendAction, mySeat]);

  const handleDeclare = useCallback((declaration: 'high' | 'low' | 'both') => {
    if (mySeat) {
      setSeatActions(prev => new Map(prev).set(mySeat.seat, { action: 'declare' }));
    }
    sendAction('declare', { declaration });
  }, [sendAction, mySeat]);

  // Owner controls
  const handleStartGame = useCallback(async () => {
    if (!tableID ) return;
    setIsLoading(true);
    try {
      await api.startGame(tableID);
      requestResync();
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, requestResync]);

  const handleTogglePause = useCallback(async () => {
    if (!tableID ) return;
    setIsLoading(true);
    try {
      await api.togglePause(tableID);
      requestResync();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID,requestResync]);

  const handleEndGame = useCallback(async () => {
    if (!tableID ) return;
    setIsLoading(true);
    try {
      await api.endGame(tableID);
      requestResync();
    } catch (err) {
      console.error('Failed to end game:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID,  requestResync]);

  // Player controls
  const handleLeaveSeat = useCallback(async () => {
    if (!tableID ) return;
    setIsLoading(true);
    try {
      await api.leaveSeat(tableID);
      requestResync();
      await refreshUser();
    } catch (err) {
      console.error('Failed to leave seat:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, requestResync, refreshUser]);

  const handleToggleSitOut = useCallback(async () => {
    if (!tableID ) return;
    setIsLoading(true);
    try {
      await api.toggleAway(tableID);
      requestResync();
    } catch (err) {
      console.error('Failed to toggle sit out:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableID, requestResync]);

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
                  {tableName}
                </h1>
                <div className="flex items-center gap-3">
                  <ConnectionStatus status={connectionStatus} isJoining={isJoining} />
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

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              <PlayerControls
                isSeated={isSeated}
                isSittingOut={isSittingOut}
                onLeaveSeat={handleLeaveSeat}
                onToggleSitOut={handleToggleSitOut}
                isLoading={isLoading}
              />

              {isOwner && (
                <OwnerControls
                  tableStatus={tableStatus}
                  onStartGame={handleStartGame}
                  onTogglePause={handleTogglePause}
                  onEndGame={handleEndGame}
                  isLoading={isLoading}
                />
              )}

              <button
                onClick={requestResync}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh game state"
              >
                <RefreshCw className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main game area */}
      <main className="relative p-4 md:p-8">
        <PokerTable
          gameState={gameState}
          myUserID={user?.userID || ''}
          onSeatClick={handleSeatClick}
          isSeated={isSeated || isJoining}
          seatActions={seatActions}
        />

        <ActionLog entries={actionLogEntries} />
        
        {mySeat && mySeat.holeCards && mySeat.holeCards.length > 0 && (
          <DraggableCardDisplay
            cards={mySeat.holeCards}
            stack={mySeat.stack}
          />
        )}
      </main>

      {/* Action Bar */}
      {isSeated && (
        <ActionBar
          isMyTurn={isMyTurn}
          canCheck={canCheck}
          amountToCall={amountToCall}
          pot={gameState?.pots.reduce((sum, pot) => sum + pot.amount, 0) || 0}
          smallBlind={gameState?.config.smallBlind || 1}
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