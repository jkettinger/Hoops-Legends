
import React, { useState } from 'react';
import { TEAMS } from '../constants';
import { Team, SeasonState } from '../types';
import { RefreshCw, Play, Trophy, ChevronLeft, Shield } from 'lucide-react';

interface SeasonModeProps {
    seasonState: SeasonState;
    onUpdateSeason: (newState: SeasonState) => void;
    onPlayGame: (team: Team, opponent: Team) => void;
    onBack: () => void;
}

export const SeasonMode: React.FC<SeasonModeProps> = ({ seasonState, onUpdateSeason, onPlayGame, onBack }) => {
    const [view, setView] = useState<'HUB' | 'TRADES'>('HUB');
    const [selectedTradeTeam, setSelectedTradeTeam] = useState<Team | null>(null);

    const userTeam = TEAMS.find(t => t.id === seasonState.userTeamId) || TEAMS[0];
    const sortedTeams = [...TEAMS].sort((a, b) => {
        const winsA = seasonState.wins[a.id] || 0;
        const winsB = seasonState.wins[b.id] || 0;
        return winsB - winsA;
    });

    // Simple scheduling: Pick random opponent that isn't user
    const getNextOpponent = () => {
        const others = TEAMS.filter(t => t.id !== userTeam.id);
        // Deterministic but simple: use gamesPlayed to rotate
        return others[seasonState.gamesPlayed % others.length];
    };

    const nextOpponent = getNextOpponent();

    const handleSimGame = () => {
        // Sim user game (50/50 chance for now)
        const userWon = Math.random() > 0.4; // slight bias
        const newState = { ...seasonState, gamesPlayed: seasonState.gamesPlayed + 1 };
        
        if (userWon) newState.wins[userTeam.id] = (newState.wins[userTeam.id] || 0) + 1;
        else newState.losses[userTeam.id] = (newState.losses[userTeam.id] || 0) + 1;

        // Sim other teams
        TEAMS.forEach(t => {
            if (t.id === userTeam.id) return;
            if (Math.random() > 0.5) newState.wins[t.id] = (newState.wins[t.id] || 0) + 1;
            else newState.losses[t.id] = (newState.losses[t.id] || 0) + 1;
        });

        onUpdateSeason(newState);
    };

    const handleTrade = (targetTeam: Team) => {
        // Force Swap: User's worst player for Target's worst player
        // In a real app, this would be complex. Here, simple feedback.
        alert(`Trade accepted! You swapped bench players with ${targetTeam.name}.`);
        setView('HUB');
    };

    if (view === 'TRADES') {
        return (
            <div className="w-full h-full bg-slate-900 text-white p-8">
                 <button onClick={() => setView('HUB')} className="mb-4 text-gray-400 hover:text-white font-bold">&lt; Back to Hub</button>
                 <h2 className="text-4xl font-[Teko] uppercase text-blue-400 mb-8">Trade Block</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {TEAMS.filter(t => t.id !== userTeam.id).map(t => (
                         <button 
                            key={t.id} 
                            onClick={() => handleTrade(t)}
                            className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-yellow-400 transition-all text-center"
                         >
                             <div className="text-2xl font-[Teko]" style={{ color: t.primaryColor }}>{t.name}</div>
                             <div className="text-xs text-gray-400">Request Trade</div>
                         </button>
                     ))}
                 </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 p-6 flex justify-between items-center shadow-lg z-10">
                <button onClick={onBack} className="text-gray-400 hover:text-white font-bold uppercase">&lt; Menu</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-4xl font-[Teko] uppercase tracking-widest">{userTeam.city} {userTeam.name}</h1>
                    <div className="text-sm font-mono text-gray-400">Season Hub • Game {seasonState.gamesPlayed + 1}</div>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Left: Next Game */}
                <div className="w-1/3 p-8 border-r border-slate-700 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                    <h3 className="text-gray-400 uppercase tracking-widest mb-8">Next Matchup</h3>
                    
                    <div className="flex flex-col items-center gap-4 mb-12">
                         <div className="text-8xl font-[Teko] font-bold" style={{ color: nextOpponent.primaryColor }}>VS</div>
                         <div className="text-3xl font-bold">{nextOpponent.city}</div>
                         <div className="text-5xl font-[Teko] uppercase" style={{ color: nextOpponent.primaryColor }}>{nextOpponent.name}</div>
                         <div className="px-3 py-1 bg-slate-800 rounded text-xs">Record: {(seasonState.wins[nextOpponent.id]||0)} - {(seasonState.losses[nextOpponent.id]||0)}</div>
                    </div>

                    <div className="space-y-4 w-full max-w-xs">
                        <button 
                            onClick={() => onPlayGame(userTeam, nextOpponent)}
                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-[Teko] text-3xl font-bold uppercase rounded shadow-lg flex items-center justify-center gap-2"
                        >
                            <Play size={24} fill="currentColor"/> Play Game
                        </button>
                        <button 
                            onClick={handleSimGame}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase rounded flex items-center justify-center gap-2"
                        >
                            Simulate
                        </button>
                    </div>
                </div>

                {/* Right: Standings & Actions */}
                <div className="flex-1 p-8 bg-slate-900 overflow-auto">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-3xl font-[Teko] uppercase text-white">League Standings</h2>
                        <button 
                            onClick={() => setView('TRADES')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold uppercase text-sm flex items-center gap-2"
                        >
                            <RefreshCw size={16}/> Trade Center
                        </button>
                    </div>

                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="p-4">Rank</th>
                                    <th className="p-4">Team</th>
                                    <th className="p-4 text-center">W</th>
                                    <th className="p-4 text-center">L</th>
                                    <th className="p-4 text-center">PCT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {sortedTeams.map((t, idx) => {
                                    const w = seasonState.wins[t.id] || 0;
                                    const l = seasonState.losses[t.id] || 0;
                                    const total = w + l;
                                    const pct = total > 0 ? (w/total).toFixed(3) : '.000';
                                    const isUser = t.id === userTeam.id;

                                    return (
                                        <tr key={t.id} className={isUser ? 'bg-yellow-900/20' : ''}>
                                            <td className="p-4 font-mono text-gray-400">{idx + 1}</td>
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ background: t.primaryColor }}></div>
                                                <span className={isUser ? 'text-yellow-400' : 'text-white'}>{t.name}</span>
                                            </td>
                                            <td className="p-4 text-center font-mono">{w}</td>
                                            <td className="p-4 text-center font-mono">{l}</td>
                                            <td className="p-4 text-center font-mono text-gray-400">{pct}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
