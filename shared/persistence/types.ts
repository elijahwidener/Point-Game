// persistence level DTOs

export interface GameState {
  tableID: string;
  config: TableConfig;
  seats: GameSeat[];
  deck: Card[];
  street: string;
  boardCards: any[];
  button: number;
  pots: Pot[];
  currentPlayerSeat: number;
  currentBet: number;
  minRaise: number;
  timerSeq: number;
  gameSeq: number;
}

export interface GameSeat {
  seat: number;
  playerID: string;
  stack: number;
  bet: number;
  holeCards: any[];
  declaration?: 'high'|'low'|'both';
  folded: boolean;
  acted?: boolean;
  active: boolean;
}

export interface Card {
  rank: string;  // 'A', '2'-'9', 'T', 'J', 'Q', 'K'
  suit: string;  // 'hearts', 'diamonds', 'clubs', 'spades'
}

export interface Pot {
  amount: number;
  eligibleSeats: number[];  // Seat indices
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
export const InterRoundActions = {
  JOIN: 'Join',
  LEAVE: 'Leave',
  STAND_UP: 'Toggle Away',
  SIT_DOWN: 'Sit Down',
  CONFIG_UPDATE: 'Config Update',
  END: 'End',
  START: 'Start'
} as const;

export type InterRoundActionType =
    typeof InterRoundActions[keyof typeof InterRoundActions];

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
  passwordHash: string;
  balance: number;
}