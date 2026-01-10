
export enum CardEffect {
  ATTACK_SMALL = 'ATTACK_SMALL',
  ATTACK_MEDIUM = 'ATTACK_MEDIUM',
  ATTACK_BIG = 'ATTACK_BIG',
  HEAL_SMALL = 'HEAL_SMALL',
  HEAL_MEDIUM = 'HEAL_MEDIUM',
  SHIELD = 'SHIELD',
  COIN_SMALL = 'COIN_SMALL',
  COIN_MEDIUM = 'COIN_MEDIUM',
}

export interface CardData {
  id: string;
  effect: CardEffect;
  isFlipped: boolean;
  isMatched: boolean;
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Entity {
  name: string;
  maxHp: number;
  currentHp: number;
  shield: number;
  coins?: number;
  description?: string;
  imageUrl?: string; // Added for bestiary images
  dateEncountered?: string;
  difficulty: Difficulty;
}

export enum GameState {
  LOADING = 'LOADING',
  PLAYER_TURN = 'PLAYER_TURN',
  ENEMY_THINKING = 'ENEMY_THINKING',
  ENEMY_ACTING = 'ENEMY_ACTING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE', // New state for between floors
  VICTORY = 'VICTORY', // Final victory
  DEFEAT = 'DEFEAT',
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'player' | 'enemy' | 'heal';
}

export type Screen = 'MENU' | 'GAME' | 'STORE' | 'BESTIARY';

export interface CardTheme {
  id: string;
  name: string;
  price: number;
  description: string;
  // CSS classes for the back container
  bgClass: string;
  // CSS classes for the inner decoration
  decorClass: string;
}

export interface UserProgress {
  coins: number;
  unlockedThemes: string[];
  selectedThemeId: string;
  lastDailyClaim: string;
  bestiary: Entity[]; // List of defeated enemies
}
