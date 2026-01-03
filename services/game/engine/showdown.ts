export function resolveShowdown(state: GameState): GameState
function evaluateHand(cards: Card[], boardCards: Card[], aceValue: 1|11): number
function distributePots(state: GameState): void function awardPot(
    pot: Pot, winners: GameSeat[], losers: GameSeat[]): void