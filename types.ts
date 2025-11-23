
export enum GameMode {
  MENU = 'MENU',
  TEAM_SELECT = 'TEAM_SELECT',
  GAME = 'GAME',
  PLAYOFFS = 'PLAYOFFS',
  BLACKTOP_SELECT = 'BLACKTOP_SELECT',
  PRACTICE_SELECT = 'PRACTICE_SELECT',
  MY_CAREER_HUB = 'MY_CAREER_HUB',
  MY_CAREER_CREATION = 'MY_CAREER_CREATION'
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
  skinColor?: string;
  hairColor?: string;
  accessories?: string[];
  isUser?: boolean;
  teamId?: string;
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

export enum CareerPhase {
  EMPTY = 'EMPTY',
  CREATION = 'CREATION',
  COLLEGE_GAME = 'COLLEGE_GAME',
  COACH_TALK = 'COACH_TALK',
  DRAFT = 'DRAFT',
  SKILLS_CHALLENGE = 'SKILLS_CHALLENGE', // Replaces ROOKIE_SHOWCASE
  NBA_SEASON = 'NBA_SEASON'
}

export interface Lifestyle {
  houseLevel: number; // 0=Streets, 1=Apartment, 2=Penthouse, 3=Mansion
  hasWife: boolean;
  relationshipProgress: number; // 0-100
  foodLevel: number; // 0-100 (Energy)
  dripLevel: number; // 0-100
}

export interface CareerSave {
  id: number;
  name: string;
  height: string;
  weight: string;
  teamId: string;
  coins: number;
  phase: CareerPhase;
  inventory: string[]; // 'headband', 'sleeves', 'city_jersey'
  stats: {
    rings: number;
    ppg: number;
    gamesPlayed: number;
  };
  lifestyle: Lifestyle;
  playerData: Player;
}
