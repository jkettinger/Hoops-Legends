export enum GameMode {
  MENU = 'MENU',
  TEAM_SELECT = 'TEAM_SELECT',
  GAME = 'GAME',
  PLAYOFFS = 'PLAYOFFS',
  BLACKTOP_SELECT = 'BLACKTOP_SELECT',
  PRACTICE_SELECT = 'PRACTICE_SELECT'
}

export enum Position {
  PG = 'PG',
  SG = 'SG',
  SF = 'SF',
  PF = 'PF',
  C = 'C'
}

export interface Player {
  id: string;
  name: string;
  number: string;
  position: Position;
  rating: number; // 0-100
  speed: number;
  shooting: number;
  defense: number;
  color?: string; // For on-court distinction
}

export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  roster: Player[];
}

export interface GameState {
  playerScore: number;
  cpuScore: number;
  timeLeft: number; // seconds
  possession: 'player' | 'cpu' | 'loose';
  gameOver: boolean;
}

export interface BracketNode {
  round: number;
  matchupId: string;
  team1: Team | null;
  team2: Team | null;
  winner: Team | null;
  score?: string;
}