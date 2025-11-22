import React, { useRef, useEffect, useState } from 'react';
import { Team, Player } from '../types';
import { Trophy, List, LogOut, Play } from 'lucide-react';

interface GameEngineProps {
  playerTeam: Team;
  cpuTeam: Team;
  onGameOver: (winner: 'player' | 'cpu', scorePlayer: number, scoreCpu: number) => void;
  onExit: () => void;
  isBlacktop: boolean;
  isPlayoff?: boolean;
  isPractice?: boolean;
  practicePlayer?: Player;
}

// Physics Constants
const COURT_WIDTH = 1400; // Expanded for 5v5
const COURT_HEIGHT = 840;
const PLAYER_RADIUS = 16;
const BALL_RADIUS = 9;
const HOOP_RADIUS = 18;
const HOOP_X_LEFT = 60;
const HOOP_X_RIGHT = 1340;
const HOOP_Y = COURT_HEIGHT / 2;
const MOVE_SPEED_BASE = 3.5;
const RIM_HEIGHT = 38; 

export const GameEngine: React.FC<GameEngineProps> = ({ playerTeam, cpuTeam, onGameOver, onExit, isBlacktop, isPlayoff, isPractice, practicePlayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [gameTime, setGameTime] = useState(isPlayoff ? 240 : 180); 
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
    vx: 0, vy: 0, vz: 0,
    prevZ: 200,
    holder: null, 
    state: 'loose', // loose, held, shot, passed
    lastShooter: null, // Track who shot for points
    wasShot: false // Track if loose ball is a rebound opportunity
  });
  const cameraRef = useRef({ x: 0, y: 0 });

  // Initialize Entities
  useEffect(() => {
    // Helper to create entity with Stats
    const createEntity = (p: Player, teamId: string, isUser: boolean, startX: number, startY: number) => ({
      ...p,
      x: startX,
      y: startY,
      teamId,
      isUser,
      vx: 0,
      vy: 0,
      state: 'idle',
      shotCharge: 0,
      cooldown: 0,
      stats: { pts: 0, reb: 0, stl: 0 } // Init Stats
    });

    const pYBase = COURT_HEIGHT / 2;
    
    if (isPractice && practicePlayer) {
        // PRACTICE MODE: Single player
        const p1 = createEntity(practicePlayer, 'player', true, COURT_WIDTH/2, pYBase + 100);
        playersRef.current = [p1];
        ballRef.current.holder = p1;
        ballRef.current.x = p1.x;
        ballRef.current.y = p1.y;
        ballRef.current.z = 30;
        ballRef.current.state = 'held';
        announce(`Practice Mode. You are controlling ${practicePlayer.name}.`);
    } else {
        // STANDARD MODE: 5v5
        const p1 = createEntity(playerTeam.roster[0], 'player', true, 300, pYBase); 
        const p2 = createEntity(playerTeam.roster[1], 'player', false, 250, pYBase - 200); 
        const p3 = createEntity(playerTeam.roster[2], 'player', false, 250, pYBase + 200); 
        const p4 = createEntity(playerTeam.roster[3], 'player', false, 150, pYBase - 100); 
        const p5 = createEntity(playerTeam.roster[4], 'player', false, 150, pYBase + 100); 

        // CPU Team (Right side - Defense)
        const c1 = createEntity(cpuTeam.roster[0], 'cpu', false, 400, pYBase); 
        const c2 = createEntity(cpuTeam.roster[1], 'cpu', false, 350, pYBase - 200); 
        const c3 = createEntity(cpuTeam.roster[2], 'cpu', false, 350, pYBase + 200); 
        const c4 = createEntity(cpuTeam.roster[3], 'cpu', false, 250, pYBase - 100); 
        const c5 = createEntity(cpuTeam.roster[4], 'cpu', false, 250, pYBase + 100); 

        playersRef.current = [p1, p2, p3, p4, p5, c1, c2, c3, c4, c5];

        ballRef.current.holder = p1;
        ballRef.current.state = 'held';
        ballRef.current.x = p1.x;
        ballRef.current.y = p1.y;
        ballRef.current.z = 30;
        
        announce(`Welcome to ${isBlacktop ? 'the Blacktop' : 'the Arena'}! ${playerTeam.name} versus ${cpuTeam.name}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    Array.from(e.changedTouches).forEach(touch => {
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
    Array.from(e.changedTouches).forEach(touch => {
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
    Array.from(e.changedTouches).forEach(touch => {
      if (touch.clientX < window.innerWidth / 2) {
        touchState.current.joystickOrigin = null;
        touchState.current.joystickCurrent = null;
        setJoystickVec({ x: 0, y: 0 });
      }
    });
  };

  // Timer Logic
  useEffect(() => {
    if (gameState !== 'playing' || isPractice) return; // No timer in Practice

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
          // Still draw but don't update physics
          draw(ctx, playersRef.current, ballRef.current);
          animationFrameId = requestAnimationFrame(update);
          return;
      }

      const ball = ballRef.current;
      const players = playersRef.current;
      const now = Date.now();

      // Find Active User Player
      let userPlayer = players.find(p => p.isUser);
      if (!userPlayer) {
        userPlayer = players.find(p => p.teamId === 'player');
        if (userPlayer) userPlayer.isUser = true;
      }

      // --- INPUT HANDLING: SWITCHING (H) ---
      if (!isPractice && keys.current['h'] && now - lastSwitchTime.current > 300) {
        lastSwitchTime.current = now;
        const teamPlayers = players.filter(p => p.teamId === 'player');
        const currentIndex = teamPlayers.findIndex(p => p === userPlayer);
        const nextIndex = (currentIndex + 1) % teamPlayers.length;
        userPlayer.isUser = false;
        teamPlayers[nextIndex].isUser = true;
        userPlayer = teamPlayers[nextIndex]; 
        announce("Switching to " + userPlayer.name.split(' ').pop());
      }

      // --- INPUT HANDLING: PASSING (L) ---
      if (!isPractice && keys.current['l'] && now - lastPassTime.current > 250) {
        if (ball.holder === userPlayer) {
           lastPassTime.current = now;
           
           let idx = 0; let idy = 0;
           if (keys.current['w'] || keys.current['arrowup']) idy = -1;
           if (keys.current['s'] || keys.current['arrowdown']) idy = 1;
           if (keys.current['a'] || keys.current['arrowleft']) idx = -1;
           if (keys.current['d'] || keys.current['arrowright']) idx = 1;
           if (Math.abs(joystickVec.x) > 0.1 || Math.abs(joystickVec.y) > 0.1) {
              idx = joystickVec.x; idy = joystickVec.y;
           }

           const teammates = players.filter(p => p.teamId === 'player' && p !== userPlayer);
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
              const speed = 22; // Faster pass
              const dx = bestMate.x - userPlayer.x;
              const dy = bestMate.y - userPlayer.y;
              const dist = Math.hypot(dx, dy);
              ball.vx = (dx / dist) * speed;
              ball.vy = (dy / dist) * speed;
              ball.vz = 2; 
              
              // Auto switch to receiver
              userPlayer.isUser = false;
              bestMate.isUser = true;
              userPlayer = bestMate;
              announce("Pass!", 'low');
           }
        }
      }

      // --- USER MOVEMENT ---
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

      // Actions
      const isShootingInput = keys.current['b'] || touchState.current.isShooting;
      const isBlockingInput = keys.current['y'] || touchState.current.tapBlock;

      if (ball.holder === userPlayer) {
        if (isShootingInput) {
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
      } else if (!isShootingInput && userPlayer.state !== 'stunned') {
        userPlayer.state = 'idle';
      }

      // --- AI LOGIC (Skip in Practice) ---
      if (!isPractice) {
          players.forEach(p => {
            if (p === userPlayer) return; 
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
                 if (Math.random() < 0.015 && p.cooldown === 0) {
                    const variance = (Math.random() * 20) - 10; 
                    p.shotCharge = 50 + variance; 
                    shootBall(p);
                    p.cooldown = 120;
                 }
               }
            } else if (ball.holder && ball.holder.teamId !== p.teamId) {
               const targetX = (ball.holder.x + defendHoopX) / 2;
               const targetY = (ball.holder.y + HOOP_Y) / 2;
               moveTowards(p, targetX + (Math.random()*60-30), targetY + (Math.random()*60-30));
               
               const distToBall = Math.hypot(p.x - ball.holder.x, p.y - ball.holder.y);
               if (distToBall < 50 && Math.random() < 0.02) {
                  p.state = 'blocking';
                  if (Math.random() < (p.defense / 900)) {
                     // SUCCESSFUL STEAL
                     ball.holder.state = 'stunned';
                     ball.holder.cooldown = 60;
                     ball.holder = null;
                     ball.state = 'loose';
                     ball.vx = (p.x - ball.x) * 0.3;
                     ball.vy = (p.y - ball.y) * 0.3;
                     
                     // Stat Credit: Steal
                     p.stats.stl++;
                     
                     announce("Stolen by " + p.name.split(' ').pop() + "!", 'high');
                  }
               } else {
                 p.state = 'idle';
               }
            } else {
               const sideX = p.teamId === 'player' ? HOOP_X_RIGHT - 200 : HOOP_X_LEFT + 200;
               if (ball.holder === userPlayer && p.teamId === 'player') {
                  if (Math.hypot(p.x - userPlayer.x, p.y - userPlayer.y) < 150) {
                     moveTowards(p, p.x + (p.x - userPlayer.x), p.y + (p.y - userPlayer.y)); 
                  }
               }
               moveTowards(p, sideX + (Math.random()*400-200), HOOP_Y + (Math.random()*600-300));
            }
          });
      }

      // --- BALL PHYSICS ---
      if (ball.state === 'loose' || ball.state === 'shot' || ball.state === 'passed') {
        ball.prevZ = ball.z; 
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.98;
        ball.vy *= 0.98;

        if (ball.state === 'shot') {
           const gravity = 0.7; 
           ball.z += ball.vz;
           ball.vz -= gravity;
           
           const targetHoopX = ball.vx > 0 ? HOOP_X_RIGHT : HOOP_X_LEFT;
           const isPassingRimLevel = ball.prevZ >= RIM_HEIGHT && ball.z <= RIM_HEIGHT;
           
           if (isPassingRimLevel && ball.vz < 0) {
              const distToHoop = Math.hypot(ball.x - targetHoopX, ball.y - HOOP_Y);
              if (distToHoop < 11) {
                  scorePoint(ball.vx > 0 ? 'player' : 'cpu');
                  ball.state = 'loose';
                  ball.wasShot = false;
                  ball.z = 0; // Fall to ground
                  ball.vx = 0;
                  ball.vy = 0;
                  
                  if (!isPractice) {
                    resetAfterScore(ball.vx > 0 ? 'player' : 'cpu'); 
                  }
                  
                  announce( ["Splaaaash!", "Right down the middle!", "Nothing but net!", "It's good!"][Math.floor(Math.random()*4)], 'high' );
              } else if (distToHoop < 28) {
                  const angle = Math.atan2(ball.y - HOOP_Y, ball.x - targetHoopX);
                  ball.vx = Math.cos(angle) * 5; 
                  ball.vy = Math.sin(angle) * 5;
                  ball.vz = Math.abs(ball.vz) * 0.5 + 2; 
                  ball.state = 'loose'; // Missed shot becomes loose
                  ball.wasShot = true; // Mark for potential rebound
                  announce( ["Clank!", "Off the iron!", "No good!", "Rimmed out!"][Math.floor(Math.random()*4)], 'high' );
              }
           } else if (ball.z < 0) {
             ball.z = 0;
             ball.vz = -ball.vz * 0.6;
             ball.state = 'loose';
             ball.wasShot = true; // Ground ball from shot
           }
        } else if (ball.state === 'passed') {
           ball.z = 30;
        }

        if (ball.x < 0 || ball.x > COURT_WIDTH) ball.vx *= -1;
        if (ball.y < 0 || ball.y > COURT_HEIGHT) ball.vy *= -1;
      } else if (ball.holder) {
        ball.x = ball.holder.x + 12; 
        ball.y = ball.holder.y;
        ball.z = 30 + Math.abs(Math.sin(Date.now() / 100) * 15); 
      }

      // --- COLLISIONS (Pickup) ---
      if ((ball.state === 'loose' || ball.state === 'passed') && ball.z < 60) {
        players.forEach(p => {
          if (p.cooldown > 0) return;
          const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (dist < PLAYER_RADIUS + BALL_RADIUS + 10) {
            
            // REBOUND CHECK
            if (ball.wasShot && ball.state === 'loose') {
                p.stats.reb++;
                announce("Rebound " + p.name.split(' ').pop(), 'low');
            }

            ball.holder = p;
            ball.state = 'held';
            ball.wasShot = false;
            ball.vx = 0;
            ball.vy = 0;
            
            if (p.teamId === 'player' && !p.isUser) {
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
      ballRef.current.lastShooter = p; // Tag shooter
      ballRef.current.wasShot = false;

      const targetX = (p.teamId === 'player' || isPractice) ? HOOP_X_RIGHT : HOOP_X_LEFT;
      const dx = targetX - p.x;
      const dy = HOOP_Y - p.y;
      const dist = Math.hypot(dx, dy);

      // Physics
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
      else if (dist > 400) announce("For three...!", 'high');
      else announce("Puts it up!", 'low');
    };

    const scorePoint = (team: 'player' | 'cpu') => {
      // Calculate Points (2 or 3)
      let points = 2;
      const shooter = ballRef.current.lastShooter;
      if (shooter) {
          const targetX = team === 'player' ? HOOP_X_RIGHT : HOOP_X_LEFT;
          const dist = Math.hypot(shooter.x - targetX, shooter.y - HOOP_Y);
          if (dist > 400) points = 3;
          
          // Stat Credit: Points
          shooter.stats.pts += points;
      }

      if (team === 'player') {
        setPlayerScore(s => s + points);
      } else {
        setCpuScore(s => s + points);
      }
    };

    const resetAfterScore = (scoringTeam: 'player' | 'cpu') => {
       if (isPractice) return; // Do not reset positions in practice

       const possessionTeamId = scoringTeam === 'player' ? 'cpu' : 'player';
       
       setTimeout(() => {
         const pg = playersRef.current.find(p => p.teamId === possessionTeamId && p.position === 'PG') || playersRef.current.find(p => p.teamId === possessionTeamId);
         
         if (pg) {
            const baseX = possessionTeamId === 'player' ? 200 : COURT_WIDTH - 200;
            pg.x = baseX;
            pg.y = COURT_HEIGHT / 2;
            
            ballRef.current.holder = pg;
            ballRef.current.state = 'held';
            ballRef.current.x = pg.x;
            ballRef.current.y = pg.y;
            ballRef.current.vx = 0;
            ballRef.current.vy = 0;
            ballRef.current.z = 30;
            ballRef.current.lastShooter = null;
            ballRef.current.wasShot = false;

            if (possessionTeamId === 'player') {
               playersRef.current.forEach(p => p.isUser = false);
               pg.isUser = true;
            }
            announce("Ready to inbound.", 'low');
         }
       }, 2000);
    };

    const drawCrowd = (ctx: CanvasRenderingContext2D) => {
        if (isPractice) return; // Empty gym for practice
        const dotSize = 4;
        const spacing = 15;
        const drawRow = (startX: number, endX: number, startY: number, endY: number) => {
             for(let x = startX; x < endX; x+=spacing) {
                 for(let y = startY; y < endY; y+=spacing) {
                     if (Math.random() > 0.95) continue;
                     ctx.fillStyle = `hsl(${Math.random()*360}, 60%, 50%)`;
                     ctx.beginPath();
                     ctx.arc(x, y, dotSize, 0, Math.PI*2);
                     ctx.fill();
                 }
             }
        };
        drawRow(-200, COURT_WIDTH + 200, -200, -20);
        drawRow(-200, COURT_WIDTH + 200, COURT_HEIGHT + 20, COURT_HEIGHT + 200);
        drawRow(-200, -20, 0, COURT_HEIGHT);
        drawRow(COURT_WIDTH + 20, COURT_WIDTH + 200, 0, COURT_HEIGHT);
    };

    const drawChainLinkFence = (ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const spacing = 30;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-500, -500, COURT_WIDTH+1000, COURT_HEIGHT+1000);
        
        ctx.beginPath();
        for(let x = -200; x < COURT_WIDTH + 200; x += spacing) {
            ctx.moveTo(x, -200);
            ctx.lineTo(x + spacing/2, COURT_HEIGHT + 200);
            ctx.moveTo(x + spacing/2, -200);
            ctx.lineTo(x, COURT_HEIGHT + 200);
        }
        ctx.stroke();
        ctx.restore();
    };

    const draw = (ctx: CanvasRenderingContext2D, players: any[], ball: any) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      if (isBlacktop) {
        drawChainLinkFence(ctx);
        ctx.fillStyle = '#222'; 
        ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#fff';
        for(let i=0; i<100; i++) {
           const nx = Math.random() * COURT_WIDTH;
           const ny = Math.random() * COURT_HEIGHT;
           const s = Math.random() * 4 + 1;
           ctx.fillRect(nx, ny, s, s);
        }
        ctx.globalAlpha = 1.0;
      } else {
        drawCrowd(ctx);
        // Practice Mode Gym Floor
        ctx.fillStyle = isPractice ? '#e6d5b8' : '#D2B48C'; 
        ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
      }

      // Court Lines
      ctx.strokeStyle = isBlacktop ? '#ccc' : 'white';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, COURT_WIDTH, COURT_HEIGHT);
      ctx.beginPath(); ctx.arc(COURT_WIDTH/2, COURT_HEIGHT/2, 80, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(COURT_WIDTH/2, 0); ctx.lineTo(COURT_WIDTH/2, COURT_HEIGHT); ctx.stroke();

      ctx.strokeRect(0, HOOP_Y - 100, 250, 200);
      ctx.beginPath(); ctx.arc(250, HOOP_Y, 100, -Math.PI/2, Math.PI/2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(150, 60); ctx.arc(60, HOOP_Y, 400, -Math.PI/3.5, Math.PI/3.5); ctx.stroke();

      ctx.strokeRect(COURT_WIDTH - 250, HOOP_Y - 100, 250, 200);
      ctx.beginPath(); ctx.arc(COURT_WIDTH - 250, HOOP_Y, 100, Math.PI/2, -Math.PI/2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(COURT_WIDTH, 60); ctx.lineTo(COURT_WIDTH - 150, 60); ctx.arc(COURT_WIDTH - 60, HOOP_Y, 400, Math.PI - Math.PI/3.5, Math.PI + Math.PI/3.5); ctx.stroke();

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'orange';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(HOOP_X_LEFT, HOOP_Y, HOOP_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(HOOP_X_RIGHT, HOOP_Y, HOOP_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      players.forEach(p => {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 15, 12, 6, 0, 0, Math.PI*2); ctx.fill();
      });
      
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      const shadowSize = Math.max(4, BALL_RADIUS - ball.z/15);
      ctx.ellipse(ball.x, ball.y + BALL_RADIUS + 4, shadowSize, shadowSize/2, 0, 0, Math.PI*2); ctx.fill();

      players.forEach(p => {
        const team = p.teamId === 'player' ? playerTeam : cpuTeam;
        ctx.fillStyle = p.teamId === 'player' ? team.primaryColor : team.secondaryColor;
        
        if (p.isUser) {
           ctx.strokeStyle = '#00FF00'; 
           ctx.lineWidth = 3;
        } else {
           ctx.strokeStyle = 'rgba(0,0,0,0.2)';
           ctx.lineWidth = 1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lastName = p.name.split(' ').pop();
        ctx.fillText(lastName.substring(0, 7), p.x, p.y);
        
        if (ball.holder === p) {
           ctx.fillStyle = 'orange';
           ctx.beginPath(); ctx.arc(p.x, p.y - 25, 4, 0, Math.PI*2); ctx.fill();
        }

        if (p.shotCharge > 0) {
          ctx.fillStyle = 'gray';
          ctx.fillRect(p.x - 20, p.y - 35, 40, 6);
          const diff = Math.abs(p.shotCharge - 50);
          if (diff < 5) ctx.fillStyle = '#00ff00';
          else if (diff < 15) ctx.fillStyle = '#ffff00';
          else ctx.fillStyle = '#ff0000';
          const width = Math.min(40, (p.shotCharge / 100) * 40);
          ctx.fillRect(p.x - 20, p.y - 35, width, 6);
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x - 20, p.y - 35, 40, 6);
          ctx.strokeStyle = 'white';
          ctx.beginPath(); ctx.moveTo(p.x, p.y - 35); ctx.lineTo(p.x, p.y - 29); ctx.stroke();
        }
        
        if (p.state === 'blocking') {
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; ctx.lineWidth = 2; ctx.arc(p.x, p.y, PLAYER_RADIUS + 8, 0, Math.PI*2); ctx.stroke();
        }
      });

      const ballYVisual = ball.y - ball.z;
      ctx.fillStyle = '#E56B1F'; 
      ctx.beginPath(); ctx.arc(ball.x, ballYVisual, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ball.x, ballYVisual, BALL_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(ball.x - 3, ballYVisual - 3, 3, 0, Math.PI*2); ctx.fill();

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [playerTeam, cpuTeam, isBlacktop, joystickVec, isPlayoff, gameState, isPractice, practicePlayer]);

  // Helper to trigger the exit flow
  const handleExitRequest = () => {
      setGameState('menu');
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[600px] flex justify-between items-center px-6 py-2 bg-slate-900/90 border border-slate-600 rounded-full shadow-lg z-20 arcade-font">
         <div className="text-center w-20">
            {isPractice ? (
                <span className="text-green-400 text-xl">PRACTICE</span>
            ) : (
                <>
                    <h2 className="text-2xl text-blue-400">{playerTeam.abbreviation}</h2>
                    <span className="text-4xl font-bold text-white">{playerScore}</span>
                </>
            )}
         </div>
         <div className="text-center flex-1">
             <div className="text-3xl text-red-500 font-mono tracking-widest font-bold">
               {isPractice ? "∞:∞" : `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, '0')}`}
             </div>
             <div className="text-xs text-yellow-300 truncate px-2">{commentary}</div>
         </div>
         <div className="text-center w-20">
            {isPractice ? (
                <span className="text-white text-xl">{playerScore} PTS</span>
            ) : (
                <>
                    <h2 className="text-2xl text-red-400">{cpuTeam.abbreviation}</h2>
                    <span className="text-4xl font-bold text-white">{cpuScore}</span>
                </>
            )}
         </div>
      </div>

      <canvas ref={canvasRef} className="block bg-neutral-900" />
      
      <div className="absolute inset-0 z-10 pointer-events-none">
          {touchState.current.joystickOrigin && touchState.current.joystickCurrent && (
             <div className="absolute w-24 h-24 rounded-full border-2 border-white/30 bg-white/10 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: touchState.current.joystickOrigin.x, top: touchState.current.joystickOrigin.y }}>
                  <div className="absolute w-12 h-12 rounded-full bg-white/50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                       style={{ 
                         transform: `translate(
                           ${(touchState.current.joystickCurrent.x - touchState.current.joystickOrigin.x)}px, 
                           ${(touchState.current.joystickCurrent.y - touchState.current.joystickOrigin.y)}px
                         ) translate(-50%, -50%)` 
                       }}
                  />
             </div>
          )}

          <div 
             className="absolute bottom-16 right-8 pointer-events-auto"
             onTouchStart={(e) => { e.preventDefault(); touchState.current.isShooting = true; setIsShootingBtn(true); }}
             onTouchEnd={(e) => { e.preventDefault(); touchState.current.isShooting = false; setIsShootingBtn(false); }}
          >
             <div className={`w-24 h-24 rounded-full border-4 ${isShootingBtn ? 'bg-green-500 border-green-300 scale-95' : 'bg-green-600/50 border-white/50'} flex items-center justify-center transition-all shadow-lg backdrop-blur-sm`}>
                <span className="font-[Teko] text-2xl tracking-widest uppercase">Shoot</span>
             </div>
          </div>
          
          {!isPractice && (
            <div className="absolute bottom-4 left-4 text-white/50 text-xs font-mono bg-black/50 p-2 rounded">
                H: Switch Player | L: Pass Ball
            </div>
          )}
      </div>

      <button 
        onClick={handleExitRequest}
        className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold z-30"
      >
        QUIT
      </button>

      {/* POST GAME MENU OVERLAY */}
      {gameState !== 'playing' && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in-up">
              
              {gameState === 'menu' && (
                  <div className="bg-slate-900 p-8 rounded-xl border-2 border-slate-600 text-center space-y-6 shadow-2xl min-w-[300px]">
                      <h2 className="text-5xl font-[Teko] uppercase text-yellow-400">
                        {isPractice ? "Practice Paused" : (gameTime > 0 ? "Game Paused" : "Game Over")}
                      </h2>
                      
                      {!isPractice && (
                        <div className="text-2xl text-white font-mono mb-4">
                            {playerScore} - {cpuScore}
                        </div>
                      )}
                      
                      <button 
                        onClick={() => setGameState('playing')}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <Play size={20} fill="currentColor" /> Resume
                      </button>

                      {!isPractice && (
                          <button 
                            onClick={() => setGameState('boxscore')}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <List size={20} /> Box Score
                          </button>
                      )}
                      
                      <button 
                        onClick={() => onExit()}
                        className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <LogOut size={20} /> Exit to Main Menu
                      </button>
                  </div>
              )}

              {gameState === 'boxscore' && !isPractice && (
                   <div className="bg-slate-900 w-[90%] max-w-4xl max-h-[90vh] overflow-auto rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h2 className="text-3xl font-[Teko] text-white uppercase">Game Stats</h2>
                            <button onClick={() => setGameState('menu')} className="text-gray-400 hover:text-white font-bold">CLOSE X</button>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Player Team Stats */}
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 mb-2 uppercase border-b border-blue-500/30 pb-1">{playerTeam.name}</h3>
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-500 uppercase bg-slate-800">
                                        <tr>
                                            <th className="px-2 py-2">Player</th>
                                            <th className="px-2 py-2 text-center">PTS</th>
                                            <th className="px-2 py-2 text-center">REB</th>
                                            <th className="px-2 py-2 text-center">STL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playersRef.current.filter(p => p.teamId === 'player').map((p) => (
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

                            {/* CPU Team Stats */}
                            <div>
                                <h3 className="text-xl font-bold text-red-400 mb-2 uppercase border-b border-red-500/30 pb-1">{cpuTeam.name}</h3>
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-500 uppercase bg-slate-800">
                                        <tr>
                                            <th className="px-2 py-2">Player</th>
                                            <th className="px-2 py-2 text-center">PTS</th>
                                            <th className="px-2 py-2 text-center">REB</th>
                                            <th className="px-2 py-2 text-center">STL</th>
                                        </tr>
                                    </thead>
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
                        
                        <div className="p-4 border-t border-slate-700 bg-slate-800 text-center">
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Hoops Legends Box Score</span>
                        </div>
                   </div>
              )}
          </div>
      )}
    </div>
  );
};