import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { big } from 'framer-motion/client';
import { TableConfig } from 'lucide-react';

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTableCreated: (tableID: string) => void;
}

export function CreateTableModal( {isOpen, onClose, onTableCreated}: CreateTableModalProps){
    const {user} = useAuthStore();
    const [tableName, setTableName] = useState('');
    const [ante, setAnte] = useState(10);
    const [smallBlind, setSmallBlind] = useState(25);
    const [bigBlind, setBigBlind] = useState(50);
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    if (!isOpen) return null;


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if(!user){
            setError('You must be logged in to create a table');
            return;
        }else if (!tableName.trim()){
            setError('Table name is required');
            return;
        }else if (smallBlind > bigBlind){
            setError('Small blind must be less than big blind');
            return;
        }else if (maxPlayers < 3){
            setError('Minimum number of players is 3');
            return;
        }

        setLoading(true);
        try {
            const config = {ante, smallBlind, bigBlind, maxPlayers};
            const tableID = await api.createTable(user.userID, tableName, config);

            // Reset form
            setTableName('');
            setAnte(1);
            setSmallBlind(5);
            setBigBlind(10);
            setMaxPlayers(8);
            onTableCreated(tableID);
            onClose();
            
        } catch (err: any) {
        setError(err.message || 'Failed to create table');
        } finally {
        setLoading(false);
        }

    }


    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
            <div className='bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6'>
                {/* Header */}
                <div className='flex items-center justify-between mb-6'>
                    <h2 className='text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400'>
                        Create New Table
                    </h2>
                    <button 
                        onClick={onClose}
                        className='text-slate-400 hover:text-white transition-colors'
                    >
                        <svg className='w-6 h-6' fill="none" viewBox='0 0 24 24' stroke='currentColor'>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className='space-y-4'>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                        </div>
                    )}
                    {/* Table Name */}
                    <div>
                        <label className='block text-sm font-medium text-slate-300 mb-2'>
                            Table Name
                        </label>
                        <input
                            type='text'
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            placeholder='e.g., Point Game Monday'
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                    </div>

                    {/* Blinds Grid */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <label className='block text-sm font-medium text-slate-300 mb-2'>
                                Small Blind
                            </label>
                            <input
                                type="number"
                                value={smallBlind}
                                onChange={(e) => setSmallBlind(parseInt(e.target.value))}
                                min="1"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Big Blind
                            </label>
                            <input
                                type="number"
                                value={bigBlind}
                                onChange={(e) => setBigBlind(parseInt(e.target.value))}
                                min="1"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                    {/* Ante & Max Players */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Ante
                        </label>
                        <input
                            type="number"
                            value={ante}
                            onChange={(e) => setAnte(parseInt(e.target.value))}
                            min="0"
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Max Players
                        </label>
                        <select
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value={3}>3-max</option>
                            <option value={4}>4-max</option>
                            <option value={5}>5-max</option>
                            <option value={6}>6-max</option>
                            <option value={7}>7-max</option>
                            <option value={8}>8-max</option>
                        </select>
                        </div>
                    </div>

                    {/*  Buttons */}
                    <div className='flex gap-3 pt-4'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-ls font-medium hover:bg-slate-600 transition-colors'
                        >
                            Cancel
                    </button>
                    <button
                        type='submit'
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Table'}
                    </button>
                    </div>
                </form>
            </div>
        </div>
    );
}