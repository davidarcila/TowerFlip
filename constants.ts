
import { CardEffect, CardData, CardTheme } from './types';

export const GAME_VERSION = '1.3.2';

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
  [CardEffect.ATTACK_SMALL]: { value: 2, label: 'Attack', icon: 'sword-sm', color: 'text-red-400' },
  [CardEffect.ATTACK_MEDIUM]: { value: 4, label: 'Slash', icon: 'sword-md', color: 'text-red-500' },
  [CardEffect.ATTACK_BIG]: { value: 6, label: 'Heavy Hit', icon: 'sword-lg', color: 'text-red-600' },
  [CardEffect.HEAL_SMALL]: { value: 2, label: 'Heal', icon: 'potion-sm', color: 'text-emerald-400' },
  [CardEffect.HEAL_MEDIUM]: { value: 4, label: 'Big Heal', icon: 'potion-md', color: 'text-emerald-500' },
  [CardEffect.SHIELD]: { value: 2, label: 'Shield', icon: 'shield', color: 'text-indigo-300' },
  // Coins adjusted: Small = 5, Medium = 10
  [CardEffect.COIN_SMALL]: { value: 5, label: 'Gold', icon: 'coin', color: 'text-amber-400' },
  [CardEffect.COIN_MEDIUM]: { value: 10, label: 'Treasure', icon: 'coins', color: 'text-amber-500' },
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
    name: 'Standard',
    price: 0,
    description: 'The standard card back.',
    bgClass: 'bg-gradient-to-br from-indigo-950 to-slate-950 border-indigo-900',
    decorClass: 'bg-indigo-500/10'
  },
  {
    id: 'dragon',
    name: 'Wyrm',
    price: 6,
    description: 'Scales of a red dragon.',
    bgClass: 'bg-gradient-to-br from-red-950 to-orange-950 border-red-900',
    decorClass: 'bg-red-500/10'
  },
  {
    id: 'nature',
    name: 'Sylvan',
    price: 12,
    description: 'Forest magic design.',
    bgClass: 'bg-gradient-to-br from-emerald-950 to-green-950 border-emerald-900',
    decorClass: 'bg-emerald-500/10'
  },
  {
    id: 'void',
    name: 'Void',
    price: 25,
    description: 'Darkness incarnate.',
    bgClass: 'bg-gradient-to-br from-black to-fuchsia-950 border-fuchsia-900',
    decorClass: 'bg-fuchsia-500/10'
  },
  {
    id: 'gold',
    name: 'Gilded',
    price: 60,
    description: 'Pure luxury.',
    bgClass: 'bg-gradient-to-br from-amber-900 to-yellow-950 border-amber-700',
    decorClass: 'bg-amber-400/20'
  }
];
