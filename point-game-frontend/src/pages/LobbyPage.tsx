import { useState, useEffect } from 'react';
import {api} from '../services/api';
import type { GameTable } from '../types/game';
import { CreateTableModal } from '../components/modals/CreateTableModal';

interface TableCardProps {
  table: GameTable;
}

function TableCard({ table }: TableCardProps) {
  
  // Status color mapping
  const statusColors = {
    Waiting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Paused: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Ended: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  const statusTextColors = {
    Waiting: 'text-yellow-400',
    Running: 'text-emerald-400',
    Paused: 'text-orange-400',
    Ended: 'text-red-400',
  };

  const isFull = table.playerCount >= table.config.maxPlayers;

  const handleConnect = () => {
    // Open table in new tab
    window.open(`/table/${table.tableID}`, '_blank');
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all group">
      {/* Header: Name + Status */}
      <div className="flex items-start justify-between mb-4">
        <h3 className={`text-xl font-bold ${statusTextColors[table.status]} transition-all`}>
          {table.name}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[table.status]}`}>
          {table.status}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3 mb-6">
        {/* Players */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Players</span>
          <span className={`font-medium ${isFull ? 'text-red-400' : 'text-slate-200'}`}>
            {table.playerCount} / {table.config.maxPlayers}
          </span>
        </div>

        {/* Stakes */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Blinds</span>
          <span className="font-medium text-slate-200">
            {table.config.smallBlind}/{table.config.bigBlind}
          </span>
        </div>

        {/* Ante */}
        {table.config.ante > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Ante</span>
            <span className="font-medium text-slate-200">{table.config.ante}</span>
          </div>
        )}

        {/* Table ID (for debugging/reference) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Table ID</span>
          <span className="font-mono text-xs text-slate-500">
            {table.tableID.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        disabled={isFull && table.status !== 'Waiting'}
        className={`w-full py-2.5 rounded-lg font-medium transition-all ${
          isFull && table.status !== 'Waiting'
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40'
        }`}
      >
        {isFull && table.status !== 'Waiting' ? 'Table Full' : 'Connect'}
      </button>
    </div>
  );
}

export function LobbyPage() {
  
  // State for tables list
  const [tables, setTables] = useState<GameTable[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [bbRange, setBbRange] = useState<[number, number]>([0, 1000]);
  
  // State for create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function fetchTables() {
      try {
        setLoading(true);
        const response = await api.getTables();
        setTables(response.tables);
      } catch (error) {
        console.error('Failed to fetch tables:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTables();
  }, []);

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name ? table.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    const hasOpenSeats = table.playerCount < (table.config.maxPlayers?? 8) ;
    const matchesOpenFilter = !showOpenOnly || hasOpenSeats;
    const matchesBbRange = table.config.bigBlind >= bbRange[0] && table.config.bigBlind <= bbRange[1];
  
    return matchesSearch && matchesStatus && matchesOpenFilter && matchesBbRange;
  });


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Game Lobby
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            + Create Table
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-6">
          
          {/* Row 1: Search & Open Seats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search - takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Search Tables
              </label>
              <input
                type="text"
                placeholder="Search by table name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Open Seats Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-all w-full">
                <input
                  type="checkbox"
                  checked={showOpenOnly}
                  onChange={(e) => setShowOpenOnly(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="text-slate-300 font-medium">Only show tables with open seats</span>
              </label>
            </div>
          </div>

          {/* Row 2: Status & Stakes Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Status Chips */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Table Status
              </label>
              <div className="flex gap-2">
                {['all', 'Waiting', 'Running', 'Paused'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {status === 'all' ? 'All' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Big Blind Range */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Big Blind Stakes
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBbRange([0, 1000])}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-cyan-500 hover:text-white hover:border-transparent"
                >
                  All
                </button>
                <button
                  onClick={() => setBbRange([0, 25])}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-cyan-500 hover:text-white hover:border-transparent"
                >
                  Low (≤25)
                </button>
                <button
                  onClick={() => setBbRange([25, 100])}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-cyan-500 hover:text-white hover:border-transparent"
                >
                  Mid (25-100)
                </button>
                <button
                  onClick={() => setBbRange([100, 1000])}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-cyan-500 hover:text-white hover:border-transparent"
                >
                  High (100+)
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Dual Range Sliders */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-4">
              Big Blind Range: {bbRange[0]} - {bbRange[1] >= 1000 ? 'No Max' : bbRange[1]}
            </label>
              <div className='relative h-12'>
                  {/* Background track */}
                  <div className='absolute top-1/2 -translate-y-1/2 w-full h-2 bg-slate-700 rounded-lg'/>
                  
                  {/* Filled track (shows selected range) */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg transition-all pointer-events-none"
                    style={{ 
                      left: `${(bbRange[0] / 1000) * 100}%`,
                      width: `${((bbRange[1] - bbRange[0]) / 1000) * 100}%` 
                    }}
                    />

                    {/* Min thumb slider */}
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={bbRange[0]}
                      onChange={(e) => {
                        const newMin = parseFloat(e.target.value);
                        if (newMin <= bbRange[1]) {
                          setBbRange([newMin, bbRange[1]]);
                        }
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-transparent appearance-none cursor-pointer z-20
                                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-400
                                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                                  [&::-webkit-slider-thumb]:shadow-emerald-500/50 [&::-webkit-slider-thumb]:hover:scale-110
                                  [&::-webkit-slider-thumb]:transition-transform
                                  [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                                  [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 
                                  [&::-moz-range-thumb]:border-emerald-400 [&::-moz-range-thumb]:cursor-pointer
                                  [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-0"
                      />
                    {/* Max thumb slider */}
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={bbRange[1]}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value);
                        if (newMax >= bbRange[0]) {
                          setBbRange([bbRange[0], newMax]);
                        }
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-transparent appearance-none cursor-pointer z-20
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-400
                                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                                [&::-webkit-slider-thumb]:shadow-cyan-500/50 [&::-webkit-slider-thumb]:hover:scale-110
                                [&::-webkit-slider-thumb]:transition-transform
                                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 
                                [&::-moz-range-thumb]:border-cyan-400 [&::-moz-range-thumb]:cursor-pointer
                                [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-0"
                    />
                    </div>            
                  {/* Scale markers */}
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>0</span>
                    <span>100</span>
                    <span>200</span>
                    <span>400</span>
                    <span>600</span>
                    <span>800</span>
                    <span>1000+</span>
            </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12 pt-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-lg">Loading tables...</div>
          </div>
        )}

        {/* Empty State - No tables exist */}
        {!loading && tables.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-400 text-lg mb-4">No tables available</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all"
            >
              Create the first table
            </button>
          </div>
        )}

        {/* Empty State - No matches after filtering */}
        {!loading && tables.length > 0 && filteredTables.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-400 text-lg mb-2">No tables match your filters</div>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setShowOpenOnly(false);
                setBbRange([0, 25]);
              }}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Table Cards Grid */}
        {!loading && filteredTables.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {filteredTables.map((table) => (
              <TableCard key={table.tableID} table={table} />
            ))}
          </div>
        )}
      </div>

      {/* Create Table Modal */}
      <CreateTableModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTableCreated={(tableID) => {        
          // Auto-connect to new table in new tab
          window.open(`/table/${tableID}`, '_blank');
        }}
      />
    </div>
    </div>
  );
}