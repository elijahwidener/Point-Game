import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { ROUTES } from '../utils/constants';
import { ChevronDown } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { openLoginModal } = useUIStore();

  const handlePlayNow = () => {
    if (isAuthenticated) {
      navigate(ROUTES.LOBBY);
    } else {
      openLoginModal();
    }
  };

  const scrollToRules = () => {
    document.getElementById('rules-section')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <div className="container mx-auto px-2 pt-6 pb-10">
        <div className="max-w-5xl mx-auto text-center">

          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src="/transparent_point_game.png"
              alt="Point Game"
              className="h-48 w-auto"
            />
          </div>
          

          {/* Stats Row */}
          <div className="flex justify-center gap-12 mb-10">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500">123K</div>
              <div className="text-gray-500 text-sm mt-1">Discards Forced</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500">42k</div>
              <div className="text-gray-500 text-sm mt-1">Hands Played</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500">100%</div>
              <div className="text-gray-500 text-sm mt-1">Player-Driven Meta</div>
            </div>
          </div>

          <button
            onClick={handlePlayNow}
            className="px-12 py-4 bg-amber-500 hover:bg-amber-600 text-gray-900 text-lg font-semibold rounded-lg transition-colors shadow-lg shadow-amber-500/25 mb-10"
          >
            Play Now
          </button>

          {/* Learn to Play Arrow */}
          <button
            onClick={scrollToRules}
            className="group flex flex-col items-center mx-auto text-gray-400 hover:text-white transition-colors"
          >
            <span className="text font-medium">Learn to Play</span>
            <ChevronDown className="w-6 h-4 animate-bounce" />
          </button>
        </div>
      </div>

      {/* Rules Section */}
      <div id="rules-section" className="bg-gray-900 py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-5xl font-bold mb-12 text-center text-white">
            How to Play
          </h2>

          {/* Header Section */}
          <div className="mb-16 bg-gray-800/50 rounded-xl p-8 border border-gray-700">
            <p className="text-xl text-gray-300 leading-relaxed">
              In Point Game, your hand strength is determined by your <span className="text-amber-400 font-semibold">point total</span>—calculated exactly like blackjack. Aces can count as either 1 or 11, face cards and tens are worth 10, and all other cards are worth their face value. Throughout each street, players are forced to discard any cards in their hand that match the community cards, meaning hands naturally shrink as the board develops. At showdown, the pot is split in half: one half goes to the player with the highest total, and the other half goes to the player with the lowest total. After the final betting round, players must declare whether they will be competing for the highest hand total, or the lowest hand total.
            </p>
          </div>

          {/* Game Flow Steps */}
          <div className="space-y-12">
            {/* Setup */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">Setup</h3>
                <p className="text-gray-300 leading-relaxed">
                  The deck is shuffled and each player is dealt 5 private cards face down. All players post the ante, and players in the blind positions post their small blind and big blind bets before any action begins.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-setup.png" alt="Table Setup" className="w-full h-auto" />
              </div>
            </div>

            {/* Preflop */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">Preflop</h3>
                <p className="text-gray-300 leading-relaxed">
                  The first betting round begins with the player to the left of the big blind. Players can check, bet, call, raise, or fold. Once all active players have acted and all bets have been matched, the action is closed and we move to the flop.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-preflop.png" alt="Preflop Action" className="w-full h-auto" />
              </div>
            </div>

            {/* Flop */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">Flop</h3>
                <p className="text-gray-300 leading-relaxed">
                  Two community cards are dealt face up to the board. Immediately, any player whose hole cards match the rank of a community card must discard those matching cards face up. This means some players may now have fewer than 5 cards while others still have all 5. After discards are complete, a betting round follows. The board will always have unique ranks—if a card dealt would create a duplicate, it "slides" off and is replaced by the next card from the deck.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-flop.png" alt="Flop with Discards" className="w-full h-auto" />
              </div>
            </div>

            {/* Turn */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">Turn</h3>
                <p className="text-gray-300 leading-relaxed">
                  Two more community cards are dealt to the board, bringing the total to four. Players again discard any hole cards that match the ranks on the board. Another betting round occurs. In the extremely rare case where the deck is exhausted, fewer than two cards may be dealt, but the game continues.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-turn.png" alt="Turn Street" className="w-full h-auto" />
              </div>
            </div>

            {/* River */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">River</h3>
                <p className="text-gray-300 leading-relaxed">
                  One final community card is dealt, completing the five-card board. Players perform their final discard phase if any of their remaining hole cards match the new card. The last betting round then takes place. At this point, players may have anywhere from zero cards to five cards remaining in their hand.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-river.png" alt="River Street" className="w-full h-auto" />
              </div>
            </div>

            {/* Declaration */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">Declaration</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  All remaining players simultaneously declare whether they are playing for the High pot, the Low pot, or Both.
                </p>
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                  <p className="text-red-300 text-sm font-medium">
                    <span className="font-bold">Critical rule:</span> If you declare you're going for Both, you must win or tie both the high and the low sides to receive any chips. If you lose either side, you get nothing from the pot—even if you won the other side.
                  </p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-declare.png" alt="Declaration Phase" className="w-full h-auto" />
              </div>
            </div>

            {/* Showdown */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-3xl font-bold mb-4 text-amber-400">Showdown</h3>
                <p className="text-gray-300 leading-relaxed">
                  All declarations are revealed at the same time, and players show their remaining cards. Hand strength is determined by summing the point values of the cards left in a player’s hand. For the high side, aces always count as 11 and for the low side, aces always count as 1. The best High total and the best Low total are each awarded half of the pot, provided the player declared for that side. If multiple players tie for a side, that half of the pot is split evenly among them.
               </p>
              </div>
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src="/table-showdown.png" alt="Showdown" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}