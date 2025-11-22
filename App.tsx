import React, { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { TeamSelect } from './components/TeamSelect';
import { GameEngine } from './components/GameEngine';
import { PlayoffBracket } from './components/PlayoffBracket';
import { GameMode, Team, Player } from './types';
import { TEAMS } from './constants';

interface Matchup {
    id: string;
    round: number;
    t1: Team | null;
    t2: Team | null;
    winner: Team | null;
    score: string;
}

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<GameMode>(GameMode.MENU);
  const [selectedTeam, setSelectedTeam] = useState<Team>(TEAMS[0]);
  const [opponentTeam, setOpponentTeam] = useState<Team>(TEAMS[1]);
  const [isBlacktopMode, setIsBlacktopMode] = useState(false);
  
  // Practice Mode State
  const [practicePlayer, setPracticePlayer] = useState<Player | undefined>(undefined);
  
  // Playoff State
  const [playoffMatches, setPlayoffMatches] = useState<Matchup[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  const initPlayoffs = (userTeam: Team) => {
      // 4 Team Playoff Demo
      const others = TEAMS.filter(t => t.id !== userTeam.id);
      const shuffled = [...others].sort(() => 0.5 - Math.random());
      
      const match1: Matchup = {
          id: 'semi_1',
          round: 1,
          t1: userTeam,
          t2: shuffled[0],
          winner: null,
          score: ''
      };

      const match2: Matchup = {
          id: 'semi_2',
          round: 1,
          t1: shuffled[1],
          t2: shuffled[2],
          winner: null,
          score: ''
      };

      const final: Matchup = {
          id: 'final',
          round: 2,
          t1: null,
          t2: null,
          winner: null,
          score: ''
      };

      setPlayoffMatches([match1, match2, final]);
      setCurrentMode(GameMode.PLAYOFFS);
  };

  const advancePlayoff = (matchId: string, winner: Team, scoreStr: string) => {
      const newMatches = [...playoffMatches];
      const matchIndex = newMatches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      // Update current match
      newMatches[matchIndex].winner = winner;
      newMatches[matchIndex].score = scoreStr;

      // Update Finals if round 1
      if (newMatches[matchIndex].round === 1) {
          const finalMatch = newMatches.find(m => m.id === 'final');
          if (finalMatch) {
              if (!finalMatch.t1) finalMatch.t1 = winner;
              else if (!finalMatch.t2) finalMatch.t2 = winner;
          }
      }

      setPlayoffMatches(newMatches);
  };

  const handleSimGame = (matchId: string) => {
      const match = playoffMatches.find(m => m.id === matchId);
      if (!match || !match.t1 || !match.t2) return;

      const r1 = Math.random() * match.t1.roster[0].rating;
      const r2 = Math.random() * match.t2.roster[0].rating;
      const winner = r1 > r2 ? match.t1 : match.t2;
      const score = r1 > r2 ? "85-78" : "92-95";
      
      advancePlayoff(matchId, winner, score);
  };

  const handleStartPlayoffGame = (matchId: string, t1: Team, t2: Team) => {
      setCurrentMatchId(matchId);
      setSelectedTeam(t1);
      setOpponentTeam(t2);
      setCurrentMode(GameMode.GAME);
  };

  const handleTeamSelected = (pTeam: Team, cpuTeam: Team) => {
      if (nextMode === GameMode.PLAYOFFS) {
           initPlayoffs(pTeam);
           setNextMode(GameMode.GAME); 
      } else {
           setSelectedTeam(pTeam);
           setOpponentTeam(cpuTeam);
           setCurrentMode(GameMode.GAME);
      }
  };

  const [nextMode, setNextMode] = useState<GameMode>(GameMode.GAME);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden text-white font-sans select-none">
      {currentMode === GameMode.MENU && (
          <MainMenu onSelectMode={(mode) => {
              if (mode === GameMode.PLAYOFFS) {
                  setNextMode(GameMode.PLAYOFFS);
                  setIsBlacktopMode(false);
                  setCurrentMode(GameMode.TEAM_SELECT);
              } else if (mode === GameMode.BLACKTOP_SELECT) {
                  setNextMode(GameMode.GAME);
                  setIsBlacktopMode(true);
                  setCurrentMode(GameMode.TEAM_SELECT);
              } else if (mode === GameMode.PRACTICE_SELECT) {
                  setNextMode(GameMode.PRACTICE_SELECT);
                  setIsBlacktopMode(false);
                  setCurrentMode(GameMode.TEAM_SELECT);
              } else {
                  setNextMode(GameMode.GAME);
                  setIsBlacktopMode(false);
                  setCurrentMode(GameMode.TEAM_SELECT);
              }
          }} />
      )}

      {currentMode === GameMode.TEAM_SELECT && (
          <TeamSelect 
            onTeamSelected={handleTeamSelected} 
            onPlayerSelected={(player) => {
                setPracticePlayer(player);
                setCurrentMode(GameMode.GAME);
            }}
            onBack={() => setCurrentMode(GameMode.MENU)} 
            isPractice={nextMode === GameMode.PRACTICE_SELECT}
          />
      )}

      {currentMode === GameMode.GAME && (
          <GameEngine 
            playerTeam={selectedTeam} 
            cpuTeam={opponentTeam} 
            isPlayoff={!!currentMatchId}
            isPractice={nextMode === GameMode.PRACTICE_SELECT}
            practicePlayer={practicePlayer}
            onGameOver={(winner, s1, s2) => {
              if (currentMatchId) {
                  const winningTeam = winner === 'player' ? selectedTeam : opponentTeam;
                  advancePlayoff(currentMatchId, winningTeam, `${s1}-${s2}`);
                  setCurrentMatchId(null);
                  setCurrentMode(GameMode.PLAYOFFS);
              } else {
                  alert(`Game Over! Winner: ${winner === 'player' ? selectedTeam.name : opponentTeam.name}`);
                  setCurrentMode(GameMode.MENU);
              }
            }}
            onExit={() => {
                if(currentMatchId) setCurrentMode(GameMode.PLAYOFFS);
                else setCurrentMode(GameMode.MENU);
            }}
            isBlacktop={isBlacktopMode}
          />
      )}

      {currentMode === GameMode.PLAYOFFS && (
          <PlayoffBracket 
             matches={playoffMatches}
             userTeamId={selectedTeam.id}
             onPlayGame={handleStartPlayoffGame}
             onSimGame={handleSimGame}
             onBack={() => setCurrentMode(GameMode.MENU)} 
          />
      )}
    </div>
  );
};

export default App;