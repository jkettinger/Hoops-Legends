
import React, { useState, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { TeamSelect } from './components/TeamSelect';
import { GameEngine } from './components/GameEngine';
import { PlayoffBracket } from './components/PlayoffBracket';
import { MyCareer } from './components/MyCareer';
import { BlacktopSetup } from './components/BlacktopSetup';
import { GameMode, Team, Player, CareerSave, CareerPhase, Position } from './types';
import { TEAMS } from './constants';

interface Matchup {
    id: string;
    round: number;
    t1: Team | null;
    t2: Team | null;
    winner: Team | null;
    score: string;
}

// Helper to load state from LocalStorage safely
const loadState = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.warn(`Error loading ${key} from storage:`, error);
        return fallback;
    }
};

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<GameMode>(GameMode.MENU);
  const [selectedTeam, setSelectedTeam] = useState<Team>(TEAMS[0]);
  const [opponentTeam, setOpponentTeam] = useState<Team>(TEAMS[1]);
  const [isBlacktopMode, setIsBlacktopMode] = useState(false);
  
  // Global Economy & Inventory (Persisted)
  const [globalCoins, setGlobalCoins] = useState(() => loadState('hoops_coins', 100));
  const [globalInventory, setGlobalInventory] = useState<string[]>(() => loadState('hoops_inventory', []));
  const [customJerseyColors, setCustomJerseyColors] = useState(() => loadState('hoops_custom_jersey', { primary: '#000000', secondary: '#ffffff' }));

  // Practice Mode State
  const [practicePlayer, setPracticePlayer] = useState<Player | undefined>(undefined);
  
  // Playoff State (Persisted)
  const [playoffMatches, setPlayoffMatches] = useState<Matchup[]>(() => loadState('hoops_playoff_matches', []));
  const [playoffUserTeam, setPlayoffUserTeam] = useState<Team | null>(() => loadState('hoops_playoff_user_team', null));
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [nextMode, setNextMode] = useState<GameMode>(GameMode.GAME);

  // MyCareer State (Persisted)
  const defaultCareerSaves: CareerSave[] = [
      { 
          id: 1, name: "Flash", height: "6'3\"", weight: "195 lbs", teamId: 'bucks', coins: 500, phase: CareerPhase.NBA_SEASON, inventory: [], 
          stats: { rings: 0, ppg: 25.4, gamesPlayed: 12 },
          lifestyle: { houseLevel: 1, hasWife: false, relationshipProgress: 0, foodLevel: 80, dripLevel: 0 },
          playerData: { ...TEAMS[0].roster[0], isUser: true, name: "Flash", id: "mc_demo" }
      }
  ];
  const [careerSaves, setCareerSaves] = useState<CareerSave[]>(() => loadState('hoops_career_saves', defaultCareerSaves));
  const [activeCareerSave, setActiveCareerSave] = useState<CareerSave | null>(null);
  const [currentWager, setCurrentWager] = useState(0);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem('hoops_coins', JSON.stringify(globalCoins)); }, [globalCoins]);
  useEffect(() => { localStorage.setItem('hoops_inventory', JSON.stringify(globalInventory)); }, [globalInventory]);
  useEffect(() => { localStorage.setItem('hoops_custom_jersey', JSON.stringify(customJerseyColors)); }, [customJerseyColors]);
  useEffect(() => { localStorage.setItem('hoops_career_saves', JSON.stringify(careerSaves)); }, [careerSaves]);
  useEffect(() => { localStorage.setItem('hoops_playoff_matches', JSON.stringify(playoffMatches)); }, [playoffMatches]);
  useEffect(() => { localStorage.setItem('hoops_playoff_user_team', JSON.stringify(playoffUserTeam)); }, [playoffUserTeam]);


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
           // Apply Custom Jersey Colors if enabled
           let finalTeam = pTeam;
           if (globalInventory.includes('customize_jersey')) {
               finalTeam = {
                   ...pTeam,
                   primaryColor: customJerseyColors.primary,
                   secondaryColor: customJerseyColors.secondary
               };
           }

           setSelectedTeam(finalTeam);
           setOpponentTeam(cpuTeam);
           setCurrentMode(GameMode.GAME);
      }
  };

  const handleBuyItem = (item: string, cost: number) => {
      if (globalCoins >= cost && !globalInventory.includes(item)) {
          setGlobalCoins(prev => prev - cost);
          setGlobalInventory(prev => [...prev, item]);
          return true;
      }
      return false;
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

  const handleStartCareerGame = (save: CareerSave, isCollege: boolean = false, isWager: boolean = false, wagerAmount: number = 0) => {
       setActiveCareerSave(save);
       
       if (isWager) {
           setCurrentWager(wagerAmount);
           setIsBlacktopMode(true);
           
           // Create a weak High School Team
           const hsTeam: Team = {
               id: 'hs_opp', name: 'High Schoolers', city: 'Local', abbreviation: 'HS', primaryColor: '#555', secondaryColor: '#999',
               roster: Array.from({length: 3}).map((_, i) => ({
                   id: `hs_${i}`, name: `H.S. Kid ${i+1}`, number: `${i}`, position: Position.SG, 
                   rating: 50 + Math.random()*10, speed: 60, shooting: 50, defense: 40, teamId: 'hs_opp'
               }))
           };

           // User Team (3v3 format for street)
           const userTeam = TEAMS.find(t => t.id === save.teamId) || TEAMS[0];
           const streetRoster = [
               { ...save.playerData, isUser: true, teamId: 'player' },
               { ...userTeam.roster[1], teamId: 'player' },
               { ...userTeam.roster[2], teamId: 'player' }
           ];
           
           const streetTeam: Team = { ...userTeam, name: 'My Squad', roster: streetRoster };

           setSelectedTeam(streetTeam);
           setOpponentTeam(hsTeam);
           setCurrentMode(GameMode.GAME);

       } else if (isCollege) {
           setIsBlacktopMode(false);
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
       } else if (save.phase === CareerPhase.SKILLS_CHALLENGE) {
           setIsBlacktopMode(false);
           // ROOKIE SKILLS CHALLENGE (5v5 Showcase)
           const rookieTeam: Team = {
               id: 'rookie_user', name: 'Rookies', city: 'Draft', abbreviation: 'RKS', primaryColor: '#00BFFF', secondaryColor: '#FFFFFF',
               roster: [
                   { ...save.playerData, isUser: true },
                   { ...TEAMS[2].roster[1], id: 'r2', name: 'Rookie Guard' },
                   { ...TEAMS[2].roster[2], id: 'r3', name: 'Rookie Wing' },
                   { ...TEAMS[2].roster[3], id: 'r4', name: 'Rookie Big' },
                   { ...TEAMS[2].roster[4], id: 'r5', name: 'Rookie Center' }
               ]
           };
           const prospectsTeam: Team = {
               id: 'rookie_cpu', name: 'Prospects', city: 'Draft', abbreviation: 'PRS', primaryColor: '#FF4500', secondaryColor: '#111111',
               roster: TEAMS[3].roster.map((p, i) => ({...p, id: `cpu_r_${i}`, name: `Prospect ${i+1}`, rating: 70}))
           };
           
           setSelectedTeam(rookieTeam);
           setOpponentTeam(prospectsTeam);
           setCurrentMode(GameMode.GAME);
       } else {
           setIsBlacktopMode(false);
           // NBA Game
           const userTeam = TEAMS.find(t => t.id === save.teamId) || TEAMS[0];
           // Inject user player into roster
           const rosterWithUser = [...userTeam.roster];
           // Ensure the player data matches the save, forcing isUser and correct ID
           rosterWithUser[0] = { ...save.playerData, isUser: true, teamId: 'player', id: save.playerData.id }; 
           
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
              globalCoins={globalCoins}
              inventory={globalInventory}
              onBuyItem={handleBuyItem}
              onSetJerseyColors={setCustomJerseyColors}
              customJerseyColors={customJerseyColors}
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
                      setIsBlacktopMode(true);
                      setCurrentMode(GameMode.BLACKTOP_SELECT); // Go to new Setup
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

      {currentMode === GameMode.BLACKTOP_SELECT && (
          <BlacktopSetup 
              onBack={() => setCurrentMode(GameMode.MENU)}
              onGameStart={(uTeam, cTeam) => {
                  setSelectedTeam(uTeam);
                  setOpponentTeam(cTeam);
                  setCurrentMode(GameMode.GAME);
              }}
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
            lockedPlayerId={activeCareerSave ? activeCareerSave.playerData.id : undefined}
            activeBoosts={globalInventory} // Pass inventory to apply boosts
            onGameOver={(winner, s1, s2, playerStats) => {
              // --- MY CAREER LOGIC ---
              if (activeCareerSave) {
                  // Wager Match Logic
                  if (currentWager > 0) {
                      if (winner === 'player') {
                          alert(`You hustled the high schoolers!\nWon: ${currentWager * 2} Coins`);
                          const updated = { ...activeCareerSave, coins: activeCareerSave.coins + (currentWager * 2) };
                          handleUpdateCareerSave(updated);
                      } else {
                          alert(`You lost to the kids... say goodbye to your ${currentWager} coins.`);
                          // Coins already deducted at start
                      }
                      setCurrentWager(0);
                      setCurrentMode(GameMode.MY_CAREER_HUB);
                      return;
                  }

                  if (activeCareerSave.phase === CareerPhase.COLLEGE_GAME) {
                      const updated = { ...activeCareerSave, phase: CareerPhase.COACH_TALK };
                      handleUpdateCareerSave(updated);
                      setCurrentMode(GameMode.MY_CAREER_HUB);
                  } else if (activeCareerSave.phase === CareerPhase.SKILLS_CHALLENGE) {
                      // Handle Skills Challenge Results
                      let pScore = 0;
                      let pGrade = 'C';
                      let rewardCoins = 50;
                      let ratingBoost = 0;
                      
                      if (playerStats && playerStats.length > 0) {
                           const stats = playerStats[0];
                           pScore = (stats.pts * 2) + (stats.reb * 2) + (stats.stl * 3);
                           
                           if (pScore > 30) { pGrade = 'A+'; rewardCoins = 300; ratingBoost = 3; }
                           else if (pScore > 20) { pGrade = 'B'; rewardCoins = 150; ratingBoost = 2; }
                           else if (pScore > 10) { pGrade = 'C'; rewardCoins = 75; ratingBoost = 1; }
                           else { pGrade = 'D'; rewardCoins = 25; ratingBoost = 0; }
                      }

                      alert(`Rookie Showcase Complete!\nYour Grade: ${pGrade}\nReward: ${rewardCoins} Coins\nRating Boost: +${ratingBoost}`);
                      
                      const updated = { 
                          ...activeCareerSave, 
                          phase: CareerPhase.NBA_SEASON,
                          coins: activeCareerSave.coins + rewardCoins,
                          playerData: {
                              ...activeCareerSave.playerData,
                              rating: activeCareerSave.playerData.rating + ratingBoost
                          }
                      };
                      handleUpdateCareerSave(updated);
                      setCurrentMode(GameMode.MY_CAREER_HUB);

                  } else {
                      // NBA Season - Earn Coins logic specific to Career
                      let earnedCoins = 0;
                      if (playerStats && playerStats.length > 0) {
                           const stats = playerStats[0]; 
                           earnedCoins = (stats.pts * 2) + (stats.reb * 3) + (stats.stl * 5);
                      }
                      if (earnedCoins > 0) {
                          alert(`Great Game! You earned ${earnedCoins} career coins.`);
                          const updated = { ...activeCareerSave, coins: activeCareerSave.coins + earnedCoins };
                          handleUpdateCareerSave(updated);
                      }
                      setCurrentMode(GameMode.MY_CAREER_HUB);
                  }
                  return;
              }

              // --- PLAY NOW / BLACKTOP / PLAYOFF LOGIC ---

              // 1. Calculate Global Coins (Coins for WIN only, no performance punishment)
              let coinMsg = "";
              if (!currentMatchId) { // Only for Play Now / Blacktop
                  if (winner === 'player') {
                      setGlobalCoins(c => c + 30);
                      coinMsg += "You won! (+30 Coins).";
                  }
                  
                  if (coinMsg) alert(coinMsg);
              }


              // 2. Playoff Progression
              if (currentMatchId) {
                  const winningTeam = winner === 'player' ? selectedTeam : opponentTeam;
                  const scoreStr = `${s1}-${s2}`;

                  setPlayoffMatches(prev => {
                      let updated = updateBracket(prev, currentMatchId, winningTeam, scoreStr);
                      const otherSemis = updated.filter(m => m.round === 1 && m.id !== currentMatchId && !m.winner);
                      otherSemis.forEach(om => {
                           if (om.t1 && om.t2) {
                               const r1 = Math.random() * om.t1.roster[0].rating;
                               const r2 = Math.random() * om.t2.roster[0].rating;
                               const simWinner = r1 > r2 ? om.t1 : om.t2;
                               const simScore = r1 > r2 ? "88-82" : "95-98";
                               updated = updateBracket(updated, om.id, simWinner, simScore);
                           }
                      });
                      return updated;
                  });

                  setCurrentMatchId(null);
                  setCurrentMode(GameMode.PLAYOFFS);
              } else {
                  // Standard Play Now
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
