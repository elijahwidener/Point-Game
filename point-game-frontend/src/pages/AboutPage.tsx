export function AboutPage() {
  return (
    <div className="min-h-screen bg0gray-950">
      <div className="container mx-auto px-2 py-8 max-w-4xl">
        {/* Story */}
        <div className="space-y-8 mb-16">
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <div className="flex justify-center mb-8">
                <h3 className="text-3xl font-bold mb-4 text-amber-400">About</h3>
          </div>
          <div className="space-y-6 text-gray-300 leading-relaxed text-lg">
            <div className="float-left mr-8 mb-4">
              <img
                src="/poker-club.jpg"
                alt="Poker Club"
                className="max-w-md w-full h-auto rounded -lg"
                ></img>
                <div className="text-sm text-gray-400 italic text-center">Final Game of the UT Austin Poker Club before I moved back to Virginia.</div>
            </div>
              <p>
                Point Game was created by myself, Elijah Widener Ferreira at Virginia Tech, where it quickly became a favorite among the poker community. The game spread to the UT Austin Poker Club, where it continued to be loved by players for its unique mechanics and strategic depth.
              </p>

              <p>
                Unlike traditional poker variants, Point Game focuses on the point total in your hand, calculated using each card's blackjack value. The pot then splits into high and low, with players declaring which side they're competing for. The game's signature discard mechanic, where matching community cards force you to discard hole cards, means your hand strength can change dramatically from street to street.
              </p>

              <p>
                What makes Point Game special is that it's <span className="text-amber-400 font-semibold">unsolved</span>. While games like NLH have been studied extensively, Point Game gives everyone the opportunity to develop their own strategy. There's no GTO solver, no established playbook, just pure poker theory applied to fresh problems. The mathematics of split pot high-low combined with the discard mechanic creates countless unique situations that reward creative thinking and strong hand reading ability.
              </p>

              <p>
                As a true lover of poker, I built this platform because Point Game represents poker in its purest form—a game where the mathematics, psychology, and strategy come together in new and exciting ways. I hope you enjoy it as much as I do.
              </p>
            </div>
          </div>
        </div>
        {/* Support Section */}
        <div className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 rounded-xl p-8 border border-amber-700/30">
          <h2 className="text-3xl font-bold mb-6 text-amber-400 text-center">
            Support Point Game
          </h2>
          
          <div className="space-y-6 text-gray-300 leading-relaxed">
            <p className="text-center">
              If you enjoy Point Game or have brought it to your local cash game, I'd love to hear from you! As a poker enthusiast who loves the mathematical and social elements of the game, knowing that others are enjoying Point Game means everything to me.
            </p>

            <p className="text-center">
              If you'd like to support the project beyond kind words, donations help cover AWS hosting costs and keep the platform running.
            </p>

            <div className="flex justify-center mt-8">
              <div className="bg-white rounded-xl p-6 shadow-2xl">
                <img 
                  src="/venmo.png" 
                  alt="Venmo QR Code" 
                  className="w-64 h-64"
                />
                <p className="text-center mt-4 text-gray-900 font-semibold">
                  Scan to support via Venmo
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Every contribution helps keep the tables running 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}