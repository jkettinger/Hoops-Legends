import React from 'react';
import { Team } from '../types';
import { Trophy, Play, FastForward } from 'lucide-react';

interface PlayoffBracketProps {
  onBack: () => void;
  matches: any[];
  onPlayGame: (matchId: string, team1: Team, team2: Team) => void;
  onSimGame: (matchId: string) => void;
  userTeamId: string;
}

export const PlayoffBracket: React.FC<PlayoffBracketProps> = ({ onBack, matches, onPlayGame, onSimGame, userTeamId }) => {
  const semiFinals = matches.filter(m => m.round === 1);
  const finals = matches.find(m => m.round === 2);
  const champion = finals?.winner;

  return (
    <div className="w-full h-full bg-slate-900 text-white overflow-auto flex flex-col">
      <div className="p-6 flex justify-between items-center bg-slate-800 shadow-md z-10">
         <button onClick={onBack} className="text-gray-400 hover:text-white uppercase font-bold">&lt; Back</button>
         <h2 className="text-3xl font-[Teko] uppercase text-yellow-400">2025 Playoffs Bracket</h2>
         <div className="w-20"></div>
      </div>

      <div className="flex-1 flex items-center justify-center min-w-[1000px] p-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
         <div className="flex gap-24 items-center">
            
            {/* Round 1: Semis */}
            <div className="space-y-32">
               {semiFinals.map(match => (
                   <div key={match.id} className="relative">
                       <Matchup 
                          match={match} 
                          onPlay={() => onPlayGame(match.id, match.t1, match.t2)}
                          onSim={() => onSimGame(match.id)}
                          userTeamId={userTeamId}
                       />
                       <div className="absolute -right-12 top-1/2 w-12 h-1 bg-gray-600"></div>
                   </div>
               ))}
            </div>

            {/* Round 2: Finals */}
            <div className="relative">
               <div className="absolute -left-12 top-1/2 w-12 h-1 bg-gray-600"></div>
               {finals && finals.t1 && finals.t2 ? (
                 <Matchup 
                    match={finals} 
                    onPlay={() => onPlayGame(finals.id, finals.t1, finals.t2)}
                    onSim={() => onSimGame(finals.id)}
                    userTeamId={userTeamId}
                    isFinals
                 />
               ) : (
                 <div className="w-64 h-32 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 uppercase tracking-widest">
                    Finals TBD
                 </div>
               )}
            </div>

            {/* Champion */}
            {champion && (
                <div className="relative animate-fade-in-up">
                    <div className="absolute -left-12 top-1/2 w-12 h-1 bg-yellow-500"></div>
                    <div className="border-4 border-yellow-500 rounded-xl p-8 bg-black/80 shadow-[0_0_50px_rgba(255,215,0,0.4)] flex flex-col items-center text-center w-72 transform scale-110">
                        <Trophy size={64} className="text-yellow-400 mb-4 animate-pulse" />
                        <h3 className="text-gray-400 text-sm uppercase tracking-widest">NBA Finals Champions</h3>
                        <div className="text-5xl font-[Teko] text-white mt-2">{champion.name}</div>
                    </div>
                </div>
            )}

         </div>
      </div>
    </div>
  );
};

const Matchup: React.FC<{ match: any, onPlay: () => void, onSim: () => void, userTeamId: string, isFinals?: boolean }> = ({ match, onPlay, onSim, userTeamId, isFinals }) => {
    const { t1, t2, winner, score } = match;
    const isUserMatch = t1?.id === userTeamId || t2?.id === userTeamId;
    const isFinished = !!winner;

    return (
        <div className={`w-64 bg-slate-800 border-2 ${isUserMatch ? 'border-blue-500 shadow-blue-900/50 shadow-lg' : 'border-slate-600'} rounded-lg overflow-hidden relative group`}>
            
            <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-700">
                <span className="text-xs text-gray-400 font-mono">{isFinals ? 'FINALS' : 'SEMIS'}</span>
                {isFinished && <span className="text-green-400 font-bold text-xs">FINAL</span>}
            </div>

            {/* Team 1 */}
            <div className={`px-4 py-3 flex justify-between items-center ${winner === t1 ? 'bg-yellow-900/30' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: t1.primaryColor }}></div>
                    <span className={`font-bold ${winner === t1 ? 'text-yellow-400' : 'text-white'}`}>{t1.name}</span>
                </div>
                {isFinished && <span className="font-mono font-bold text-lg">{score.split('-')[0]}</span>}
            </div>
            
            {/* Team 2 */}
            <div className={`px-4 py-3 flex justify-between items-center ${winner === t2 ? 'bg-yellow-900/30' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: t2.primaryColor }}></div>
                    <span className={`font-bold ${winner === t2 ? 'text-yellow-400' : 'text-white'}`}>{t2.name}</span>
                </div>
                {isFinished && <span className="font-mono font-bold text-lg">{score.split('-')[1]}</span>}
            </div>

            {/* Action Overlay */}
            {!isFinished && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUserMatch ? (
                        <button onClick={onPlay} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold uppercase text-sm shadow-lg transform hover:scale-105 transition-all">
                            <Play size={16} fill="currentColor" /> Play Game
                        </button>
                    ) : (
                        <button onClick={onSim} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-full font-bold uppercase text-sm shadow-lg transform hover:scale-105 transition-all">
                            <FastForward size={16} fill="currentColor" /> Sim Game
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};