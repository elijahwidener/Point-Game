"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveShowdown = resolveShowdown;
function resolveShowdown(state) {
    const showdownWinners = []; // Step 1-4: Evaluate hands
    const { highGroup, lowGroup } = determineWinners(state);
    // Step 5-7: Determine eligible winners and Distribute each pot
    for (const pot of state.pots) {
        distributePot(state, pot, highGroup, lowGroup, showdownWinners);
    }
    const results = { winners: showdownWinners, handSeq: state.handSeq };
    return { state, showdownResults: results };
}
function determineWinners(state) {
    // Step 0: Ensure declarations
    // if someone did not declare in time, help them out by declaring them based
    // on average.This can be a later addition, for now, we can do it based on
    // number of cards in hand
    state.seats.forEach(s => {
        if (s.declaration === undefined) {
            if (s.holeCards.length >= 4) {
                s.declaration = 'high';
                return;
            }
            else {
                s.declaration = 'low';
                return;
            }
        }
    });
    const activePlayers = state.seats.filter(s => s.active && !s.folded);
    // Step 1: Split players by declaration
    const highGroup = [];
    const lowGroup = [];
    const bothGroup = [];
    // Step 2: Calculate hand values
    for (const seat of activePlayers) {
        if (seat.declaration === 'high' || seat.declaration === 'both') {
            highGroup.push({
                seat,
                value: evaluateHand(seat.holeCards, 11), // Ace = 11
                declaration: seat.declaration
            });
        }
        if (seat.declaration === 'low' || seat.declaration === 'both') {
            lowGroup.push({
                seat,
                value: evaluateHand(seat.holeCards, 1), // Ace = 1
                declaration: seat.declaration
            });
        }
        if (seat.declaration === 'both') {
            bothGroup.push({
                seat,
                value: 0, // Not used for sorting
                declaration: 'both'
            });
        }
    }
    // Step 3: Sort by strength
    highGroup.sort((a, b) => b.value - a.value); // Highest to lowest
    lowGroup.sort((a, b) => a.value - b.value); // Lowest to highest
    // Step 4: Validate "both" players
    if (bothGroup.length > 0 && highGroup.length > 0 && lowGroup.length > 0) {
        const highBestValue = highGroup[0].value;
        const lowBestValue = lowGroup[0].value;
        for (const bothPlayer of bothGroup) {
            const highValue = highGroup.find(h => h.seat.seat === bothPlayer.seat.seat).value;
            const lowValue = lowGroup.find(l => l.seat.seat === bothPlayer.seat.seat).value;
            // Must win or tie BOTH sides
            const winsOrTiesHigh = highValue >= highBestValue;
            const winsOrTiesLow = lowValue <= lowBestValue;
            if (!winsOrTiesHigh || !winsOrTiesLow) {
                // Remove from both lists
                const highIndex = highGroup.findIndex(h => h.seat.seat === bothPlayer.seat.seat);
                const lowIndex = lowGroup.findIndex(l => l.seat.seat === bothPlayer.seat.seat);
                if (highIndex !== -1)
                    highGroup.splice(highIndex, 1);
                if (lowIndex !== -1)
                    lowGroup.splice(lowIndex, 1);
            }
        }
    }
    return { highGroup, lowGroup };
}
function distributePot(state, pot, highGroup, lowGroup, showdownWinners) {
    // Step 5: Determine winners (all players tied for best)
    // highWinners = GameSeat[]
    const eligibleHigh = highGroup.filter(h => pot.eligibleSeats.includes(h.seat.seat));
    const eligibleLow = lowGroup.filter(l => pot.eligibleSeats.includes(l.seat.seat));
    const highWinners = eligibleHigh.length > 0 ?
        eligibleHigh.filter(h => h.value === eligibleHigh[0].value)
            .map(h => h.seat) :
        [];
    const lowWinners = eligibleLow.length > 0 ?
        eligibleLow.filter(l => l.value === eligibleLow[0].value)
            .map(l => l.seat) :
        [];
    // Step 6: Split pot in half
    let lowPot = Math.floor(pot.amount / 2);
    let highPot = pot.amount - lowPot; // High gets extra chip if odd
    // If no one declared for a side, give it to the other side
    if (highWinners.length === 0 && lowWinners.length > 0) {
        lowPot += highPot;
        highPot = 0;
    }
    else if (lowWinners.length === 0 && highWinners.length > 0) {
        highPot += lowPot;
        lowPot = 0;
    }
    else if (highWinners.length === 0 && lowWinners.length === 0) {
        // shouldn't happen, but handle it
        console.warn(`No eligible winners for pot of ${pot.amount}`);
        return;
    }
    // Step 7: Award pot
    if (highPot > 0 && highWinners.length > 0) {
        awardPotShare(state, highWinners, highPot, 'high', showdownWinners);
    }
    if (lowPot > 0 && lowWinners.length > 0) {
        awardPotShare(state, lowWinners, lowPot, 'low', showdownWinners);
    }
}
function awardPotShare(state, winners, potAmount, side, showdownWinners) {
    const share = Math.floor(potAmount / winners.length);
    const remainder = potAmount - (share * winners.length);
    winners.forEach((winner, i) => {
        const seat = state.seats[winner.seat];
        const amount = share + (i === 0 ? remainder : 0);
        seat.stack += amount;
        showdownWinners.push({
            seat: seat.seat,
            playerID: seat.playerID,
            username: seat.username ?? `seat ${seat.seat}`,
            side,
            amount,
        });
    });
}
function evaluateHand(holeCards, aceValue) {
    const allCards = [...holeCards];
    let total = 0;
    for (const card of allCards) {
        total += getCardValue(card, aceValue);
    }
    return total;
}
/**
 * Get the blackjack-style value of a card
 */
function getCardValue(card, aceValue) {
    switch (card.rank) {
        case 'A':
            return aceValue;
        case 'K':
        case 'Q':
        case 'J':
        case 'T':
            return 10;
        case '9':
            return 9;
        case '8':
            return 8;
        case '7':
            return 7;
        case '6':
            return 6;
        case '5':
            return 5;
        case '4':
            return 4;
        case '3':
            return 3;
        case '2':
            return 2;
        default:
            console.error(`Unknown card rank: ${card.rank}`);
            return 0;
    }
}
