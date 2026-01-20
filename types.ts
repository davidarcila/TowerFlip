
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
  isSlimed?: boolean;
  isWildcard?: boolean; // New: Matches with anything
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type BossType = 'NONE' | 'BURN' | 'SLIME' | 'CONFUSION';

export interface Entity {
  name: string;
  maxHp: number;
  currentHp: number;
  shield: number;
  coins?: number;
  description?: string;
  visual: string;
  dateEncountered?: string;
  difficulty: Difficulty;
  bossType?: BossType;
}

export enum GameState {
  LOADING = 'LOADING',
  PLAYER_TURN = 'PLAYER_TURN',
  ENEMY_THINKING = 'ENEMY_THINKING',
  ENEMY_ACTING = 'ENEMY_ACTING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  MERCHANT = 'MERCHANT', // New State
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'player' | 'enemy' | 'heal' | 'burn' | 'item';
}

export type Screen = 'MENU' | 'GAME' | 'STORE' | 'BESTIARY';

export interface CardTheme {
  id: string;
  name: string;
  price: number;
  description: string;
  bgClass: string;
  decorClass: string;
}

export type ItemId = 'SPYGLASS' | 'HOURGLASS' | 'EYE_OF_FATE' | 'BANDAGE' | 'MERCY' | 'BRAINFOG' | 'SLEEP' | 'RITUAL' | 'CANDLE' | 'TRICKSTER' | 'MIRROR';

export interface Item {
  id: ItemId;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

export interface UserProgress {
  coins: number;
  unlockedThemes: string[];
  selectedThemeId: string;
  lastDailyClaim: string;
  lastClaimTimestamp?: number;
  bestiary: Entity[];
  inventory: ItemId[]; // New: Persist items
  towerLevel: number; // New: Track highest tower reached
}
