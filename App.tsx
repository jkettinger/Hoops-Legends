
import React, { useState, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { TeamSelect } from './components/TeamSelect';
import { GameEngine } from './components/GameEngine';
import { PlayoffBracket } from './components/PlayoffBracket';
import { MyCareer } from './components/MyCareer';
import { BlacktopSetup } from './components/BlacktopSetup';
import { SeasonMode } from './components/SeasonMode';
import { GameMode, Team, Player, CareerSave, CareerPhase, SeasonState } from './types';
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
  const [nextMode, setNextMode] = useState<GameMode>(GameMode.GAME); // Used for Team Select routing

  // Gameplay State
  const [selectedTeam, setSelectedTeam] = useState<Team>(TEAMS[0]);
  const [opponentTeam, setOpponentTeam] = useState<Team>(TEAMS[1]);
  const [isBlacktopMode, setIsBlacktopMode] = useState(false);
  const [isPlayoffGame, setIsPlayoffGame] = useState(false);
  const [gameLockedPlayerId, setGameLockedPlayerId] = useState<string | undefined>(undefined);
  
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

  // Season Mode State (Persisted)
  const [seasonState, setSeasonState] = useState<SeasonState>(() => loadState('hoops_season_state', { userTeamId: TEAMS[0].id, wins: {}, losses: {}, gamesPlayed: 0 }));

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
  const [isCareerGame, setIsCareerGame] = useState(false);
  const [isCollegeGame, setIsCollegeGame] = useState(false);
  const [isWagerGame, setIsWagerGame] = useState(false);
  const [wagerAmount, setWagerAmount] = useState(0);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => localStorage.setItem('hoops_coins', JSON.stringify(globalCoins)), [globalCoins]);
  useEffect(() => localStorage.setItem('hoops_inventory', JSON.stringify(globalInventory)), [globalInventory]);
  useEffect(() => localStorage.setItem('hoops_custom_jersey', JSON.stringify(customJerseyColors)), [customJerseyColors]);
  useEffect(() => localStorage.setItem('hoops_playoff_matches', JSON.stringify(playoffMatches)), [playoffMatches]);
  useEffect(() => localStorage.setItem('hoops_playoff_user_team', JSON.stringify(playoffUserTeam)), [playoffUserTeam]);
  useEffect(() => localStorage.setItem('hoops_season_state', JSON.stringify(seasonState)), [seasonState]);
  useEffect(() => localStorage.setItem('hoops_career_saves', JSON.stringify(careerSaves)), [careerSaves]);

  // --- HANDLERS ---

  const handleModeSelect = (mode: GameMode) => {
    if (mode === GameMode.PLAYOFFS) {
        if (playoffMatches.length > 0 && playoffUserTeam) {
            // Resume
            setCurrentMode(GameMode.PLAYOFFS);
        } else {
            // New Playoffs -> Select Team first
            setNextMode(GameMode.PLAYOFFS);
            setCurrentMode(GameMode.TEAM_SELECT);
        }
    } else if (mode === GameMode.SEASON_HUB) {
        // Season Mode -> Select Team first to start season
        if (seasonState.gamesPlayed > 0) {
             setCurrentMode(GameMode.SEASON_HUB);
        } else {
             setNextMode(GameMode.SEASON_HUB);
             setCurrentMode(GameMode.TEAM_SELECT);
        }
    } else if (mode === GameMode.PRACTICE_SELECT) {
        setNextMode(GameMode.PRACTICE_SELECT);
        setCurrentMode(GameMode.TEAM_SELECT);
    } else if (mode === GameMode.TEAM_SELECT) {
        setNextMode(GameMode.GAME);
        setCurrentMode(GameMode.TEAM_SELECT);
    } else {
        setCurrentMode(mode);
    }
    
    // Reset transient flags
    setIsBlacktopMode(false);
    setIsPlayoffGame(false);
    setIsCareerGame(false);
    setIsCollegeGame(false);
    setIsWagerGame(false);
    setPracticePlayer(undefined);
    setGameLockedPlayerId(undefined);
  };

  const handleTeamSelected = (pTeam: Team, cTeam: Team) => {
    setSelectedTeam(pTeam);
    setOpponentTeam(cTeam);

    if (nextMode === GameMode.PLAYOFFS) {
        initPlayoffs(pTeam);
    } else if (nextMode === GameMode.SEASON_HUB) {
        // Initialize Season if new
        if (seasonState.gamesPlayed === 0) {
            setSeasonState({
                userTeamId: pTeam.id,
                wins: {},
                losses: {},
                gamesPlayed: 0
            });
        }
        setCurrentMode(GameMode.SEASON_HUB);
    } else {
        setCurrentMode(GameMode.GAME);
    }
  };

  const handlePracticePlayerSelected = (player: Player) => {
      // Find the team this player belongs to for context (jersey colors)
      const team = TEAMS.find(t => t.id === player.teamId) || TEAMS[0];
      setSelectedTeam(team); 
      setOpponentTeam(team); // Irrelevant in practice
      setPracticePlayer(player);
      setCurrentMode(GameMode.GAME);
  };

  const initPlayoffs = (userTeam: Team) => {
      setPlayoffUserTeam(userTeam);
      
      const otherTeams = TEAMS.filter(t => t.id !== userTeam.id).sort(() => 0.5 - Math.random());
      const bracket: Matchup[] = [
          { id: 'semi1', round: 1, t1: userTeam, t2: otherTeams[0], winner: null, score: '' },
          { id: 'semi2', round: 1, t1: otherTeams[1], t2: otherTeams[2], winner: null, score: '' },
          { id: 'final', round: 2, t1: null, t2: null, winner: null, score: '' }
      ];
      
      setPlayoffMatches(bracket);
      setCurrentMode(GameMode.PLAYOFFS);
  };

  const handlePlayoffGameStart = (matchId: string, t1: Team, t2: Team) => {
      setSelectedTeam(t1);
      setOpponentTeam(t2);
      setCurrentMatchId(matchId);
      setIsPlayoffGame(true);
      setCurrentMode(GameMode.GAME);
  };

  const updateBracket = (matches: Matchup[], matchId: string, winner: Team, score: string): Matchup[] => {
      const newMatches = matches.map(m => m.id === matchId ? { ...m, winner, score } : m);
      
      // Propagate to Finals
      const semi1 = newMatches.find(m => m.id === 'semi1');
      const semi2 = newMatches.find(m => m.id === 'semi2');
      const final = newMatches.find(m => m.id === 'final');

      if (final) {
          if (matchId === 'semi1') final.t1 = winner;
          if (matchId === 'semi2') final.t2 = winner;
      }
      return newMatches;
  };

  const handlePlayoffSim = (matchId: string) => {
      const match = playoffMatches.find(m => m.id === matchId);
      if (!match || !match.t1 || !match.t2) return;
      
      // Simple 50/50 sim logic
      const winner = Math.random() > 0.5 ? match.t1 : match.t2;
      const score = `${80 + Math.floor(Math.random()*30)}-${80 + Math.floor(Math.random()*30)}`;
      
      const updatedMatches = updateBracket(playoffMatches, matchId, winner, score);
      setPlayoffMatches(updatedMatches);
  };

  const handleStartCareerGame = (save: CareerSave, isCollege: boolean = false, isWager: boolean = false, wagerAmt: number = 0) => {
      setActiveCareerSave(save);
      setIsCareerGame(true);
      setIsCollegeGame(isCollege);
      setIsWagerGame(isWager);
      setWagerAmount(wagerAmt);
      
      // Explicitly set the locked player ID from the save object to ensure sync
      if (!isCollege) {
          setGameLockedPlayerId(save.playerData.id);
      } else {
          setGameLockedPlayerId(undefined);
      }
      
      // Determine Teams
      if (isCollege) {
          // Fake college teams
          setSelectedTeam({ ...TEAMS[0], name: 'Tigers', primaryColor: '#f97316', secondaryColor: '#000' });
          setOpponentTeam({ ...TEAMS[1], name: 'Crimson', primaryColor: '#dc2626', secondaryColor: '#fff' });
      } else {
          // NBA or Wager Game
          const originalTeam = TEAMS.find(t => t.id === save.teamId) || TEAMS[0];
          
          // IMPORTANT: Inject MyPlayer into the roster so GameEngine can find the lockedPlayerId
          // We create a copy of the roster and replace the player at the same position
          let myTeamRoster = [...originalTeam.roster];
          const myPlayer = { ...save.playerData, teamId: originalTeam.id, isUser: true };
          
          // Find index of player with same position to replace
          const posIndex = myTeamRoster.findIndex(p => p.position === myPlayer.position);
          if (posIndex >= 0) {
              myTeamRoster[posIndex] = myPlayer;
          } else {
              // Fallback: replace first player if position not found
              myTeamRoster[0] = myPlayer;
          }

          const myTeamWithPlayer = { ...originalTeam, roster: myTeamRoster };

          let oppTeam: Team;
          if (isWager) {
              // Generic Opponent for Wager
               oppTeam = { 
                   ...TEAMS[1], 
                   name: 'Street Ballers', 
                   roster: TEAMS[1].roster.map(p => ({...p, name: 'Local Hooper', rating: 70}))
               };
          } else {
               // Random NBA Opponent
               oppTeam = TEAMS.filter(t => t.id !== save.teamId && t.id !== 'college').sort(() => 0.5 - Math.random())[0];
          }

          setSelectedTeam(myTeamWithPlayer);
          setOpponentTeam(oppTeam);
      }
      
      setCurrentMode(GameMode.GAME);
  };

  const handleBlacktopStart = (uTeam: Team, cTeam: Team) => {
      setSelectedTeam(uTeam);
      setOpponentTeam(cTeam);
      setIsBlacktopMode(true);
      setCurrentMode(GameMode.GAME);
  };

  const handleSeasonGameStart = (t1: Team, t2: Team) => {
      setSelectedTeam(t1);
      setOpponentTeam(t2);
      setCurrentMode(GameMode.GAME);
  };

  // --- GAME OVER LOGIC ---
  const handleGameOver = (winner: 'player' | 'cpu', pScore: number, cScore: number, playerStats: any[]) => {
      const isPractice = currentMode === GameMode.GAME && !isPlayoffGame && !isBlacktopMode && !isCareerGame && practicePlayer !== undefined;

      // 1. Coins Reward
      let coinsEarned = 0;
      if (winner === 'player') coinsEarned += 30; // Win bonus
      
      if (!isWagerGame && !isPractice && !isCollegeGame) {
          setGlobalCoins(prev => prev + coinsEarned);
      }

      // 2. Playoff Progression
      if (isPlayoffGame && currentMatchId && playoffUserTeam) {
          const match = playoffMatches.find(m => m.id === currentMatchId);
          if (match) {
              const winningTeam = winner === 'player' ? selectedTeam : opponentTeam;
              let updatedMatches = updateBracket(playoffMatches, currentMatchId, winningTeam, `${pScore}-${cScore}`);
              
              // Auto-Sim other matches in round if user just finished
              if (match.round === 1) {
                  const otherSemiId = currentMatchId === 'semi1' ? 'semi2' : 'semi1';
                  const otherSemi = updatedMatches.find(m => m.id === otherSemiId);
                  if (otherSemi && !otherSemi.winner && otherSemi.t1 && otherSemi.t2) {
                       const simWinner = Math.random() > 0.5 ? otherSemi.t1 : otherSemi.t2;
                       updatedMatches = updateBracket(updatedMatches, otherSemiId, simWinner, "Simulated");
                  }
              }

              setPlayoffMatches(updatedMatches);
              setCurrentMode(GameMode.PLAYOFFS);
              setCurrentMatchId(null);
          }
      } 
      // 3. MyCareer Progression
      else if (isCareerGame && activeCareerSave) {
           let updatedSave = { ...activeCareerSave };
           
           // Stats & Salary
           if (!isCollegeGame && !isWagerGame && activeCareerSave.phase === CareerPhase.NBA_SEASON) {
               updatedSave.stats.gamesPlayed++;
               updatedSave.stats.ppg = ((updatedSave.stats.ppg * (updatedSave.stats.gamesPlayed - 1)) + (playerStats[0]?.pts || 0)) / updatedSave.stats.gamesPlayed;
               updatedSave.coins += 50 + (winner === 'player' ? 20 : 0); // Salary
           }

           // Wager Logic
           if (isWagerGame) {
               if (winner === 'player') {
                   updatedSave.coins += (wagerAmount * 2); // Get wager back + profit
                   alert(`You won the wager! +${wagerAmount} coins.`);
               } else {
                   alert("You lost the wager.");
               }
           }

           // Phase Progression
           if (activeCareerSave.phase === CareerPhase.COLLEGE_GAME) {
               updatedSave.phase = CareerPhase.COACH_TALK;
           } else if (activeCareerSave.phase === CareerPhase.SKILLS_CHALLENGE) {
               // Reward based on performance
               const myPoints = playerStats[0]?.pts || 0;
               let grade = 'C';
               if (myPoints > 15) grade = 'A+';
               else if (myPoints > 10) grade = 'B';
               
               if (grade === 'A+') { updatedSave.coins += 200; updatedSave.playerData.rating += 2; }
               if (grade === 'B') { updatedSave.coins += 100; updatedSave.playerData.rating += 1; }
               
               updatedSave.phase = CareerPhase.NBA_SEASON;
               alert(`Skills Challenge Complete! Grade: ${grade}. Welcome to the NBA.`);
           }

           setCareerSaves(prev => prev.map(s => s.id === updatedSave.id ? updatedSave : s));
           setActiveCareerSave(updatedSave);
           setCurrentMode(GameMode.MY_CAREER_HUB);
      }
      // 4. Season Mode Update
      else if (seasonState.gamesPlayed > 0 && (selectedTeam.id === seasonState.userTeamId || opponentTeam.id === seasonState.userTeamId)) {
            const newState = { ...seasonState, gamesPlayed: seasonState.gamesPlayed + 1 };
            if (winner === 'player') newState.wins[selectedTeam.id] = (newState.wins[selectedTeam.id] || 0) + 1;
            else newState.losses[selectedTeam.id] = (newState.losses[selectedTeam.id] || 0) + 1;
            
            setSeasonState(newState);
            setCurrentMode(GameMode.SEASON_HUB);
      }
      // 5. Standard Play Now / Blacktop
      else {
          setCurrentMode(GameMode.MENU);
      }
  };

  const handleBuyItem = (item: string, cost: number): boolean => {
      if (globalCoins >= cost) {
          setGlobalCoins(prev => prev - cost);
          setGlobalInventory(prev => [...prev, item]);
          return true;
      }
      return false;
  };

  // --- RENDER ---
  const isPractice = currentMode === GameMode.GAME && !isPlayoffGame && !isBlacktopMode && !isCareerGame && practicePlayer !== undefined;

  return (
    <>
      {currentMode === GameMode.MENU && (
        <MainMenu 
           onSelectMode={handleModeSelect} 
           hasActivePlayoff={playoffMatches.length > 0 && !!playoffMatches.find(m=>m.round===2)?.t1} 
           globalCoins={globalCoins}
           inventory={globalInventory}
           onBuyItem={handleBuyItem}
           onSetJerseyColors={setCustomJerseyColors}
           customJerseyColors={customJerseyColors}
        />
      )}

      {currentMode === GameMode.TEAM_SELECT && (
        <TeamSelect 
            onTeamSelected={handleTeamSelected} 
            onPlayerSelected={handlePracticePlayerSelected}
            onBack={() => setCurrentMode(GameMode.MENU)} 
            isPractice={nextMode === GameMode.PRACTICE_SELECT}
        />
      )}

      {currentMode === GameMode.GAME && (
        <GameEngine 
          playerTeam={selectedTeam} 
          cpuTeam={opponentTeam} 
          onGameOver={handleGameOver} 
          onExit={() => {
              if (isCareerGame) setCurrentMode(GameMode.MY_CAREER_HUB);
              else if (isPlayoffGame) setCurrentMode(GameMode.PLAYOFFS);
              else if (seasonState.gamesPlayed > 0 && selectedTeam.id === seasonState.userTeamId) setCurrentMode(GameMode.SEASON_HUB);
              else setCurrentMode(GameMode.MENU);
          }}
          isBlacktop={isBlacktopMode}
          isPlayoff={isPlayoffGame}
          isPractice={isPractice}
          isCollege={isCollegeGame}
          practicePlayer={practicePlayer}
          lockedPlayerId={gameLockedPlayerId}
          activeBoosts={globalInventory}
        />
      )}

      {currentMode === GameMode.PLAYOFFS && (
          <PlayoffBracket 
             matches={playoffMatches} 
             onBack={() => setCurrentMode(GameMode.MENU)}
             onPlayGame={handlePlayoffGameStart}
             onSimGame={handlePlayoffSim}
             userTeamId={playoffUserTeam?.id || ''}
          />
      )}

      {currentMode === GameMode.MY_CAREER_HUB && (
          <MyCareer 
             saves={careerSaves} 
             onUpdateSave={(s) => {
                 setCareerSaves(prev => prev.map(save => save.id === s.id ? s : save));
                 if(activeCareerSave?.id === s.id) setActiveCareerSave(s);
             }}
             onDeleteSave={(id) => setCareerSaves(prev => prev.filter(s => s.id !== id))}
             onPlayGame={handleStartCareerGame}
             onBack={() => setCurrentMode(GameMode.MENU)}
          />
      )}

      {currentMode === GameMode.BLACKTOP_SELECT && (
          <BlacktopSetup 
             onGameStart={handleBlacktopStart}
             onBack={() => setCurrentMode(GameMode.MENU)}
          />
      )}

      {currentMode === GameMode.SEASON_HUB && (
          <SeasonMode 
             seasonState={seasonState}
             onUpdateSeason={setSeasonState}
             onPlayGame={handleSeasonGameStart}
             onBack={() => setCurrentMode(GameMode.MENU)}
          />
      )}
    </>
  );
};

export default App;
