import {useCallback, useEffect, useRef} from 'react';

import {type ActionLogEntry} from '../components/table/ActionLog';
import {type ConnectionStatus, createTableConnection, TableWebSocket} from '../services/websocket';
import {useAuthStore} from '../stores/authStore';
import {type DisplayState, useGameStore} from '../stores/gameStore';

interface UseTableConnectionOptions {
  tableID: string;
  autoConnect?: boolean;
  onActionReceived?: (entry: Omit<ActionLogEntry, 'id'|'timestamp'>) => void;
}

interface UseTableConnectionReturn {
  connectionStatus: ConnectionStatus;
  gameState: DisplayState|null;
  sendAction: (action: string, payload?: any) => void;
  requestResync: () => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Maps backend action names to frontend action types
 */
function mapActionType(backendAction: string): ActionLogEntry['action'] {
  const actionMap: Record<string, ActionLogEntry['action']> = {
    'fold': 'fold',
    'check': 'check',
    'call': 'call',
    'raise': 'raise',
    'declare': 'declare',
    'post_blind': 'post_blind',
    'post_ante': 'post_ante',
  };
  return actionMap[backendAction] || 'check';  // Default fallback
}

/**
 * Parses an action message from the backend and converts it to an
 * ActionLogEntry
 */
function parseActionMessage(action: any):
    Omit<ActionLogEntry, 'id'|'timestamp'>|null {
  try {
    const entry: Omit<ActionLogEntry, 'id'|'timestamp'> = {
      playerName: action.username || action.playerID?.slice(0, 8) || 'Unknown',
      action: mapActionType(action.action),
    };

    switch (action.action) {
      case 'raise':
        // For raise, the payload contains { amount } which is the total bet
        entry.amount = action.payload?.amount || action.payload?.raiseAmount;
        break;
      case 'call':
        entry.amount = action.payload?.amount;
        break;
      case 'declare':
        // Declaration may be 'hidden' if filtered for privacy
        entry.declaration = action.payload?.declaration || 'hidden';
        break;
      case 'post_blind':
      case 'post_ante':
        entry.amount = action.payload?.amount;
        break;
    }

    return entry;
  } catch (e) {
    console.error('Failed to parse action message:', e, action);
    return null;
  }
}

/**
 * Parses a system message and converts to action log entries
 */
function parseSystemMessage(
    event: string, data: any): Array<Omit<ActionLogEntry, 'id'|'timestamp'>> {
  const entries: Array<Omit<ActionLogEntry, 'id'|'timestamp'>> = [];

  switch (event) {
    case 'showdown_results':
      if (data.winners && data.winners.length > 0) {
        // Add winner entries
        for (const winner of data.winners) {
          entries.push({
            playerName: winner.username || `Seat ${winner.seat}`,
            action: 'showdown_winner',
            amount: winner.amount,
            side: winner.side,
            points: winner.points,
          });
        }
      }
      break;

    case 'discards':
      if (data.discards && data.discards.length > 0) {
        for (const discard of data.discards) {
          entries.push({
            playerName:
                discard.username || discard.playerID?.slice(0, 8) || 'Unknown',
            action: 'discards',
            cards: discard.cards,
          });
        }
      }
      break;

    case 'new_hand':
      entries.push({
        playerName: '🎴',
        action: 'new_hand',
        message: `Hand #${data.handSeq || '?'} starting`,
      });
      break;
  }

  return entries;
}

export function useTableConnection(
    {tableID, autoConnect = true, onActionReceived}: UseTableConnectionOptions):
    UseTableConnectionReturn {
  const wsRef = useRef<TableWebSocket|null>(null);

  // Get user from auth store
  const user = useAuthStore((state) => state.user);
  const userID = user?.userID || '';

  // Game store actions and state
  const {
    connectionStatus,
    gameState,
    setConnectionStatus,
    setGameState,
    setError,
    setSystemMessage,
    clearGameState
  } = useGameStore();

  const handleStateUpdate = useCallback((state: DisplayState) => {
    setGameState(state);
  }, [setGameState]);

  const handleActionReceived = useCallback((action: any) => {
    if (onActionReceived) {
      const entry = parseActionMessage(action);
      if (entry) {
        onActionReceived(entry);
        // TODO: Animations
      }
    }
  }, [onActionReceived]);

  const handleSystemMessage = useCallback((event: string, data?: any) => {
    setSystemMessage(event, data);

    // Parse system messages for action log
    if (onActionReceived) {
      const entries = parseSystemMessage(event, data);
      for (const entry of entries) {
        onActionReceived(entry);
      }
    }
  }, [setSystemMessage, onActionReceived]);

  const handleError = useCallback((error: {code: number; message: string}) => {
    console.error('WebSocket error:', error);
    setError(error);
    if (error.code === 409 && wsRef.current) {
      wsRef.current.requestResync();
    }
  }, [setError]);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, [setConnectionStatus]);

  // Create WebSocket connection
  useEffect(
      () => {
        if (!tableID || !userID) return;

        const ws = createTableConnection(tableID, userID, {
          onStateUpdate: handleStateUpdate,
          onActionReceived: handleActionReceived,
          onSystemMessage: handleSystemMessage,
          onError: handleError,
          onStatusChange: handleStatusChange,
        });

        wsRef.current = ws;

        if (autoConnect) {
          ws.connect();
        }

        return () => {
          ws.disconnect();
          wsRef.current = null;
          clearGameState();
        };
      },
      [
        tableID, userID, autoConnect, handleStateUpdate, handleActionReceived,
        handleSystemMessage, handleError, handleStatusChange, clearGameState
      ]);

  const sendAction = useCallback((action: string, payload?: any) => {
    wsRef.current?.sendAction(action, payload);
  }, []);

  const requestResync = useCallback(() => {
    wsRef.current?.requestResync();
  }, []);

  const connect = useCallback(() => {
    wsRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  return {
    connectionStatus,
    gameState,
    sendAction,
    requestResync,
    connect,
    disconnect,
  };
}