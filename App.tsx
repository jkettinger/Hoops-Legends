import React, { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { TeamSelect } from './components/TeamSelect';
import { GameEngine } from './components/GameEngine';
import { PlayoffBracket } from './components/PlayoffBracket';
import { MyCareer } from './components/MyCareer';
import { GameMode, Team, Player, CareerSave, CareerPhase } from './types';
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
  const [playoffUserTeam, setPlayoffUserTeam] = useState<Team | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [nextMode, setNextMode] = useState<GameMode>(GameMode.GAME);

  // MyCareer State
  const [careerSaves, setCareerSaves] = useState<CareerSave[]>([
      { 
          id: 1, name: "Flash", height: "6'3\"", weight: "195 lbs", teamId: 'bucks', coins: 500, phase: CareerPhase.NBA_SEASON, inventory: [], 
          stats: { rings: 0, ppg: 25.4, gamesPlayed: 12 },
          playerData: { ...TEAMS[0].roster[0], isUser: true, name: "Flash", id: "mc_demo" }
      }
  ]);
  const [activeCareerSave, setActiveCareerSave] = useState<CareerSave | null>(null);

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
      setPlayoffUserTeam(userTeam);
      setCurrentMode(GameMode.PLAYOFFS);
  };

  // Helper to update matches immutably
  const updateBracket = (matches: Matchup[], matchId: string, winner: Team, scoreStr: string): Matchup[] => {
      const newMatches = matches.map(m => ({...m})); // Shallow copy objects
      const match = newMatches.find(m => m.id === matchId);
      if (!match) return matches;

      match.winner = winner;
      match.score = scoreStr;

      // Propagate to next round (Simple 4-team logic)
      if (match.round === 1) {
          const finalMatch = newMatches.find(m => m.id === 'final');
          if (finalMatch) {
              // Assign to first empty slot, ensuring no duplicate team in case of weird state
              if (!finalMatch.t1) finalMatch.t1 = winner;
              else if (!finalMatch.t2 && finalMatch.t1.id !== winner.id) finalMatch.t2 = winner;
          }
      }
      return newMatches;
  };

  const advancePlayoff = (matchId: string, winner: Team, scoreStr: string) => {
      setPlayoffMatches(prev => updateBracket(prev, matchId, winner, scoreStr));
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

  // Check active playoff status
  const userLostPlayoffs = React.useMemo(() => {
    if (!playoffUserTeam || playoffMatches.length === 0) return false;
    // Check if any match with user was won by opponent
    return playoffMatches.some(m => m.winner && (m.t1?.id === playoffUserTeam.id || m.t2?.id === playoffUserTeam.id) && m.winner.id !== playoffUserTeam.id);
  }, [playoffMatches, playoffUserTeam]);

  const hasActivePlayoff = playoffMatches.length > 0 && !!playoffUserTeam && !userLostPlayoffs;

  const handleUpdateCareerSave = (updatedSave: CareerSave) => {
      setCareerSaves(prev => {
          const exists = prev.find(s => s.id === updatedSave.id);
          if (exists) {
              return prev.map(s => s.id === updatedSave.id ? updatedSave : s);
          }
          return [...prev, updatedSave];
      });
      setActiveCareerSave(updatedSave);
  };

  const handleStartCareerGame = (save: CareerSave, isCollege: boolean = false) => {
       setActiveCareerSave(save);
       
       if (isCollege) {
           // Generic College Teams
           const collegePlayerTeam: Team = {
               id: 'college_user', name: 'Tigers', city: 'College', abbreviation: 'TIG', primaryColor: '#ffaa00', secondaryColor: '#000',
               roster: [
                   { ...save.playerData, isUser: true },
                   { ...TEAMS[0].roster[1], id: 'c2', name: 'Teammate 1' },
                   { ...TEAMS[0].roster[2], id: 'c3', name: 'Teammate 2' },
                   { ...TEAMS[0].roster[3], id: 'c4', name: 'Teammate 3' },
                   { ...TEAMS[0].roster[4], id: 'c5', name: 'Teammate 4' }
               ]
           };
           const collegeCpuTeam: Team = {
               id: 'college_cpu', name: 'Crimson', city: 'State', abbreviation: 'ST', primaryColor: '#aa0000', secondaryColor: '#fff',
               roster: TEAMS[1].roster.map((p, i) => ({...p, id: `cpu_c_${i}`, name: `Opponent ${i+1}`}))
           };
           setSelectedTeam(collegePlayerTeam);
           setOpponentTeam(collegeCpuTeam);
           setCurrentMode(GameMode.GAME);
       } else {
           // NBA Game
           const userTeam = TEAMS.find(t => t.id === save.teamId) || TEAMS[0];
           // Inject user player into roster
           const rosterWithUser = [...userTeam.roster];
           rosterWithUser[0] = { ...save.playerData, isUser: true, teamId: 'player' }; // Replace PG for simplicity or logic
           
           const actualUserTeam = { ...userTeam, roster: rosterWithUser };
           const opponent = TEAMS.find(t => t.id !== userTeam.id) || TEAMS[1];
           
           setSelectedTeam(actualUserTeam);
           setOpponentTeam(opponent);
           setCurrentMode(GameMode.GAME);
       }
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden text-white font-sans select-none">
      {currentMode === GameMode.MENU && (
          <MainMenu 
              onSelectMode={(mode) => {
                  if (mode === GameMode.PLAYOFFS) {
                      if (hasActivePlayoff) {
                          // Resume active playoff
                          if (playoffUserTeam) setSelectedTeam(playoffUserTeam);
                          setCurrentMode(GameMode.PLAYOFFS);
                      } else {
                          // Start new
                          setNextMode(GameMode.PLAYOFFS);
                          setIsBlacktopMode(false);
                          setCurrentMode(GameMode.TEAM_SELECT);
                      }
                  } else if (mode === GameMode.BLACKTOP_SELECT) {
                      setNextMode(GameMode.GAME);
                      setIsBlacktopMode(true);
                      setCurrentMode(GameMode.TEAM_SELECT);
                  } else if (mode === GameMode.PRACTICE_SELECT) {
                      setNextMode(GameMode.PRACTICE_SELECT);
                      setIsBlacktopMode(false);
                      setCurrentMode(GameMode.TEAM_SELECT);
                  } else if (mode === GameMode.MY_CAREER_HUB) {
                      setCurrentMode(GameMode.MY_CAREER_HUB);
                  } else {
                      setNextMode(GameMode.GAME);
                      setIsBlacktopMode(false);
                      setCurrentMode(GameMode.TEAM_SELECT);
                  }
              }} 
              hasActivePlayoff={hasActivePlayoff}
          />
      )}

      {currentMode === GameMode.MY_CAREER_HUB && (
          <MyCareer 
             saves={careerSaves}
             onUpdateSave={handleUpdateCareerSave}
             onDeleteSave={(id) => setCareerSaves(prev => prev.filter(s => s.id !== id))}
             onPlayGame={handleStartCareerGame}
             onBack={() => setCurrentMode(GameMode.MENU)}
          />
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
            isCollege={activeCareerSave?.phase === CareerPhase.COLLEGE_GAME}
            practicePlayer={practicePlayer}
            onGameOver={(winner, s1, s2, playerStats) => {
              if (activeCareerSave) {
                  // MyCareer Game Logic
                  if (activeCareerSave.phase === CareerPhase.COLLEGE_GAME) {
                      // Move to next phase regardless of win/loss (story progression)
                      const updated = { ...activeCareerSave, phase: CareerPhase.COACH_TALK };
                      handleUpdateCareerSave(updated);
                      setCurrentMode(GameMode.MY_CAREER_HUB);
                  } else {
                      // NBA Season Game - Earn Coins
                      let earnedCoins = 0;
                      if (playerStats && playerStats.length > 0) {
                           // Approximate user stats from list
                           const stats = playerStats[0]; // Rough approximation
                           earnedCoins = (stats.pts * 2) + (stats.reb * 3) + (stats.stl * 5);
                      }
                      if (earnedCoins > 0) {
                          alert(`Great Game! You earned ${earnedCoins} coins based on your stats.`);
                          const updated = { ...activeCareerSave, coins: activeCareerSave.coins + earnedCoins };
                          handleUpdateCareerSave(updated);
                      }
                      setCurrentMode(GameMode.MY_CAREER_HUB);
                  }
                  return;
              }

              if (currentMatchId) {
                  const winningTeam = winner === 'player' ? selectedTeam : opponentTeam;
                  const scoreStr = `${s1}-${s2}`;

                  // Update brackets and auto-sim other matches
                  setPlayoffMatches(prev => {
                      // 1. Update the user's match result
                      let updated = updateBracket(prev, currentMatchId, winningTeam, scoreStr);
                      
                      // 2. Auto-sim ANY other pending Round 1 matches to progress tournament to Finals
                      // We must filter for matches that are round 1, are NOT the user's current match, and have NO winner yet.
                      const otherSemis = updated.filter(m => m.round === 1 && m.id !== currentMatchId && !m.winner);
                      
                      otherSemis.forEach(om => {
                           if (om.t1 && om.t2) {
                               const r1 = Math.random() * om.t1.roster[0].rating;
                               const r2 = Math.random() * om.t2.roster[0].rating;
                               const simWinner = r1 > r2 ? om.t1 : om.t2;
                               const simScore = r1 > r2 ? "88-82" : "95-98";
                               // IMPORTANT: Use the result of updateBracket for the next iteration
                               updated = updateBracket(updated, om.id, simWinner, simScore);
                           }
                      });
                      
                      return updated;
                  });

                  setCurrentMatchId(null);
                  setCurrentMode(GameMode.PLAYOFFS);
              } else {
                  // Standard Play Now
                  alert(`Game Over! Winner: ${winner === 'player' ? selectedTeam.name : opponentTeam.name}`);
                  setCurrentMode(GameMode.MENU);
              }
            }}
            onExit={() => {
                if(currentMatchId) setCurrentMode(GameMode.PLAYOFFS);
                else if (activeCareerSave) setCurrentMode(GameMode.MY_CAREER_HUB);
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