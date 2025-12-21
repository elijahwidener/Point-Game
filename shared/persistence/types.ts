// persistence level DTOs

export interface GameState {
  tableID: string;
  config: any[];
  seats: any[];
  street: string;
  boardCards: any[];
  pots: any[];
  currentPlayerSeat: number;
  currentBet: number;
  timerSequence: number;
  gameSequence: number;
}

export interface ActionLog {
  handID: string;
  actionID: number;
  playerID: string;
  action: string;
  payload: any[];
  timestamp: number;
}

export interface ConnectionStore {
  tableID: string;
  connectionID: string;
  playerID: string;
}

export interface GameTable {
  tableID: string;
  ownerID: string;
  status: GameTableStatus;
  config: TableConfig;
  interRoundActionSeq: number;
  createdAt: number;
}

export interface TableListFilter {
  status?: GameTableStatus;
}

export type GameTableStatus =|'Waiting'|'Running'|'Paused'|'Ended';

export interface TableConfig {
  ante: number;
  smallBlind: number;
  bigBlind: number;
}

export interface Timer {
  tableID: string, timerSeq: number, playerID: string, deadline: number,
}

export interface HandSnapshot {
  tableID: string;
  handSeq: number;
  gameState: GameState;  // consider changing this because storing tons of game
                         // states can be expensive
}

export type InterRoundActionType =
    'Join'|'Leave'|'Sit Up'|'Sit Down'|'Config Update'|'End';

export interface InterRoundAction {
  tableID: string;
  actionSeq: number;
  userID: string;
  type: InterRoundActionType;
  payload: any[];  // number for buy ins, config for update
}

export interface User {
  userID: string;
  username: string;
  password: string;
  balance: number;
}