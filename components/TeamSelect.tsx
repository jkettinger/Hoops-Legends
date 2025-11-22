import React, { useState, useEffect } from 'react';
import { TEAMS } from '../constants';
import { Team, Player } from '../types';
import { ChevronLeft, ChevronRight, Shield, Zap, Activity, User } from 'lucide-react';

interface TeamSelectProps {
  onTeamSelected: (playerTeam: Team, cpuTeam: Team) => void;
  onPlayerSelected?: (player: Player) => void; // For Practice Mode
  onBack: () => void;
  isPractice?: boolean;
}

export const TeamSelect: React.FC<TeamSelectProps> = ({ onTeamSelected, onPlayerSelected, onBack, isPractice }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [opponentIndex, setOpponentIndex] = useState(1);
  const [isSelectingOpponent, setIsSelectingOpponent] = useState(false);
  
  // Practice Mode State
  const [isSelectingPlayer, setIsSelectingPlayer] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);

  // Scroll Wheel Handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        // Scroll Down
        if (isSelectingPlayer) {
            setPlayerIndex(prev => (prev + 1) % TEAMS[selectedIndex].roster.length);
        } else if (isSelectingOpponent) {
          setOpponentIndex((prev) => (prev + 1) % TEAMS.length);
        } else {
          setSelectedIndex((prev) => (prev + 1) % TEAMS.length);
        }
      } else {
        // Scroll Up
        if (isSelectingPlayer) {
            setPlayerIndex(prev => (prev - 1 + TEAMS[selectedIndex].roster.length) % TEAMS[selectedIndex].roster.length);
        } else if (isSelectingOpponent) {
           setOpponentIndex((prev) => (prev - 1 + TEAMS.length) % TEAMS.length);
        } else {
           setSelectedIndex((prev) => (prev - 1 + TEAMS.length) % TEAMS.length);
        }
      }
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isSelectingOpponent, isSelectingPlayer, selectedIndex]);

  const currentTeam = TEAMS[selectedIndex];
  const currentOpponent = TEAMS[opponentIndex];

  const handleConfirm = () => {
    if (isPractice) {
        if (!isSelectingPlayer) {
            setIsSelectingPlayer(true);
            setPlayerIndex(0); // Reset player index when entering player select
        } else {
            // Confirm Player
            if (onPlayerSelected) {
                onPlayerSelected(currentTeam.roster[playerIndex]);
            }
        }
        return;
    }

    // Normal Mode
    if (!isSelectingOpponent) {
      setIsSelectingOpponent(true);
      if (selectedIndex === opponentIndex) {
        setOpponentIndex((selectedIndex + 1) % TEAMS.length);
      }
    } else {
      onTeamSelected(currentTeam, currentOpponent);
    }
  };

  const getTitle = () => {
      if (isPractice) return isSelectingPlayer ? "Select Player" : "Select Team";
      return isSelectingOpponent ? "Select Opponent" : "Select Your Team";
  };

  return (
    <div className="w-full h-full bg-slate-900 text-white flex flex-col items-center relative overflow-hidden">
      {/* Header */}
      <div className="w-full p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent">
        <button onClick={() => {
            if (isSelectingPlayer) setIsSelectingPlayer(false);
            else if (isSelectingOpponent) setIsSelectingOpponent(false);
            else onBack();
        }} className="text-gray-400 hover:text-white uppercase font-bold tracking-widest">
          &lt; Back
        </button>
        <h2 className="text-4xl font-[Teko] uppercase tracking-widest text-yellow-400">
          {getTitle()}
        </h2>
        <div className="w-20"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-row w-full items-center justify-center gap-12 px-12 z-10">
        
        {/* Left Side: Team Details */}
        <div className="flex-1 h-[600px] flex flex-col items-end justify-center text-right space-y-2">
           <h1 className="text-8xl font-[Teko] font-bold uppercase leading-none" style={{ color: isSelectingOpponent ? currentOpponent.primaryColor : currentTeam.primaryColor }}>
             {isSelectingOpponent ? currentOpponent.city : currentTeam.city}
           </h1>
           <h1 className="text-9xl font-[Teko] font-bold uppercase leading-none text-white drop-shadow-lg mb-8">
             {isSelectingOpponent ? currentOpponent.name : currentTeam.name}
           </h1>
           
           <div className="flex gap-4 text-sm font-mono text-gray-400 bg-black/40 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" /> OFF: 92
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-400" /> DEF: 88
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-green-400" /> OVR: 90
              </div>
           </div>
        </div>

        {/* Center: Player Preview (Visual) */}
        <div className="w-[400px] h-[600px] relative bg-slate-800 rounded-2xl border-4 border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden group">
            {/* Simulated Jersey Preview */}
            <div 
              className="absolute inset-0 opacity-50 transition-colors duration-500"
              style={{ backgroundColor: isSelectingOpponent ? currentOpponent.primaryColor : currentTeam.primaryColor }}
            />
            <div className="z-10 text-center">
              <div className="text-[200px] font-bold opacity-20 text-black select-none">
                {isSelectingOpponent ? currentOpponent.abbreviation : currentTeam.abbreviation}
              </div>
            </div>
            
            {/* Roster List Overlay */}
            <div className={`absolute bottom-0 w-full bg-black/80 backdrop-blur-md p-6 transition-transform duration-300 ${isSelectingPlayer ? 'translate-y-0' : 'translate-y-0'}`}>
               <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
                  {isSelectingPlayer ? "Choose Player to Control" : "Starting Lineup"}
               </h3>
               <div className="space-y-2">
                 {(isSelectingOpponent ? currentOpponent : currentTeam).roster.map((p, idx) => (
                   <div 
                      key={p.id} 
                      className={`flex justify-between items-center text-sm border-b pb-1 cursor-pointer
                        ${isSelectingPlayer && idx === playerIndex ? 'bg-white/20 pl-2 pr-2 border-yellow-400' : 'border-white/10'}
                        ${isSelectingPlayer && idx !== playerIndex ? 'opacity-50' : 'opacity-100'}
                      `}
                      onClick={() => {
                          if(isSelectingPlayer) setPlayerIndex(idx);
                      }}
                   >
                      <span className={`font-bold ${isSelectingPlayer && idx === playerIndex ? 'text-yellow-400' : 'text-white'}`}>
                        {p.name}
                      </span>
                      <div className="flex gap-3 text-xs font-mono text-gray-400">
                        <span>{p.position}</span>
                        <span className={`font-bold ${p.rating > 90 ? 'text-yellow-400' : 'text-white'}`}>{p.rating}</span>
                      </div>
                   </div>
                 ))}
               </div>
               {isSelectingPlayer && (
                   <div className="mt-2 text-center text-xs text-yellow-400 animate-pulse">
                       Press Enter or Button to Select {currentTeam.roster[playerIndex].name.split(' ').pop()}
                   </div>
               )}
            </div>
        </div>

        {/* Right Side: Navigation Hints */}
        <div className="flex-1 flex flex-col justify-center pl-8 text-gray-500 font-mono space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-8 h-12 border-2 border-gray-600 rounded-full flex justify-center pt-2 animate-bounce">
                 <div className="w-1 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <span>Scroll to {isSelectingPlayer ? "Select Player" : "Change Team"}</span>
           </div>
           <button 
             onClick={handleConfirm}
             className="mt-8 px-8 py-4 bg-white text-black font-[Teko] text-3xl uppercase font-bold hover:bg-yellow-400 transition-colors rounded shadow-[0_0_20px_rgba(255,255,255,0.3)] text-center w-max"
           >
             {isPractice 
                ? (isSelectingPlayer ? "Start Practice" : "Select Team") 
                : (isSelectingOpponent ? "Start Game" : "Confirm Team")
             }
           </button>
        </div>

      </div>
    </div>
  );
};