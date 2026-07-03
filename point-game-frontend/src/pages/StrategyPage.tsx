import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { Lightbulb, Target, Eye, TrendingUp, Calculator, AlertTriangle } from 'lucide-react';

export function StrategyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Strategy</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Point Game is unsolved. No GTO charts, no solver outputs - just reads, math, and guts. 
            Here's what we've learned so far.
          </p>
        </div>

        {/* Strategy Cards */}
        <div className="space-y-8">
          
          {/* Aces */}
          <StrategyCard
            icon={<Target className="w-6 h-6" />}
            title="Aces Are Everything"
            color="amber"
          >
            <p>
              An ace can be 1 or 11 depending on your declaration. This flexibility is 
              incredibly powerful - you can credibly threaten both sides of the pot until 
              showdown. Hands with multiple aces have massive optionality.
            </p>
            <p className="mt-3 text-gray-500 text-sm">
              Example: You hold A-A-3-4-5. Going low, that's 14 points. Going high, it's 34. 
              Very few hands can compete on both ends like this.
            </p>
          </StrategyCard>

          {/* Deck Math */}
          <StrategyCard
            icon={<Calculator className="w-6 h-6" />}
            title="Know the Remaining Deck"
            color="cyan"
          >
            <p>
              As community cards come out and discards are revealed, the average value of 
              remaining cards shifts. If all four aces are visible, low hands become weaker 
              across the board.
            </p>
            <p className="mt-3">
              Compare your hand to what's possible given the visible cards. A 20-point 
              hand might be strong for low early, but if low cards keep getting discarded, 
              the competition for low gets tougher.
            </p>
          </StrategyCard>

          {/* Bluffing / Perception */}
          <StrategyCard
            icon={<Eye className="w-6 h-6" />}
            title="Perception Lets You Bluff"
            color="blue"
          >
            <p>
              There is bluffing in Point Game. A lot. Players only see your bets, your discards, 
              and your timing which means the hand you are <span className="text-white font-medium">perceived</span> to have matters 
              more than the hand you actually hold.
            </p>
            <p className="mt-3">
              The discard mechanic creates unique bluffing opportunities. If you kept all 5 cards 
              while your opponents are down to 3 or 4, you can credibly threaten high - even if 
              your hand is extremely low. Since having more cards than your opponent makes it much 
              harder for them to think they can beat you, bully them off the high declaration to attack these situations.
            </p>
          </StrategyCard>

          {/* Position */}
          <StrategyCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Position Is Power"
            color="green"
          >
            <p>
              Acting last in a betting round gives you information. But position matters 
              even more when the decision is marginal - if you're unsure whether to call, 
              being first to act lets you set the price.
            </p>
            <p className="mt-3">
              Overbetting from early position can force opponents into tough spots before 
              they've seen how others react. When your read is uncertain, aggression from 
              position can turn a 50/50 into a profitable spot.
            </p>
          </StrategyCard>

          {/* Reading Discards */}
          <StrategyCard
            icon={<Lightbulb className="w-6 h-6" />}
            title="Read the Discards"
            color="purple"
          >
            <p>
              Discards are public information. When the board shows a 7 and your opponent 
              discards two 7s, you know their hand just got weaker - and you know exactly 
              what they lost.
            </p>
            <p className="mt-3">
              Combine discard information with betting patterns. Did they bet big preflop 
              then check after discarding face cards? They probably had a high hand that 
              just got gutted. Adjust your read accordingly.
            </p>
          </StrategyCard>
          
          {/* Going Both */}
          <StrategyCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Going Both Is a Trap"
            color="red"
          >
            <p>
              Declaring "both" sounds great - win the whole pot! But the math is brutal. 
              You must win <span className="text-white font-medium">or tie</span> both 
              high and low. Lose either side, even by one point, and you get{' '}
              <span className="text-red-400 font-medium">nothing</span>.
            </p>
            <p className="mt-3">
              In practice, going both is extremely rare. You need a hand that's 
              simultaneously best-in-class for high AND low - usually involving multiple 
              aces and favorable discards. If you're even slightly uncertain, pick a side.
            </p>
          </StrategyCard>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-6">
            The best way to learn is to play. Theory only gets you so far.
          </p>
          <Link
            to={ROUTES.LOBBY}
            className="inline-block px-8 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Find a Table
          </Link>
        </div>
      </div>
    </div>
  );
}

interface StrategyCardProps {
  icon: React.ReactNode;
  title: string;
  color: 'amber' | 'red' | 'blue' | 'green' | 'purple' | 'cyan';
  children: React.ReactNode;
}

function StrategyCard({ icon, title, color, children }: StrategyCardProps) {
  const colorClasses = {
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    red: 'text-red-400 border-red-500/30 bg-red-500/5',
    blue: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
    green: 'text-green-400 border-green-500/30 bg-green-500/5',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
  };

  const iconColorClasses = {
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${iconColorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`text-xl font-bold mb-3 ${colorClasses[color].split(' ')[0]}`}>
            {title}
          </h3>
          <div className="text-gray-300 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}