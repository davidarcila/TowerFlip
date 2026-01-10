import { CardEffect, CardData, CardTheme } from './types';

export const GAME_VERSION = '1.0.7';

// Simple seeded RNG for the daily board layout
export class SeededRNG {
  private seed: number;

  constructor(seedStr: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    this.seed = h >>> 0;
  }

  // Returns float 0-1
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

export const EFFECT_CONFIG = {
  // Rebalanced for 10 Max HP
  [CardEffect.ATTACK_SMALL]: { value: 2, label: 'Small Attack', icon: 'sword-sm', color: 'text-red-400' },
  [CardEffect.ATTACK_MEDIUM]: { value: 4, label: 'Medium Attack', icon: 'sword-md', color: 'text-red-500' },
  [CardEffect.ATTACK_BIG]: { value: 8, label: 'Heavy Attack', icon: 'sword-lg', color: 'text-red-600' },
  [CardEffect.HEAL_SMALL]: { value: 2, label: 'Small Heal', icon: 'potion-sm', color: 'text-green-400' },
  [CardEffect.HEAL_MEDIUM]: { value: 4, label: 'Medium Heal', icon: 'potion-md', color: 'text-green-500' },
  [CardEffect.SHIELD]: { value: 2, label: 'Shield', icon: 'shield', color: 'text-blue-400' },
  // Coins adjusted for low economy
  [CardEffect.COIN_SMALL]: { value: 1, label: 'Gold Pouch', icon: 'coin', color: 'text-yellow-400' },
  [CardEffect.COIN_MEDIUM]: { value: 3, label: 'Treasure', icon: 'coins', color: 'text-yellow-500' },
};

// 16 Cards total = 8 pairs
export const DECK_COMPOSITION: CardEffect[] = [
  CardEffect.ATTACK_SMALL,
  CardEffect.ATTACK_SMALL,
  CardEffect.ATTACK_MEDIUM,
  CardEffect.ATTACK_BIG,
  CardEffect.HEAL_SMALL,
  CardEffect.HEAL_MEDIUM,
  CardEffect.SHIELD,
  CardEffect.COIN_SMALL, 
];

export const generateDeck = (dateString: string): CardData[] => {
  const rng = new SeededRNG(dateString);
  
  let deckEffects: CardEffect[] = [];
  DECK_COMPOSITION.forEach(effect => {
    deckEffects.push(effect);
    deckEffects.push(effect);
  });

  for (let i = deckEffects.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deckEffects[i], deckEffects[j]] = [deckEffects[j], deckEffects[i]];
  }

  return deckEffects.map((effect, index) => ({
    id: `card-${index}`,
    effect,
    isFlipped: false,
    isMatched: false,
  }));
};

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'default',
    name: 'Standard Issue',
    price: 0,
    description: 'The standard dungeon issue card back.',
    bgClass: 'bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-700/50',
    decorClass: 'bg-indigo-500/20'
  },
  {
    id: 'dragon',
    name: 'Red Dragon',
    price: 1,
    description: 'Forged in dragon fire.',
    bgClass: 'bg-gradient-to-br from-red-900 to-orange-900 border-red-700/50',
    decorClass: 'bg-red-500/20'
  },
  {
    id: 'nature',
    name: 'Elven Forest',
    price: 5,
    description: 'Smells of pine and magic.',
    bgClass: 'bg-gradient-to-br from-green-900 to-emerald-900 border-green-700/50',
    decorClass: 'bg-green-500/20'
  },
  {
    id: 'void',
    name: 'Void Walker',
    price: 10,
    description: 'Stare into the abyss.',
    bgClass: 'bg-gradient-to-br from-fuchsia-950 to-purple-900 border-purple-700/50',
    decorClass: 'bg-purple-500/20'
  },
  {
    id: 'gold',
    name: 'Midas Touch',
    price: 50,
    description: 'Pure luxury.',
    bgClass: 'bg-gradient-to-br from-yellow-700 to-yellow-900 border-yellow-500/50',
    decorClass: 'bg-yellow-400/30'
  }
];