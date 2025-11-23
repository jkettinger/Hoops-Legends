
import React, { useRef, useEffect, useState } from 'react';
import { Team, Player } from '../types';
import { Trophy, List, LogOut, Play, FastForward, RefreshCw } from 'lucide-react';

interface GameEngineProps {
  playerTeam: Team;
  cpuTeam: Team;
  onGameOver: (winner: 'player' | 'cpu', scorePlayer: number, scoreCpu: number, playerStats?: any) => void;
  onExit: () => void;
  isBlacktop: boolean;
  isPlayoff?: boolean;
  isPractice?: boolean;
  isCollege?: boolean; 
  practicePlayer?: Player;
  lockedPlayerId?: string; // For MyCareer: Force control of this player ID only
  activeBoosts?: string[]; // Inventory list to apply boosts
}

// Physics Constants
const COURT_WIDTH = 1400; 
const COURT_HEIGHT = 840;
const PLAYER_RADIUS = 16;
const BALL_RADIUS = 9;
const HOOP_RADIUS = 18;
const HOOP_X_LEFT = 60;
const HOOP_X_RIGHT = 1340;
const HOOP_Y = COURT_HEIGHT / 2;
const MOVE_SPEED_BASE = 3.5;
const RIM_HEIGHT = 38; 

export const GameEngine: React.FC<GameEngineProps> = ({ 
    playerTeam, cpuTeam, onGameOver, onExit, isBlacktop, isPlayoff, isPractice, isCollege, practicePlayer, lockedPlayerId, activeBoosts = [] 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [gameTime, setGameTime] = useState(isPlayoff ? 240 : (isCollege ? 120 : 180)); 
  const [commentary, setCommentary] = useState("Game Start!");
  const [gameState, setGameState] = useState<'playing' | 'menu' | 'boxscore'>('playing');
  
  // Controls State
  const [joystickVec, setJoystickVec] = useState({ x: 0, y: 0 });
  const [isShootingBtn, setIsShootingBtn] = useState(false);

  // Audio / Announcer State
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const announce = (text: string, priority: 'high' | 'low' = 'low') => {
      setCommentary(text);
      if (!('speechSynthesis' in window)) return;
      if (window.speechSynthesis.speaking && priority === 'low') return;
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.25; 
      utterance.pitch = 1.05;
      utterance.volume = 0.9;
      const preferredVoice = voicesRef.current.find(v => v.name.includes('Google US English')) 
                          || voicesRef.current.find(v => v.name.includes('David')) 
                          || voicesRef.current.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
  };

  // Game State Refs (Mutable for Loop)
  const keys = useRef<{ [key: string]: boolean }>({});
  const touchState = useRef({
    joystickOrigin: null as {x: number, y: number} | null,
    joystickCurrent: null as {x: number, y: number} | null,
    isShooting: false,
    tapBlock: false
  });
  
  const lastSwitchTime = useRef(0);
  const lastPassTime = useRef(0);

  // Entities
  const playersRef = useRef<any[]>([]);
  const ballRef = useRef<any>({
    x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2, z: 200, 
    vx: 0, vy: 0, vz: 0, prevZ: 200,
    holder: null, state: 'loose', lastShooter: null, wasShot: false
  });
  const cameraRef = useRef({ x: 0, y: 0 });

  // Initialize Entities
  useEffect(() => {
    const createEntity = (p: Player, teamId: string, isUser: boolean, startX: number, startY: number) => {
      // Apply Boosts
      let speed = p.speed;
      let shooting = p.shooting;
      let defense = p.defense;
      
      // Team-wide boosts for User Team only
      if (teamId === 'player' && activeBoosts) {
          if (activeBoosts.includes('power_aid')) speed += 5;
          if (activeBoosts.includes('ankle_breaker')) shooting += 5;
          if (activeBoosts.includes('6th_man')) { speed += 2; defense += 2; shooting += 2; } // Small all-around boost
      }

      return {
        ...p,
        speed, shooting, defense, // Boosted stats
        x: startX,
        y: startY,
        teamId,
        isUser,
        vx: 0,
        vy: 0,
        state: 'idle',
        shotCharge: 0,
        cooldown: 0,
        stats: { pts: 0, reb: 0, stl: 0 }
      };
    };

    const pYBase = COURT_HEIGHT / 2;
    
    if (isPractice && practicePlayer) {
        // PRACTICE MODE
        const p1 = createEntity(practicePlayer, 'player', true, COURT_WIDTH/2, pYBase + 100);
        playersRef.current = [p1];
        ballRef.current.holder = p1;
        ballRef.current.x = p1.x; ballRef.current.y = p1.y; ballRef.current.z = 30; ballRef.current.state = 'held';
        announce(`Practice Mode. You are controlling ${practicePlayer.name}.`);
    } else {
        // DYNAMIC ROSTER MODE (1v1 to 5v5)
        const initialPlayers: any[] = [];
        
        const setupTeam = (team: Team, teamId: string, baseX: number, direction: number) => {
            const count = team.roster.length;
            team.roster.forEach((p, i) => {
                let y = pYBase;
                let x = baseX;
                
                // Dynamic Positioning based on roster size
                if (count === 1) {
                    y = pYBase;
                } else if (count === 2) {
                    y = pYBase + (i === 0 ? -100 : 100);
                    x = baseX + (i === 0 ? 0 : -50 * direction);
                } else if (count === 3) {
                    if (i === 0) y = pYBase;
                    else if (i === 1) { y = pYBase - 150; x = baseX - 50 * direction; }
                    else { y = pYBase + 150; x = baseX - 50 * direction; }
                } else {
                    // 4 or 5 players - standard formation
                     if (i === 0) y = pYBase;
                     else if (i === 1) { y = pYBase - 200; x = baseX - 50 * direction; }
                     else if (i === 2) { y = pYBase + 200; x = baseX - 50 * direction; }
                     else if (i === 3) { y = pYBase - 100; x = baseX - 150 * direction; }
                     else if (i === 4) { y = pYBase + 100; x = baseX - 150 * direction; }
                }
                
                // User check
                let isUser = false;
                if (teamId === 'player') {
                    if (lockedPlayerId) isUser = p.id === lockedPlayerId;
                    else if (i === 0) isUser = true; // Default to first player (Captain)
                }

                initialPlayers.push(createEntity(p, teamId, isUser, x, y));
            });
        };

        setupTeam(playerTeam, 'player', 300, 1);
        setupTeam(cpuTeam, 'cpu', COURT_WIDTH - 300, -1);

        playersRef.current = initialPlayers;

        // Ball starts with User PG or first player
        const startingPlayer = initialPlayers.find(p => p.isUser) || initialPlayers[0];
        ballRef.current.holder = startingPlayer;
        ballRef.current.state = 'held';
        ballRef.current.x = startingPlayer.x; ballRef.current.y = startingPlayer.y; ballRef.current.z = 30;
        
        if (isCollege) {
           announce(`NCAA Championship! ${playerTeam.name} versus ${cpuTeam.name}.`);
        } else {
           announce(`Welcome to ${isBlacktop ? 'the Blacktop' : 'the Arena'}!`);
        }
    }
  }, [playerTeam, cpuTeam]); // Re-run if teams change size

  const switchSides = () => {
      if (lockedPlayerId) {
          announce("Cannot switch sides in Career Mode.");
          return;
      }
      const userIsCurrentlyPlayerTeam = playersRef.current.some(p => p.teamId === 'player' && p.isUser);
      playersRef.current.forEach(p => { p.isUser = false; p.state = 'idle'; p.vx = 0; p.vy = 0; });
      const newTeamId = userIsCurrentlyPlayerTeam ? 'cpu' : 'player';
      // Try to find a PG, or just the first player
      const newLeader = playersRef.current.find(p => p.teamId === newTeamId && p.position === 'PG') || playersRef.current.find(p => p.teamId === newTeamId);
      if (newLeader) {
          newLeader.isUser = true;
          announce(`Switched to ${newTeamId === 'player' ? playerTeam.name : cpuTeam.name}`);
      }
      setGameState('playing');
  };

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); 
    (Array.from(e.changedTouches) as React.Touch[]).forEach(touch => {
      const x = touch.clientX;
      const y = touch.clientY;
      const width = window.innerWidth;
      if (x < width / 2) {
        touchState.current.joystickOrigin = { x, y };
        touchState.current.joystickCurrent = { x, y };
      } else {
        touchState.current.tapBlock = true;
        setTimeout(() => touchState.current.tapBlock = false, 200);
      }
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    (Array.from(e.changedTouches) as React.Touch[]).forEach(touch => {
      if (touchState.current.joystickOrigin) {
        if (touch.clientX < window.innerWidth / 2) {
           touchState.current.joystickCurrent = { x: touch.clientX, y: touch.clientY };
           const dx = touch.clientX - touchState.current.joystickOrigin.x;
           const dy = touch.clientY - touchState.current.joystickOrigin.y;
           const dist = Math.hypot(dx, dy);
           const maxDist = 50;
           const clampedDist = Math.min(dist, maxDist);
           const angle = Math.atan2(dy, dx);
           setJoystickVec({
             x: (Math.cos(angle) * clampedDist) / maxDist,
             y: (Math.sin(angle) * clampedDist) / maxDist
           });
        }
      }
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    (Array.from(e.changedTouches) as React.Touch[]).forEach(touch => {
      if (touch.clientX < window.innerWidth / 2) {
        touchState.current.joystickOrigin = null;
        touchState.current.joystickCurrent = null;
        setJoystickVec({ x: 0, y: 0 });
      }
    });
  };

  // Timer Logic
  useEffect(() => {
    if (gameState !== 'playing' || isPractice) return; 
    const interval = setInterval(() => {
      setGameTime(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          announce("That's the buzzer! Game Over.", 'high');
          setGameState('menu');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, isPractice]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let animationFrameId: number;

    const update = () => {
      if (gameState !== 'playing') {
          draw(ctx, playersRef.current, ballRef.current);
          animationFrameId = requestAnimationFrame(update);
          return;
      }

      const ball = ballRef.current;
      const players = playersRef.current;
      const now = Date.now();

      // Find Active User Player
      let userPlayer = players.find(p => p.isUser);
      // Safety/Fallback
      if (!userPlayer) {
        if (lockedPlayerId) userPlayer = players.find(p => p.id === lockedPlayerId);
        else userPlayer = players.find(p => p.teamId === 'player');
        
        if (userPlayer) userPlayer.isUser = true;
      }
      
      if (!userPlayer) return; // Should not happen

      const userTeamId = userPlayer.teamId;
      if (userPlayer && userPlayer.cooldown > 0) userPlayer.cooldown--;

      // --- INPUT HANDLING: SWITCHING (H) ---
      // Disable manual switching if Player Lock is active OR if it's 1v1 (no teammates)
      const hasTeammates = players.filter(p => p.teamId === userTeamId).length > 1;
      
      if (!isPractice && !lockedPlayerId && hasTeammates && keys.current['h'] && now - lastSwitchTime.current > 300) {
        lastSwitchTime.current = now;
        const teamPlayers = players.filter(p => p.teamId === userTeamId);
        const currentIndex = teamPlayers.findIndex(p => p === userPlayer);
        const nextIndex = (currentIndex + 1) % teamPlayers.length;
        userPlayer.isUser = false;
        teamPlayers[nextIndex].isUser = true;
        userPlayer = teamPlayers[nextIndex]; 
        announce("Switching to " + userPlayer.name.split(' ').pop());
      }

      // --- INPUT HANDLING: PASSING (L or G) ---
      const isPassInput = (keys.current['l'] || keys.current['g']);
      if (!isPractice && isPassInput && now - lastPassTime.current > 250) {
        lastPassTime.current = now;
        
        // Scenario 1: User has ball -> Pass to teammate
        if (ball.holder === userPlayer && userPlayer.state !== 'dunking') {
           // Cannot pass if 1v1
           if (!hasTeammates) {
               // Maybe a self-alley oop or fake? Just ignore for now in 1v1
           } else {
               let idx = 0; let idy = 0;
               if (keys.current['w'] || keys.current['arrowup']) idy = -1;
               if (keys.current['s'] || keys.current['arrowdown']) idy = 1;
               if (keys.current['a'] || keys.current['arrowleft']) idx = -1;
               if (keys.current['d'] || keys.current['arrowright']) idx = 1;
               if (Math.abs(joystickVec.x) > 0.1 || Math.abs(joystickVec.y) > 0.1) {
                  idx = joystickVec.x; idy = joystickVec.y;
               }

               const teammates = players.filter(p => p.teamId === userTeamId && p !== userPlayer);
               let bestMate = null;
               let maxScore = -Infinity;
               const hasInput = idx !== 0 || idy !== 0;

               const iLen = Math.hypot(idx, idy);
               const nidx = iLen > 0 ? idx / iLen : 0;
               const nidy = iLen > 0 ? idy / iLen : 0;

               teammates.forEach(mate => {
                  const dx = mate.x - userPlayer.x;
                  const dy = mate.y - userPlayer.y;
                  const dist = Math.hypot(dx, dy);
                  let score = -dist; 
                  if (hasInput) {
                     const toMateX = dx / dist;
                     const toMateY = dy / dist;
                     const dot = toMateX * nidx + toMateY * nidy;
                     score += dot * 2000; 
                  }
                  if (score > maxScore) {
                     maxScore = score;
                     bestMate = mate;
                  }
               });

               if (bestMate) {
                  ball.holder = null;
                  ball.state = 'passed';
                  ball.z = 30; 
                  const speed = 22; 
                  const dx = bestMate.x - userPlayer.x;
                  const dy = bestMate.y - userPlayer.y;
                  const dist = Math.hypot(dx, dy);
                  ball.vx = (dx / dist) * speed;
                  ball.vy = (dy / dist) * speed;
                  ball.vz = 2; 
                  
                  // Only switch control if NOT locked
                  if (!lockedPlayerId) {
                      userPlayer.isUser = false;
                      bestMate.isUser = true;
                      userPlayer = bestMate;
                  } else {
                      announce("Pass away!", 'low');
                  }
               }
           }
        }
        // Scenario 2: Locked User does NOT have ball -> "Call for Ball"
        else if (lockedPlayerId && ball.holder && ball.holder.teamId === userTeamId && ball.holder !== userPlayer) {
            // Teammate has ball. Check if they can pass to us.
            const teammate = ball.holder;
            const dx = userPlayer.x - teammate.x;
            const dy = userPlayer.y - teammate.y;
            const dist = Math.hypot(dx, dy);
            
            // Simple probability check based on distance and chaos
            if (Math.random() > 0.1 && dist < 600) {
                 ball.holder = null;
                 ball.state = 'passed';
                 ball.z = 30;
                 const speed = 20;
                 ball.vx = (dx / dist) * speed;
                 ball.vy = (dy / dist) * speed;
                 ball.vz = 2;
                 announce("Passed to you!", 'low');
            }
        }
      }

      // --- USER MOVEMENT ---
      if (userPlayer.state !== 'dunking') {
        let dx = 0;
        let dy = 0;
        const spd = (userPlayer.speed / 100) * MOVE_SPEED_BASE + 2; 

        if (keys.current['w'] || keys.current['arrowup']) dy = -1;
        if (keys.current['s'] || keys.current['arrowdown']) dy = 1;
        if (keys.current['a'] || keys.current['arrowleft']) dx = -1;
        if (keys.current['d'] || keys.current['arrowright']) dx = 1;
        
        if (Math.abs(joystickVec.x) > 0.1 || Math.abs(joystickVec.y) > 0.1) {
          dx = joystickVec.x;
          dy = joystickVec.y;
        }

        if (dx !== 0 || dy !== 0) {
          const dist = Math.hypot(dx, dy);
          const norm = dist > 1 ? 1 : dist;
          const angle = Math.atan2(dy, dx);
          userPlayer.x += Math.cos(angle) * spd * norm;
          userPlayer.y += Math.sin(angle) * spd * norm;
        }
        
        userPlayer.x = Math.max(PLAYER_RADIUS, Math.min(COURT_WIDTH - PLAYER_RADIUS, userPlayer.x));
        userPlayer.y = Math.max(PLAYER_RADIUS, Math.min(COURT_HEIGHT - PLAYER_RADIUS, userPlayer.y));
      }

      // Actions
      const isShootingInput = keys.current['b'] || touchState.current.isShooting;
      const isDunkInput = keys.current['x'];
      const isBlockingInput = keys.current['y'] || touchState.current.tapBlock;

      if (ball.holder === userPlayer) {
        const targetHoopX = (userPlayer.teamId === 'player' || isPractice) ? HOOP_X_RIGHT : HOOP_X_LEFT;
        
        // DUNK
        if (userPlayer.state === 'dunking') {
             const dx = targetHoopX - userPlayer.x;
             const dy = HOOP_Y - userPlayer.y;
             const dist = Math.hypot(dx, dy);
             const speed = 15;
             userPlayer.x += (dx / dist) * speed;
             userPlayer.y += (dy / dist) * speed;
             
             if (dist < 20) {
                 ball.lastShooter = userPlayer; 
                 scorePoint(userPlayer.teamId);
                 userPlayer.state = 'idle';
                 userPlayer.cooldown = 120;
                 ball.holder = null;
                 ball.state = 'scored'; 
                 ball.x = targetHoopX; ball.y = HOOP_Y; ball.z = RIM_HEIGHT - 5;
                 ball.vx = (Math.random() - 0.5) * 5; ball.vy = (Math.random() - 0.5) * 5; ball.vz = -6; 
                 announce(["BOOM!", "SLAM DUNK!"][Math.floor(Math.random()*2)], 'high');
                 if (!isPractice) resetAfterScore(userPlayer.teamId);
             }
        } 
        else if (isDunkInput && Math.hypot(userPlayer.x - targetHoopX, userPlayer.y - HOOP_Y) < 260) {
            userPlayer.state = 'dunking';
            announce("Takes it to the rack!", 'high');
        }
        else if (isShootingInput) {
          userPlayer.shotCharge += 1.5; 
          userPlayer.state = 'shooting';
        } else if (userPlayer.shotCharge > 0) {
          shootBall(userPlayer);
          userPlayer.shotCharge = 0;
          userPlayer.state = 'idle';
        }
      }

      if (isBlockingInput && ball.holder !== userPlayer) {
        userPlayer.state = 'blocking';
      } else if (!isShootingInput && userPlayer.state !== 'stunned' && userPlayer.state !== 'dunking') {
        userPlayer.state = 'idle';
      }

      // --- AI LOGIC (Skip in Practice) ---
      if (!isPractice) {
          players.forEach(p => {
            // SKIP AI logic for the CURRENT user player
            if (p === userPlayer) return; 
            
            // NOTE: If lockedPlayerId is active, teammates ARE NOT the userPlayer, so they WILL run this AI logic.
            // This enables teammates to play autonomously.
            
            if (p.cooldown > 0) p.cooldown--;
            
            const targetHoopX = p.teamId === 'player' ? HOOP_X_RIGHT : HOOP_X_LEFT;
            const defendHoopX = p.teamId === 'player' ? HOOP_X_LEFT : HOOP_X_RIGHT;

            if (ball.state === 'loose' || ball.state === 'passed') {
               moveTowards(p, ball.x, ball.y);
            } else if (ball.holder === p) {
               const distToHoop = Math.hypot(p.x - targetHoopX, p.y - HOOP_Y);
               if (distToHoop > 200) {
                 moveTowards(p, targetHoopX, HOOP_Y);
               } else {
                 // Shoot logic
                 if (Math.random() < 0.015 && p.cooldown === 0) {
                    const variance = (Math.random() * 20) - 10; 
                    p.shotCharge = 50 + variance; 
                    shootBall(p);
                    p.cooldown = 120;
                 }
               }
            } else if (ball.holder && ball.holder.teamId !== p.teamId) {
               // Defense
               const targetX = (ball.holder.x + defendHoopX) / 2;
               const targetY = (ball.holder.y + HOOP_Y) / 2;
               moveTowards(p, targetX + (Math.random()*60-30), targetY + (Math.random()*60-30));
               
               const distToBall = Math.hypot(p.x - ball.holder.x, p.y - ball.holder.y);
               if (distToBall < 50 && Math.random() < 0.02) {
                  p.state = 'blocking';
                  if (Math.random() < (p.defense / 900) && ball.holder.state !== 'dunking') {
                     // STEAL
                     ball.holder.state = 'stunned';
                     ball.holder.cooldown = 60;
                     ball.holder = null;
                     ball.state = 'loose';
                     ball.vx = (p.x - ball.x) * 0.3;
                     ball.vy = (p.y - ball.y) * 0.3;
                     p.stats.stl++;
                     announce("Stolen by " + p.name.split(' ').pop() + "!", 'high');
                  }
               } else {
                 p.state = 'idle';
               }
            } else {
               // Off Ball Movement
               const sideX = p.teamId === 'player' ? HOOP_X_RIGHT - 200 : HOOP_X_LEFT + 200;
               // If ball holder is user, space out
               if (ball.holder === userPlayer && p.teamId === userTeamId) {
                  if (Math.hypot(p.x - userPlayer.x, p.y - userPlayer.y) < 150) {
                     moveTowards(p, p.x + (p.x - userPlayer.x), p.y + (p.y - userPlayer.y)); 
                  }
               }
               moveTowards(p, sideX + (Math.random()*400-200), HOOP_Y + (Math.random()*600-300));
            }
          });
      }

      // --- BALL PHYSICS ---
      if (ball.state === 'loose' || ball.state === 'shot' || ball.state === 'passed' || ball.state === 'scored') {
        ball.prevZ = ball.z; ball.x += ball.vx; ball.y += ball.vy; ball.vx *= 0.98; ball.vy *= 0.98;

        if (ball.state === 'shot') {
           const gravity = 0.7; ball.z += ball.vz; ball.vz -= gravity;
           const targetHoopX = ball.vx > 0 ? HOOP_X_RIGHT : HOOP_X_LEFT;
           const isPassingRimLevel = ball.prevZ >= RIM_HEIGHT && ball.z <= RIM_HEIGHT;
           
           if (isPassingRimLevel && ball.vz < 0) {
              const distToHoop = Math.hypot(ball.x - targetHoopX, ball.y - HOOP_Y);
              if (distToHoop < 11) {
                  scorePoint(ball.vx > 0 ? 'player' : 'cpu');
                  ball.state = 'scored'; ball.wasShot = false; ball.z = 0; ball.vx = 0; ball.vy = 0;
                  if (!isPractice) resetAfterScore(ball.vx > 0 ? 'player' : 'cpu'); 
                  announce( ["Splaaaash!", "Nothing but net!"][Math.floor(Math.random()*2)], 'high' );
              } else if (distToHoop < 28) {
                  const angle = Math.atan2(ball.y - HOOP_Y, ball.x - targetHoopX);
                  ball.vx = Math.cos(angle) * 5; ball.vy = Math.sin(angle) * 5; ball.vz = Math.abs(ball.vz) * 0.5 + 2; 
                  ball.state = 'loose'; ball.wasShot = true; 
                  announce("Clank!", 'high');
              }
           } else if (ball.z < 0) {
             ball.z = 0; ball.vz = -ball.vz * 0.6; ball.state = 'loose'; ball.wasShot = true;
           }
        } else if (ball.state === 'passed') {
           ball.z = 30;
        } else if (ball.state === 'scored') {
             if (ball.z > 0) { ball.z += ball.vz; ball.vz -= 0.7; }
             if (ball.z <= 0) { ball.z = 0; ball.vx = 0; ball.vy = 0; }
        }

        if (ball.x < 0 || ball.x > COURT_WIDTH) ball.vx *= -1;
        if (ball.y < 0 || ball.y > COURT_HEIGHT) ball.vy *= -1;
      } else if (ball.holder) {
        ball.x = ball.holder.x + 12; ball.y = ball.holder.y;
        ball.z = ball.holder.state === 'dunking' ? 45 + (Math.sin(Date.now() / 50) * 5) : 30 + Math.abs(Math.sin(Date.now() / 100) * 15);
      }

      // --- COLLISIONS (Pickup) ---
      if ((ball.state === 'loose' || ball.state === 'passed') && ball.z < 60) {
        players.forEach(p => {
          if (p.cooldown > 0) return;
          const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (dist < PLAYER_RADIUS + BALL_RADIUS + 10) {
            if (ball.wasShot && ball.state === 'loose') {
                p.stats.reb++;
                announce("Rebound " + p.name.split(' ').pop(), 'low');
            }
            ball.holder = p;
            ball.state = 'held';
            ball.wasShot = false;
            ball.vx = 0; ball.vy = 0;
            
            // Pickup Switch Logic - Disabled if Locked
            if (p.teamId === userTeamId && !p.isUser && !lockedPlayerId) {
               players.forEach(pl => pl.isUser = false);
               p.isUser = true;
            }
          }
        });
      }

      // Update Camera
      const targetCamX = userPlayer.x - canvas.width / 2;
      const targetCamY = userPlayer.y - canvas.height / 2;
      cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

      draw(ctx, players, ball);
      animationFrameId = requestAnimationFrame(update);
    };

    const moveTowards = (p: any, tx: number, ty: number) => {
      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.hypot(dx, dy);
      const spd = (p.speed / 100) * MOVE_SPEED_BASE;
      if (dist > 5) {
        p.x += (dx / dist) * spd;
        p.y += (dy / dist) * spd;
      }
    };

    const shootBall = (p: any) => {
      if (ballRef.current.holder !== p) return;
      ballRef.current.holder = null;
      ballRef.current.state = 'shot';
      ballRef.current.lastShooter = p; 
      ballRef.current.wasShot = false;

      const targetX = (p.teamId === 'player' || isPractice) ? HOOP_X_RIGHT : HOOP_X_LEFT;
      const dx = targetX - p.x;
      const dy = HOOP_Y - p.y;
      const dist = Math.hypot(dx, dy);

      const gravity = 0.7;
      const flightTime = 38 + (dist / 16); 
      const requiredVz = (0.5 * gravity * flightTime); 
      
      const chargeBonus = 100 - (Math.abs(p.shotCharge - 50) * 2); 
      const rangePenalty = dist > 650 ? 0.35 : 1.0; 
      const accuracyFactor = ((p.shooting + chargeBonus) / 200) * rangePenalty; 
      
      const scatter = (1 - accuracyFactor) * 80; 
      const errorX = (Math.random() * scatter) - (scatter / 2);
      const errorY = (Math.random() * scatter) - (scatter / 2);
      
      const realDx = dx + errorX;
      const realDy = dy + errorY;
      const realDist = Math.hypot(realDx, realDy);
      const horizontalSpeed = realDist / flightTime;

      ballRef.current.vx = (realDx / realDist) * horizontalSpeed;
      ballRef.current.vy = (realDy / realDist) * horizontalSpeed;
      ballRef.current.vz = requiredVz;
      
      if (rangePenalty < 0.5) announce("FROM DEEP!", 'high');
      else announce("Puts it up!", 'low');
    };

    const scorePoint = (team: 'player' | 'cpu') => {
      let points = 2;
      const shooter = ballRef.current.lastShooter;
      if (shooter) {
          const targetX = team === 'player' ? HOOP_X_RIGHT : HOOP_X_LEFT;
          const dist = Math.hypot(shooter.x - targetX, shooter.y - HOOP_Y);
          if (dist > 400) points = 3;
          shooter.stats.pts += points;
      }

      if (team === 'player') setPlayerScore(s => s + points);
      else setCpuScore(s => s + points);
    };

    const resetAfterScore = (scoringTeam: 'player' | 'cpu') => {
       if (isPractice) return; 
       const possessionTeamId = scoringTeam === 'player' ? 'cpu' : 'player';
       setTimeout(() => {
         const pg = playersRef.current.find(p => p.teamId === possessionTeamId && p.position === 'PG') || playersRef.current.find(p => p.teamId === possessionTeamId);
         
         if (pg) {
            const baseX = possessionTeamId === 'player' ? 200 : COURT_WIDTH - 200;
            pg.x = baseX;
            pg.y = COURT_HEIGHT / 2;
            ballRef.current.holder = pg;
            ballRef.current.state = 'held';
            ballRef.current.x = pg.x; ballRef.current.y = pg.y; ballRef.current.vx = 0; ballRef.current.vy = 0; ballRef.current.z = 30; ballRef.current.lastShooter = null; ballRef.current.wasShot = false;

            // Only switch user if NOT locked
            if (!lockedPlayerId) {
                const userOnPossessionTeam = playersRef.current.some(p => p.teamId === possessionTeamId && p.isUser);
                if (userOnPossessionTeam) {
                     playersRef.current.forEach(p => p.isUser = false);
                     pg.isUser = true;
                }
            } else {
                const lockedP = playersRef.current.find(p => p.id === lockedPlayerId);
                if (lockedP && lockedP.teamId === possessionTeamId && lockedP !== pg) {
                     lockedP.x = baseX + 50;
                     lockedP.y = COURT_HEIGHT / 2 + 100;
                }
            }
            announce("Ready to inbound.", 'low');
         }
       }, 2000);
    };

    const draw = (ctx: CanvasRenderingContext2D, players: any[], ball: any) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Background
      if (isBlacktop) {
        ctx.fillStyle = '#222'; ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
        ctx.globalAlpha = 0.05; ctx.fillStyle = '#fff';
        for(let i=0; i<100; i++) ctx.fillRect(Math.random() * COURT_WIDTH, Math.random() * COURT_HEIGHT, 4, 4);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = isCollege ? '#D6C4A0' : (isPractice ? '#e6d5b8' : '#D2B48C'); 
        ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
        if (isCollege) {
            ctx.save(); ctx.translate(COURT_WIDTH/2, COURT_HEIGHT/2); ctx.fillStyle = playerTeam.primaryColor; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0,0, 100, 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
      }

      // Lines
      ctx.strokeStyle = isBlacktop ? '#ccc' : 'white'; ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
      ctx.beginPath(); ctx.arc(COURT_WIDTH/2, COURT_HEIGHT/2, 80, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(COURT_WIDTH/2, 0); ctx.lineTo(COURT_WIDTH/2, COURT_HEIGHT); ctx.stroke();
      ctx.strokeRect(0, HOOP_Y - 100, 250, 200);
      ctx.strokeRect(COURT_WIDTH - 250, HOOP_Y - 100, 250, 200);
      
      // Hoops
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.strokeStyle = 'orange'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(HOOP_X_LEFT, HOOP_Y, HOOP_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(HOOP_X_RIGHT, HOOP_Y, HOOP_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      // Shadows
      players.forEach(p => { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 15, 12, 6, 0, 0, Math.PI*2); ctx.fill(); });
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + BALL_RADIUS + 4, Math.max(4, BALL_RADIUS - ball.z/15), Math.max(2, (BALL_RADIUS - ball.z/15)/2), 0, 0, Math.PI*2); ctx.fill();

      // Players
      players.forEach(p => {
        const team = p.teamId === 'player' ? playerTeam : cpuTeam;
        const hasDrip = p.accessories?.includes('drip_outfit');
        ctx.fillStyle = hasDrip ? '#FFD700' : (p.teamId === 'player' ? team.primaryColor : team.secondaryColor);
        
        if (p.isUser) { ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 3; } 
        else { ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; }

        ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Render Accessories
        if (p.accessories) {
            // Headband
            if (p.accessories.includes('headband')) {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                // Draw a rectangle strip across upper part of circle
                ctx.rect(p.x - 14, p.y - 10, 28, 5);
                ctx.fill();
            }
            // Sleeves (Small arcs on sides)
            if (p.accessories.includes('sleeves')) {
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, PLAYER_RADIUS + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'white'; ctx.font = 'bold 10px Roboto'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (hasDrip) ctx.fillStyle = 'black'; // Contrast for gold drip
        if (isCollege && p.teamId === 'player') ctx.fillText(p.number, p.x, p.y);
        else ctx.fillText(p.name.split(' ').pop().substring(0, 7), p.x, p.y);
        
        if (ball.holder === p) { ctx.fillStyle = 'orange'; ctx.beginPath(); ctx.arc(p.x, p.y - 25, 4, 0, Math.PI*2); ctx.fill(); }

        // Shot Meter
        if (p.shotCharge > 0) {
          ctx.fillStyle = 'gray'; ctx.fillRect(p.x - 20, p.y - 35, 40, 6);
          const diff = Math.abs(p.shotCharge - 50);
          ctx.fillStyle = diff < 5 ? '#00ff00' : (diff < 15 ? '#ffff00' : '#ff0000');
          ctx.fillRect(p.x - 20, p.y - 35, Math.min(40, (p.shotCharge / 100) * 40), 6);
          ctx.strokeStyle = 'black'; ctx.lineWidth = 1; ctx.strokeRect(p.x - 20, p.y - 35, 40, 6);
          ctx.strokeStyle = 'white'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 35); ctx.lineTo(p.x, p.y - 29); ctx.stroke();
        }
      });

      // Ball
      const ballYVisual = ball.y - ball.z;
      ctx.fillStyle = '#E56B1F'; ctx.beginPath(); ctx.arc(ball.x, ballYVisual, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ball.x, ballYVisual, BALL_RADIUS, 0, Math.PI * 2); ctx.stroke();

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [playerTeam, cpuTeam, isBlacktop, joystickVec, isPlayoff, gameState, isPractice, practicePlayer, isCollege, lockedPlayerId, activeBoosts]);

  const handleExitRequest = () => setGameState('menu');
  
  const isGameOver = gameTime <= 0 && !isPractice;
  const winner = playerScore > cpuScore ? 'player' : 'cpu';

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[600px] flex justify-between items-center px-6 py-2 bg-slate-900/90 border border-slate-600 rounded-full shadow-lg z-20 arcade-font">
         <div className="text-center w-20">
            {isPractice ? <span className="text-green-400 text-xl">PRACTICE</span> : <><h2 className="text-2xl text-blue-400">{playerTeam.abbreviation}</h2><span className="text-4xl font-bold text-white">{playerScore}</span></>}
         </div>
         <div className="text-center flex-1">
             <div className="text-3xl text-red-500 font-mono tracking-widest font-bold">{isPractice ? "∞:∞" : `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, '0')}`}</div>
             <div className="text-xs text-yellow-300 truncate px-2">{commentary}</div>
         </div>
         <div className="text-center w-20">
            {isPractice ? <span className="text-white text-xl">{playerScore} PTS</span> : <><h2 className="text-2xl text-red-400">{cpuTeam.abbreviation}</h2><span className="text-4xl font-bold text-white">{cpuScore}</span></>}
         </div>
      </div>

      <canvas ref={canvasRef} className="block bg-neutral-900" />
      
      <div className="absolute inset-0 z-10 pointer-events-none">
          {touchState.current.joystickOrigin && touchState.current.joystickCurrent && (
             <div className="absolute w-24 h-24 rounded-full border-2 border-white/30 bg-white/10 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: touchState.current.joystickOrigin.x, top: touchState.current.joystickOrigin.y }}>
                  <div className="absolute w-12 h-12 rounded-full bg-white/50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                       style={{ transform: `translate(${(touchState.current.joystickCurrent.x - touchState.current.joystickOrigin.x)}px, ${(touchState.current.joystickCurrent.y - touchState.current.joystickOrigin.y)}px) translate(-50%, -50%)` }} />
             </div>
          )}

          <div className="absolute bottom-16 right-8 pointer-events-auto"
             onTouchStart={(e) => { e.preventDefault(); touchState.current.isShooting = true; setIsShootingBtn(true); }}
             onTouchEnd={(e) => { e.preventDefault(); touchState.current.isShooting = false; setIsShootingBtn(false); }}
          >
             <div className={`w-24 h-24 rounded-full border-4 ${isShootingBtn ? 'bg-green-500 border-green-300 scale-95' : 'bg-green-600/50 border-white/50'} flex items-center justify-center transition-all shadow-lg backdrop-blur-sm`}>
                <span className="font-[Teko] text-2xl tracking-widest uppercase">Shoot</span>
             </div>
          </div>
          
          {isPractice && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto flex gap-2 overflow-x-auto max-w-[90%] p-2 bg-slate-900/80 rounded-xl border border-slate-600">
                {playerTeam.roster.map((p) => (
                    <button key={p.id} onClick={() => {
                            playersRef.current = playersRef.current.map(ent => {
                                if (ent.teamId === 'player') {
                                    return { ...ent, name: p.name, number: p.number, shooting: p.shooting, speed: p.speed, defense: p.defense, rating: p.rating };
                                }
                                return ent;
                            });
                            announce(`Switched to ${p.name}`);
                        }} className="flex flex-col items-center min-w-[50px] p-1 hover:bg-white/10 rounded">
                        <span className="text-xs text-gray-400">#{p.number}</span>
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs" style={{ backgroundColor: playerTeam.primaryColor, borderColor: 'white' }}>{p.position}</div>
                    </button>
                ))}
            </div>
          )}

          {!isPractice && (
            <div className="absolute bottom-4 left-4 text-white/50 text-xs font-mono bg-black/50 p-2 rounded">
                {lockedPlayerId ? 'L/G: Call for Pass' : 'H: Switch Player'} | L/G: Pass | X: Dunk
            </div>
          )}
      </div>

      <button onClick={handleExitRequest} className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold z-30">
        {isGameOver ? 'OVER' : 'QUIT'}
      </button>

      {/* PAUSE MENU */}
      {gameState !== 'playing' && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in-up">
              {gameState === 'menu' && (
                  <div className="bg-slate-900 p-8 rounded-xl border-2 border-slate-600 text-center space-y-6 shadow-2xl min-w-[300px]">
                      <h2 className="text-5xl font-[Teko] uppercase text-yellow-400">{isPractice ? "Practice Paused" : (isGameOver ? "Game Over" : "Game Paused")}</h2>
                      {!isPractice && <div className="text-4xl text-white font-mono mb-4 font-bold">{playerScore} - {cpuScore}</div>}
                      
                      {!isGameOver && (
                        <>
                            <button onClick={() => setGameState('playing')} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Resume</button>
                            {!isPractice && !lockedPlayerId && (
                                <button onClick={switchSides} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"><RefreshCw size={20} /> Switch Teams</button>
                            )}
                        </>
                      )}

                      {!isPractice && (
                          <button onClick={() => setGameState('boxscore')} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"><List size={20} /> Box Score</button>
                      )}
                      
                      {isGameOver ? (
                          isPlayoff && winner === 'player' ? (
                              <button onClick={() => onGameOver('player', playerScore, cpuScore)} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 rounded-lg font-bold text-black text-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse"><Trophy size={24} fill="currentColor" /> CONTINUE PLAYOFFS</button>
                          ) : (
                              <button onClick={() => {
                                    // Collect Stats
                                    const stats = playersRef.current.filter(p => p.teamId === 'player').map(p => p.stats);
                                    onGameOver(winner, playerScore, cpuScore, stats);
                                }} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"><LogOut size={20} /> {isPlayoff ? "EXIT TO MENU" : "FINISH GAME"}</button>
                          )
                      ) : (
                          <button onClick={() => onExit()} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"><LogOut size={20} /> Exit to Main Menu</button>
                      )}
                  </div>
              )}

              {gameState === 'boxscore' && !isPractice && (
                   <div className="bg-slate-900 w-[90%] max-w-4xl max-h-[90vh] overflow-auto rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h2 className="text-3xl font-[Teko] text-white uppercase">Game Stats</h2>
                            <button onClick={() => setGameState('menu')} className="text-gray-400 hover:text-white font-bold">CLOSE X</button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 mb-2 uppercase border-b border-blue-500/30 pb-1">{playerTeam.name}</h3>
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-500 uppercase bg-slate-800"><tr><th className="px-2 py-2">Player</th><th className="px-2 py-2 text-center">PTS</th><th className="px-2 py-2 text-center">REB</th><th className="px-2 py-2 text-center">STL</th></tr></thead>
                                    <tbody>
                                        {playersRef.current.filter(p => p.teamId === 'player').map((p) => (
                                            <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                <td className="px-2 py-2 font-bold text-white">{p.name} {lockedPlayerId === p.id && "(YOU)"}</td>
                                                <td className="px-2 py-2 text-center text-yellow-400 font-mono">{p.stats.pts}</td>
                                                <td className="px-2 py-2 text-center font-mono">{p.stats.reb}</td>
                                                <td className="px-2 py-2 text-center font-mono">{p.stats.stl}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-400 mb-2 uppercase border-b border-red-500/30 pb-1">{cpuTeam.name}</h3>
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-500 uppercase bg-slate-800"><tr><th className="px-2 py-2">Player</th><th className="px-2 py-2 text-center">PTS</th><th className="px-2 py-2 text-center">REB</th><th className="px-2 py-2 text-center">STL</th></tr></thead>
                                    <tbody>
                                        {playersRef.current.filter(p => p.teamId === 'cpu').map((p) => (
                                            <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                <td className="px-2 py-2 font-bold text-white">{p.name}</td>
                                                <td className="px-2 py-2 text-center text-yellow-400 font-mono">{p.stats.pts}</td>
                                                <td className="px-2 py-2 text-center font-mono">{p.stats.reb}</td>
                                                <td className="px-2 py-2 text-center font-mono">{p.stats.stl}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                   </div>
              )}
          </div>
      )}
    </div>
  );
};
