
import { Team, Position } from './types';

// Helper to create players quickly
const createPlayer = (id: string, name: string, num: string, pos: Position, ovr: number, sht: number, def: number, spd: number) => ({
  id, name, number: num, position: pos, rating: ovr, shooting: sht, defense: def, speed: spd
});

export const TEAMS: Team[] = [
  {
    id: 'bucks',
    city: 'Milwaukee',
    name: 'Bucks',
    abbreviation: 'MIL',
    primaryColor: '#00471B',
    secondaryColor: '#EEE1C6',
    roster: [
      createPlayer('mil1', 'Giannis Antetokounmpo', '34', Position.PF, 97, 70, 95, 90),
      createPlayer('mil2', 'Damian Lillard', '0', Position.PG, 94, 98, 70, 88),
      createPlayer('mil3', 'Khris Middleton', '22', Position.SF, 85, 88, 75, 78),
      createPlayer('mil4', 'Brook Lopez', '11', Position.C, 82, 80, 88, 60),
      createPlayer('mil5', 'Bobby Portis', '9', Position.PF, 80, 82, 78, 70),
    ]
  },
  {
    id: 'sixers',
    city: 'Philadelphia',
    name: '76ers',
    abbreviation: 'PHI',
    primaryColor: '#006BB6',
    secondaryColor: '#ED174C',
    roster: [
      createPlayer('phi1', 'Joel Embiid', '21', Position.C, 98, 85, 96, 75),
      createPlayer('phi2', 'Tyrese Maxey', '0', Position.PG, 89, 88, 75, 96),
      createPlayer('phi3', 'Paul George', '8', Position.SF, 90, 89, 88, 85),
      createPlayer('phi4', 'Kelly Oubre Jr.', '9', Position.SG, 80, 78, 76, 84),
      createPlayer('phi5', 'Caleb Martin', '16', Position.PF, 78, 76, 80, 80),
    ]
  },
  {
    id: 'lakers',
    city: 'Los Angeles',
    name: 'Lakers',
    abbreviation: 'LAL',
    primaryColor: '#552583',
    secondaryColor: '#FDB927',
    roster: [
      createPlayer('lal1', 'LeBron James', '23', Position.SF, 96, 85, 85, 85),
      createPlayer('lal2', 'Anthony Davis', '3', Position.C, 95, 78, 98, 80),
      createPlayer('lal3', 'Austin Reaves', '15', Position.SG, 82, 86, 74, 80),
      createPlayer('lal4', 'D\'Angelo Russell', '1', Position.PG, 80, 85, 65, 80),
      createPlayer('lal5', 'Rui Hachimura', '28', Position.PF, 79, 80, 75, 78),
    ]
  },
  {
    id: 'grizzlies',
    city: 'Memphis',
    name: 'Grizzlies',
    abbreviation: 'MEM',
    primaryColor: '#5D76A9',
    secondaryColor: '#12173F',
    roster: [
      createPlayer('mem1', 'Ja Morant', '12', Position.PG, 93, 78, 75, 99),
      createPlayer('mem2', 'Desmond Bane', '22', Position.SG, 86, 92, 78, 82),
      createPlayer('mem3', 'Jaren Jackson Jr.', '13', Position.PF, 87, 76, 96, 80),
      createPlayer('mem4', 'Marcus Smart', '36', Position.PG, 80, 75, 92, 82),
      createPlayer('mem5', 'Zach Edey', '14', Position.C, 76, 60, 80, 50),
    ]
  },
  {
    id: 'warriors',
    city: 'Golden State',
    name: 'Warriors',
    abbreviation: 'GSW',
    primaryColor: '#1D428A',
    secondaryColor: '#FFC72C',
    roster: [
      createPlayer('gsw1', 'Stephen Curry', '30', Position.PG, 96, 99, 70, 90),
      createPlayer('gsw2', 'Draymond Green', '23', Position.PF, 82, 70, 94, 75),
      createPlayer('gsw3', 'Andrew Wiggins', '22', Position.SF, 81, 78, 82, 85),
      createPlayer('gsw4', 'Jonathan Kuminga', '00', Position.PF, 80, 75, 78, 92),
      createPlayer('gsw5', 'Buddy Hield', '7', Position.SG, 79, 90, 65, 80),
    ]
  },
  {
    id: 'celtics',
    city: 'Boston',
    name: 'Celtics',
    abbreviation: 'BOS',
    primaryColor: '#007A33',
    secondaryColor: '#BA9653',
    roster: [
      createPlayer('bos1', 'Jayson Tatum', '0', Position.SF, 96, 88, 85, 84),
      createPlayer('bos2', 'Jaylen Brown', '7', Position.SG, 93, 85, 88, 88),
      createPlayer('bos3', 'Kristaps Porzingis', '8', Position.C, 87, 85, 88, 70),
      createPlayer('bos4', 'Jrue Holiday', '4', Position.PG, 86, 80, 95, 82),
      createPlayer('bos5', 'Derrick White', '9', Position.SG, 85, 84, 92, 80),
    ]
  },
  {
    id: 'thunder',
    city: 'Oklahoma City',
    name: 'Thunder',
    abbreviation: 'OKC',
    primaryColor: '#007AC1',
    secondaryColor: '#EF3B24',
    roster: [
      createPlayer('okc1', 'S. Gilgeous-Alexander', '2', Position.PG, 97, 90, 88, 92),
      createPlayer('okc2', 'Chet Holmgren', '7', Position.C, 88, 82, 94, 75),
      createPlayer('okc3', 'Jalen Williams', '8', Position.PF, 86, 80, 80, 85),
      createPlayer('okc4', 'Luguentz Dort', '5', Position.SF, 80, 75, 90, 82),
      createPlayer('okc5', 'Isaiah Hartenstein', '55', Position.C, 79, 60, 85, 65),
    ]
  },
  {
    id: 'knicks',
    city: 'New York',
    name: 'Knicks',
    abbreviation: 'NYK',
    primaryColor: '#F58426',
    secondaryColor: '#006BB6',
    roster: [
      createPlayer('nyk1', 'Jalen Brunson', '11', Position.PG, 93, 88, 70, 86),
      createPlayer('nyk2', 'Karl-Anthony Towns', '32', Position.C, 91, 90, 80, 72),
      createPlayer('nyk3', 'Mikal Bridges', '25', Position.SF, 86, 85, 90, 84),
      createPlayer('nyk4', 'OG Anunoby', '8', Position.PF, 84, 80, 92, 80),
      createPlayer('nyk5', 'Josh Hart', '3', Position.SG, 81, 75, 85, 82),
    ]
  }
];

// Controls Info
export const CONTROLS = [
  { key: 'WASD / Arrows', action: 'Move Player' },
  { key: 'Hold B', action: 'Charge Shot' },
  { key: 'Hold X', action: 'Dunk (Near Hoop)' },
  { key: 'L / G Key', action: 'Pass Ball' },
  { key: 'H Key', action: 'Switch Player' },
  { key: 'Hold Y', action: 'Block / Defense' },
];
