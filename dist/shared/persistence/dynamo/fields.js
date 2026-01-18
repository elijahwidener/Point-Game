"use strict";
// DynamoDB field name constants
// Prevents typos and makes refactoring easier
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELDS = void 0;
exports.FIELDS = {
    USERS: {
        USER_ID: 'userID',
        USERNAME: 'username',
        PASSWORD_HASH: 'passwordHash',
        BALANCE: 'balance',
    },
    GAME_TABLES: {
        TABLE_ID: 'tableID',
        OWNER_ID: 'ownerID',
        NAME: 'name',
        STATUS: 'status',
        PLAYER_COUNT: 'playerCount',
        CONFIG: 'config',
        INTER_ROUND_ACTION_SEQ: 'interRoundActionSeq',
        CREATED_AT: 'createdAt',
    },
    GAME_STATE: {
        TABLE_ID: 'tableID',
        HAND_SEQ: 'handSeq',
        CONFIG: 'config',
        SEATS: 'seats',
        DECK: 'deck',
        STREET: 'street',
        BOARD_CARDS: 'boardCards',
        BUTTON: 'button',
        POTS: 'pots',
        CURRENT_PLAYER_SEAT: 'currentPlayerSeat',
        CURRENT_BET: 'currentBet',
        MIN_RAISE: 'minRaise',
        TIMER_SEQ: 'timerSeq',
        GAME_SEQ: 'gameSeq',
    },
    GAME_SEAT: {
        SEAT: 'seat',
        PLAYER_ID: 'playerID',
        USERNAME: 'username',
        STACK: 'stack',
        BET: 'bet',
        HOLE_CARDS: 'holeCards',
        DECLARATION: 'declaration',
        FOLDED: 'folded',
        ACTED: 'acted',
        ACTIVE: 'active',
    },
    POT: {
        AMOUNT: 'amount',
        ELIGIBLE_SEATS: 'eligibleSeats',
    },
    ACTION_LOG: {
        HAND_ID: 'handID',
        ACTION_SEQ: 'actionSeq',
        PLAYER_ID: 'playerID',
        ACTION: 'action',
        PAYLOAD: 'payload',
        TIMESTAMP: 'timestamp',
    },
    CONNECTION_STORE: {
        TABLE_ID: 'tableID',
        CONNECTION_ID: 'connectionID',
        PLAYER_ID: 'playerID',
    },
    HAND_SNAPSHOTS: {
        TABLE_ID: 'tableID',
        HAND_SEQ: 'handSeq',
        GAME_STATE: 'gameState',
    },
    TIMERS: {
        TABLE_ID: 'tableID',
        TIMER_SEQ: 'timerSeq',
        PLAYER_ID: 'playerID',
        DEADLINE: 'deadline',
    },
    INTER_ROUND_ACTION_QUEUE: {
        TABLE_ID: 'tableID',
        ACTION_SEQ: 'actionSeq',
        USER_ID: 'userID',
        TYPE: 'type',
        PAYLOAD: 'payload',
    },
    LEDGER: {
        TABLE_ID: 'tableID',
        LEDGER_SEQ: 'ledgerSeq',
        PLAYER_ID: 'playerID',
        BALANCE_AFTER: 'balanceAfter',
        AMOUNT: 'amount',
    },
    TABLE_CONFIG: {
        ANTE: 'ante',
        SMALL_BLIND: 'smallBlind',
        BIG_BLIND: 'bigBlind',
        MAX_PLAYERS: 'maxPlayers'
    },
    CARD: {
        RANK: 'rank',
        SUIT: 'suit',
    },
};
// Add more as needed
