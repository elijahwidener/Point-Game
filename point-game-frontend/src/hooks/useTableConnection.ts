import {useCallback, useEffect, useRef} from 'react';

import {type ConnectionStatus, createTableConnection, TableWebSocket} from '../services/websocket';
import {useAuthStore} from '../stores/authStore';
import {type DisplayState, useGameStore} from '../stores/gameStore';

interface UseTableConnectionOptions {
  tableID: string;
  autoConnect?: boolean;
}

interface UseTableConnectionReturn {
  connectionStatus: ConnectionStatus;
  gameState: DisplayState|null;
  sendAction: (action: string, payload?: any) => void;
  requestResync: () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useTableConnection(
    {tableID, autoConnect = true}: UseTableConnectionOptions):
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
    console.log('Received game state:', state);
    setGameState(state);
  }, [setGameState]);

  const handleActionReceived = useCallback((action: any) => {
    action;
    // for now since were just sending full states
    // actions are for hints for animations. well implement actinon
    // handling later
    // TODO: Trigger animations
  }, []);

  const handleSystemMessage = useCallback((event: string, data?: any) => {
    console.log('System message:', event, data);
    setSystemMessage(event, data);
  }, [setSystemMessage]);

  const handleError = useCallback((error: {code: number; message: string}) => {
    console.error('Websocket error:', error);
    setError(error);
  }, [setError]);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    console.log('Connection Status:', status);
    setConnectionStatus(status);
  }, [setConnectionStatus]);

  const connect = useCallback(
      () => {
        if (!userID) {
          console.error('Cannot connect without userID');
          return;
        }

        if (wsRef.current) {
          wsRef.current.disconnect();
        }

        wsRef.current = createTableConnection(tableID, userID, {
          onStateUpdate: handleStateUpdate,
          onActionReceived: handleActionReceived,
          onSystemMessage: handleSystemMessage,
          onError: handleError,
          onStatusChange: handleStatusChange
        });

        wsRef.current.connect();
      },
      [
        tableID, userID, handleStateUpdate, handleActionReceived,
        handleSystemMessage, handleError, handleStatusChange
      ]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    clearGameState();
  }, [clearGameState]);

  const sendAction = useCallback((action: string, payload?: any) => {
    if (wsRef.current) {
      wsRef.current.sendAction(action, payload);
    } else {
      console.error('Cannot send action - not connected');
    }
  }, []);

  const requestResync = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.requestResync();
    }
  }, []);

  useEffect(() => {
    if (autoConnect && userID && tableID) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, userID, tableID, connect, disconnect]);

  return {
    connectionStatus,
    gameState,
    sendAction,
    requestResync,
    connect,
    disconnect
  };
}