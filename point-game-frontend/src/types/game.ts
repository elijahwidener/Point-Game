export interface Card {
  rank: string;
  suit: string;
}

export interface GameSeat {
  seat: number;
  playerID: string;
  stack: number;
  bet: number;
  holeCards: Card[]|null;
  declaration?: 'high'|'low'|'both';
  folded: boolean;
  acted?: boolean;
  active: boolean;
}

export interface Pot {
  amount: number;
  eligibleSeats: number[];
}

export interface GameState {
  tableID: string;
  handSeq: number;
  street: string;
  seats: GameSeat[];
  boardCards: Card[];
  pots: Pot[];
  currentPlayerSeat: number;
  currentBet: number;
  minRaise: number;
  button: number;
}

export interface TableConfig {
  ante: number;
  smallBlind: number;
  bigBlind: number;
}

export interface GameTable {
  tableID: string;
  ownerID: string;
  status: 'Waiting'|'Running'|'Paused'|'Ended';
  config: TableConfig;
  createdAt: number;
}