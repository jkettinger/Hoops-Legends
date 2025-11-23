
import React, { useState, useMemo } from 'react';
import { TEAMS } from '../constants';
import { Player, Team } from '../types';
import { User, Users, ArrowRight, Check, Zap } from 'lucide-react';

interface BlacktopSetupProps {
    onGameStart: (userTeam: Team, cpuTeam: Team) => void;
    onBack: () => void;
}

export const BlacktopSetup: React.FC<BlacktopSetupProps> = ({ onGameStart, onBack }) => {
    const [step, setStep] = useState<'MODE' | 'USER' | 'OPPONENT'>('MODE');
    const [modeSize, setModeSize] = useState(1); // 1v1 to 5v5
    const [userPlayer, setUserPlayer] = useState<Player | null>(null);
    const [opponentPlayer, setOpponentPlayer] = useState<Player | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Flatten all players for selection
    const allPlayers = useMemo(() => {
        const players: Player[] = [];
        TEAMS.forEach(t => {
            t.roster.forEach(p => {
                players.push({...p, teamId: t.id}); // preserve original team id context
            });
        });
        return players.sort((a, b) => b.rating - a.rating);
    }, []);

    const filteredPlayers = useMemo(() => {
        return allPlayers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allPlayers, searchTerm]);

    const handleModeSelect = (size: number) => {
        setModeSize(size);
        setStep('USER');
    };

    const handlePlayerSelect = (p: Player) => {
        if (step === 'USER') {
            setUserPlayer(p);
            setSearchTerm('');
            setStep('OPPONENT');
        } else {
            setOpponentPlayer(p);
            // Start Game Logic immediately after selecting opponent
            constructTeams(userPlayer!, p, modeSize);
        }
    };

    const constructTeams = (uPlayer: Player, oPlayer: Player, size: number) => {
        // Helper to get random players excluding selected ones
        const getRandomFillers = (count: number, excludeIds: string[]): Player[] => {
            const pool = allPlayers.filter(p => !excludeIds.includes(p.id));
            const fillers: Player[] = [];
            for(let i=0; i<count; i++) {
                const randIndex = Math.floor(Math.random() * pool.length);
                fillers.push({...pool[randIndex], id: `bt_${pool[randIndex].id}_${i}`}); // unique IDs
            }
            return fillers;
        };

        const uFillers = getRandomFillers(size - 1, [uPlayer.id, oPlayer.id]);
        const oFillers = getRandomFillers(size - 1, [uPlayer.id, oPlayer.id, ...uFillers.map(f => f.id)]);

        const userTeam: Team = {
            id: 'bt_user_team',
            name: 'My Squad',
            city: 'Blacktop',
            abbreviation: 'USER',
            primaryColor: '#ffffff', // White shirts for user team usually on blacktop
            secondaryColor: '#cccccc',
            roster: [{...uPlayer, isUser: true}, ...uFillers]
        };

        const cpuTeam: Team = {
            id: 'bt_cpu_team',
            name: 'Opponent',
            city: 'Blacktop',
            abbreviation: 'CPU',
            primaryColor: '#333333', // Dark shirts for cpu
            secondaryColor: '#000000',
            roster: [oPlayer, ...oFillers]
        };

        onGameStart(userTeam, cpuTeam);
    };

    return (
        <div className="w-full h-full bg-slate-900 text-white flex flex-col">
             {/* Header */}
             <div className="p-6 bg-slate-800 flex justify-between items-center">
                <button onClick={onBack} className="text-gray-400 font-bold hover:text-white">BACK</button>
                <h2 className="text-3xl font-[Teko] uppercase text-yellow-400">
                    {step === 'MODE' && "Select Game Mode"}
                    {step === 'USER' && "Select Your Player"}
                    {step === 'OPPONENT' && "Select Opponent"}
                </h2>
                <div className="w-10"></div>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-hidden p-8 flex flex-col items-center justify-center">
                
                {step === 'MODE' && (
                    <div className="grid grid-cols-5 gap-4 w-full max-w-6xl">
                        {[1, 2, 3, 4, 5].map(num => (
                            <button 
                                key={num}
                                onClick={() => handleModeSelect(num)}
                                className="aspect-square bg-slate-800 border-2 border-slate-600 rounded-2xl hover:bg-slate-700 hover:border-yellow-500 transition-all flex flex-col items-center justify-center group"
                            >
                                <div className="text-8xl font-[Teko] font-bold text-gray-500 group-hover:text-white transition-colors">{num}v{num}</div>
                                <div className="mt-4 text-sm text-gray-400 uppercase tracking-widest font-bold group-hover:text-yellow-400">Blacktop Rules</div>
                            </button>
                        ))}
                    </div>
                )}

                {(step === 'USER' || step === 'OPPONENT') && (
                    <div className="w-full h-full flex flex-col max-w-6xl">
                        <input 
                            type="text" 
                            placeholder="Search Players..." 
                            className="w-full p-4 bg-black border border-slate-700 rounded-lg mb-4 text-white focus:border-yellow-500 outline-none font-bold text-lg"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        
                        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-2">
                            {filteredPlayers.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => handlePlayerSelect(p)}
                                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center hover:bg-slate-700 hover:border-white transition-all text-left relative group"
                                >
                                    <div className="w-full flex justify-between items-start mb-2">
                                        <span className="font-[Teko] text-2xl text-white leading-none">{p.name}</span>
                                        <span className="font-bold text-yellow-400">{p.rating}</span>
                                    </div>
                                    <div className="w-full flex justify-between text-xs text-gray-400 font-mono mb-2">
                                        <span>{p.position}</span>
                                        <span className="uppercase">{TEAMS.find(t => t.id === p.teamId)?.name}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-600 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${p.shooting}%` }}></div>
                                    </div>
                                    <div className="w-full flex justify-between text-[10px] text-gray-500 mt-1">
                                        <span>SHT {p.shooting}</span>
                                        <span>SPD {p.speed}</span>
                                        <span>DEF {p.defense}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

             </div>
        </div>
    );
};
