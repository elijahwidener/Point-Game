import {create} from 'zustand';

import type {ConnectionStatus} from '../services/websocket';


export interface DisplaySeat {
  seat: number;
  playerID: string;
  username: string;
  stack: number;
  bet: number;
  holeCards: any[]|null;
  declaration?: 'high'|'low'|'both';
  folded: boolean;
  acted?: boolean;
  active: boolean;
}

export interface DisplayState {
  tableID: string;
  tableName: string;
  handSeq: number;
  street: string;
  seats: DisplaySeat[];
  boardCards: any[];
  pots: {amount: number; eligibleSeats: number[]}[];
  currentPlayerSeat: number;
  currentBet: number;
  minRaise: number;
  button: number;
  gameSeq: number;
  config:
      {ante: number; smallBlind: number; bigBlind: number; maxPlayers: number;};
}

interface GameError {
  code: number;
  message: string;
  timestamp: number;
}

interface SystemMessage {
  event: string;
  message?: string;
  timestamp: number;
}

interface GameStoreState {
  connectionStatus: ConnectionStatus;
  gameState: DisplayState|null;
  lastError: GameError|null;
  lastSystemMessage: SystemMessage|null;

  // actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setGameState: (state: DisplayState) => void;
  clearGameState: () => void;
  setError: (error: {code: number; message: string}) => void;
  clearError: () => void;
  setSystemMessage: (event: string, data?: any) => void;
}

export const useGameStore = create<GameStoreState>(
    (set, get) => ({
      connectionStatus: 'disconnected',
      gameState: null,
      lastError: null,
      lastSystemMessage: null,

      setConnectionStatus: (status) => set({connectionStatus: status}),
      setGameState: (state) => {
        const currentState = get().gameState;
        if (currentState && state.gameSeq <= currentState.gameSeq) {
          console.log(`Ignoring stale state: received ${state.gameSeq}, have ${
              currentState.gameSeq}`);
          return;
        }
        set({gameState: state, lastError: null});
      },
      clearGameState: () =>
          set({gameState: null, connectionStatus: 'disconnected'}),
      setError: (error) => set({lastError: {...error, timestamp: Date.now()}}),
      clearError: () => set({lastError: null}),
      setSystemMessage: (event, data) => set({
        lastSystemMessage:
            {event, message: data?.message, timestamp: Date.now()}
      }),
    }));

// Selectors for common derived state
export const useIsMyTurn = () => useGameStore((state) => {
  if (!state.gameState) return false;
  const userID = localStorage.getItem('userID');  // Or get from auth store
  const currentSeat = state.gameState.seats[state.gameState.currentPlayerSeat];
  return currentSeat?.playerID === userID;
});

export const useMySeat = () => useGameStore((state) => {
  if (!state.gameState) return null;
  const userID = localStorage.getItem('userID');
  return state.gameState.seats.find(s => s.playerID === userID) || null;
});

export const useIsConnected = () =>
    useGameStore((state) => state.connectionStatus === 'connected');

export const useIsReconnecting = () =>
    useGameStore((state) => state.connectionStatus === 'reconnecting');