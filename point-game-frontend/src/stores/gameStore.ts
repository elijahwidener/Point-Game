import {create} from 'zustand';

import type {GameState} from '../types/game';

interface GameStoreState {
  gameState: GameState|null;
  setGameState: (state: GameState) => void;
  clearGameState: () => void;
}

export const useGameStore =
    create<GameStoreState>((set) => ({
                             gameState: null,
                             setGameState: (state) => set({gameState: state}),
                             clearGameState: () => set({gameState: null}),
                           }));