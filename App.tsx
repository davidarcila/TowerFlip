
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coins, Skull, RefreshCw, Trophy, ShieldAlert, Zap, ShoppingBag, BookOpen, ArrowLeft, Check, Lock, Flame, Sword, Share2, ArrowUpCircle, RectangleVertical, Heart, Eye, Clock, Castle, Star, Droplets, Shuffle, Briefcase, ChevronRight } from 'lucide-react';
import Card from './components/Card';
import HealthBar from './components/HealthBar';
import SolitaireCelebration from './components/SolitaireCelebration';
import { CardData, CardEffect, Entity, GameState, LogEntry, Screen, UserProgress, CardTheme, ItemId, Item } from './types';
import { generateDeck, EFFECT_CONFIG, DECK_COMPOSITION, CARD_THEMES, GAME_VERSION, ITEMS } from './constants';
import { generateDailyEnemy } from './services/gemini';
import { initAudio, playSound } from './services/audio';

const LOADING_PHRASES = [
  "Shuffling Destiny...",
  "Building the Spire...",
  "Awakening Guardians...",
  "Dealing Fate...",
  "Sharpening Blades...",
  "Counting Gold...",
  "Summoning Monsters...",
  "Reading the Stars...",
  "Gathering Mana..."
];

const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// --- COMPONENTS ---

const StarBackground: React.FC = () => {
  // Generate random stars only once
  const [stars] = useState(() => 
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`, // 1px to 3px
      duration: `${Math.random() * 5 + 5}s`, // 5s to 10s duration for slower movement
      opacity: Math.random() * 0.3 + 0.1 // More subtle: 0.1 to 0.4
    }))
  );

  return (
    <div className="absolute inset-0 z-0 bg-esoteric">
      <div className="stars-container">
        {stars.map(star => (
          <div 
            key={star.id}
            className="star"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              '--duration': star.duration,
              '--opacity': star.opacity
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

interface MenuProps {
  userProgress: UserProgress;
  setUserProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  startRun: () => void;
}

const Menu: React.FC<MenuProps> = ({ userProgress, setUserProgress, setScreen, startRun }) => {
  const currentTheme = CARD_THEMES.find(t => t.id === userProgress.selectedThemeId) || CARD_THEMES[0];
  
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto p-6 gap-6 md:gap-8">
         <StarBackground />
         
         <div className="relative z-10 flex flex-col items-center w-full gap-6">
             <div className="text-center space-y-2 mt-4">
                <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-200 to-cyan-200 leading-tight font-serif tracking-tighter drop-shadow-md">
                  Towerflip
                </h1>
                <p className="text-slate-400 text-sm font-serif italic flex items-center justify-center gap-2">
                   <Star className="w-3 h-3 text-indigo-400" /> Infinite Tower Run <Star className="w-3 h-3 text-indigo-400" />
                </p>
             </div>
             
             {/* Play & Store Section */}
             <div className="flex flex-col w-full gap-4 max-w-sm">
                <button onClick={startRun} className="w-full bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-700/50 text-indigo-100 p-6 rounded-sm font-bold text-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] flex items-center justify-center gap-3 active:scale-95 group backdrop-blur-sm">
                  <Sword className="w-5 h-5 group-hover:rotate-45 transition-transform" /> <span className="font-serif tracking-widest">ENTER TOWER</span>
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setScreen('STORE')} className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300 p-4 rounded-sm font-bold transition-all flex flex-col items-center justify-center gap-2 active:scale-95 backdrop-blur-sm">
                    <ShoppingBag className="w-5 h-5 text-amber-600" />
                    <span className="text-xs uppercase tracking-widest">Store</span>
                    </button>
                    
                    <button onClick={() => setScreen('BESTIARY')} className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300 p-4 rounded-sm font-bold transition-all flex flex-col items-center justify-center gap-2 active:scale-95 backdrop-blur-sm">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs uppercase tracking-widest">Bestiary</span>
                    </button>
                </div>
             </div>
    
             {/* Separator */}
             <div className="w-full max-w-[200px] h-px bg-gradient-to-r from-transparent via-indigo-900 to-transparent my-2" />
    
             {/* Stats */}
             <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded flex flex-col items-center justify-center gap-1 shadow-lg backdrop-blur-sm">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <div className="flex flex-col items-center leading-none">
                     <span className="text-amber-100 font-bold font-mono text-sm">{userProgress.coins}</span>
                     <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Gold</span>
                  </div>
                </div>
                
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded flex flex-col items-center justify-center gap-1 shadow-lg backdrop-blur-sm">
                  <ArrowUpCircle className="w-5 h-5 text-indigo-400" />
                  <div className="flex flex-col items-center leading-none">
                     <span className="text-indigo-100 font-bold font-mono text-sm">{userProgress.towerLevel || 1}</span>
                     <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Max Tower</span>
                  </div>
                </div>
    
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded flex flex-col items-center justify-center gap-1 shadow-lg backdrop-blur-sm">
                  <RectangleVertical className="w-5 h-5 text-indigo-400" />
                  <div className="flex flex-col items-center leading-none w-full">
                     <span className="text-indigo-100 font-bold font-mono text-xs truncate max-w-[80px]">{currentTheme.name}</span>
                     <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Theme</span>
                  </div>
                </div>
             </div>
    
             {/* Version Number */}
             <div className="absolute bottom-[-20px] text-[10px] text-slate-600 font-mono">
               v{GAME_VERSION}
             </div>
         </div>
    </div>
  );
};

// --- MERCHANT COMPONENT ---
interface MerchantProps {
  onLeave: () => void;
  coins: number;
  spendCoins: (amount: number) => void;
  addItem: (item: ItemId) => void;
}

const Merchant: React.FC<MerchantProps> = ({ onLeave, coins, spendCoins, addItem }) => {
  // Select 3 random items for sale
  const [itemsForSale] = useState(() => {
    const shuffled = [...ITEMS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  });
  
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);

  const handleBuy = (item: Item) => {
    if (coins >= item.cost && !purchasedIds.includes(item.id)) {
      playSound('coin');
      spendCoins(item.cost);
      addItem(item.id);
      setPurchasedIds(prev => [...prev, item.id]);
    } else {
      playSound('tap'); // Error sound ideally
    }
  };

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-deal">
       <div className="w-full max-w-lg bg-slate-900 border border-indigo-900 rounded-lg shadow-2xl overflow-hidden flex flex-col">
          <div className="p-6 bg-gradient-to-br from-indigo-950 to-slate-900 border-b border-indigo-900 flex items-center gap-4">
             <div className="w-16 h-16 bg-indigo-900/50 rounded-full flex items-center justify-center border-2 border-indigo-500 text-3xl">
               🧙‍♂️
             </div>
             <div>
               <h2 className="text-2xl font-serif font-bold text-indigo-200">Mysterious Merchant</h2>
               <p className="text-indigo-400 text-sm italic">"Dangerous climb ahead... take this."</p>
             </div>
             <div className="ml-auto flex flex-col items-end">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-lg">
                   <Coins className="w-5 h-5" /> {coins}
                </div>
             </div>
          </div>
          
          <div className="p-6 grid gap-4">
             {itemsForSale.map(item => {
               const isPurchased = purchasedIds.includes(item.id);
               const canAfford = coins >= item.cost;
               
               return (
                 <div key={item.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${isPurchased ? 'bg-slate-950 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700 hover:border-indigo-500'}`}>
                    <div className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-900 rounded border border-slate-700">{item.icon}</div>
                    <div className="flex-1">
                       <h3 className="font-bold text-slate-200">{item.name}</h3>
                       <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                    
                    {isPurchased ? (
                       <span className="text-emerald-500 font-bold text-sm uppercase tracking-wider flex items-center gap-1"><Check className="w-4 h-4"/> Bought</span>
                    ) : (
                       <button 
                         onClick={() => handleBuy(item)}
                         disabled={!canAfford}
                         className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-1 ${canAfford ? 'bg-amber-700 hover:bg-amber-600 text-amber-100' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                       >
                         {item.cost} <Coins className="w-3 h-3" />
                       </button>
                    )}
                 </div>
               );
             })}
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
             <button onClick={onLeave} className="px-6 py-3 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 font-bold rounded flex items-center gap-2">
                Continue Climb <ChevronRight className="w-4 h-4" />
             </button>
          </div>
       </div>
    </div>
  );
};

// --- TOWER TRANSITION SCREEN ---
const TowerLevelTransition = ({ currentFloor, towerLevel, onNext }: { currentFloor: number, towerLevel: number, onNext: () => void }) => {
    // Current floor passed here is the one JUST defeated (0 or 1). We are about to go to (currentFloor + 1).

    const floors = [
        { id: 0, label: "Floor 1", icon: <Sword className="w-4 h-4" /> },
        { id: 1, label: "Floor 2", icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 2, label: "Merchant", icon: <ShoppingBag className="w-4 h-4" /> }, // Visually indicate merchant? Logic is Merchant -> Boss
        { id: 3, label: "Boss", icon: <Skull className="w-5 h-5" />, isBoss: true }
    ];
    
    // We only map 3 steps in the UI for simplicity, but logically the merchant is between 1 and 2 (index 2).
    // Let's simplify visual: Floor 1, Floor 2, Boss. Merchant happens automatically.
    
    // Animation state
    const [animating, setAnimating] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setAnimating(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 rounded-lg border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-esoteric opacity-50"></div>
            
            <h2 className="text-2xl font-serif text-slate-200 mb-2 relative z-10">Ascending Tower {towerLevel}</h2>
            
            <button 
                onClick={onNext}
                className="mt-10 px-8 py-3 bg-indigo-900/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 font-bold rounded-sm shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 relative z-10"
            >
                Continue Climb <ArrowUpCircle className="w-4 h-4" />
            </button>
        </div>
    );
}

// --- NEXT TOWER SCREEN (End of a Set of 3) ---
const TowerCompleteScreen = ({ onContinue, towerLevel, onShare, showCopied }: { onContinue: () => void, towerLevel: number, onShare: () => void, showCopied: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-[fadeIn_1s_ease-out] relative z-20 text-center">
        <h2 className="text-4xl font-bold font-serif text-amber-100 mb-2 drop-shadow-lg flex items-center gap-3">
            <Castle className="w-10 h-10" /> Tower {towerLevel} Cleared!
        </h2>
        <p className="text-slate-400 mb-8 font-serif italic">The spire grows taller...</p>
        
        <div className="flex flex-col items-center gap-4 mb-8 py-10 px-12 bg-black/40 rounded-lg border border-slate-800 shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <div className="text-emerald-400 font-bold text-xl mb-2">Difficulty Increased!</div>
            <p className="text-slate-400 text-sm">Enemies will have more HP in the next tower.</p>
        </div>

        <div className="flex gap-4">
             <button onClick={onShare} className="px-8 py-3 bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 font-bold rounded-sm flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-colors">
                 {showCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Share2 className="w-3 h-3" /> Share Progress</>}
             </button>
             <button onClick={onContinue} className="px-8 py-3 bg-amber-900 hover:bg-amber-800 border border-amber-700 text-amber-100 font-bold rounded-sm flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-colors">
                Next Tower <ArrowUpCircle className="w-4 h-4" />
             </button>
        </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- Persistent User State ---
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('dungeon_user_progress');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        lastClaimTimestamp: parsed.lastClaimTimestamp || 0,
        inventory: parsed.inventory || [], // Ensure inventory exists
        towerLevel: parsed.towerLevel || 1
      };
    }
    return {
      coins: 0,
      unlockedThemes: ['default'],
      selectedThemeId: 'default',
      lastDailyClaim: '',
      lastClaimTimestamp: 0,
      bestiary: [],
      inventory: [],
      towerLevel: 1
    };
  });

  // Save progress whenever it changes
  useEffect(() => {
    localStorage.setItem('dungeon_user_progress', JSON.stringify(userProgress));
  }, [userProgress]);

  // --- Game State ---
  const [screen, setScreen] = useState<Screen>('MENU');
  const [cards, setCards] = useState<CardData[]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [combo, setCombo] = useState<number>(0);
  const [comboOwner, setComboOwner] = useState<'PLAYER' | 'ENEMY' | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState<string>("Loading...");
  
  // Track if it is the first turn of the round (for Foretell mechanic)
  const isFirstTurnRef = useRef<boolean>(true);
  
  // Boss AI Mistake Tracking
  const bossMistakesRef = useRef<number>(0);
  const enemyMatchesInTurn = useRef<number>(0);

  // Run State
  const [enemies, setEnemies] = useState<Entity[]>([]);
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0); // 0, 1, 2 inside a tower
  const [currentTowerLevel, setCurrentTowerLevel] = useState(1);
  
  // Active Item Effects
  const [activeEffects, setActiveEffects] = useState<{
    mercy?: boolean;
    mirror?: boolean;
    enemySkipped?: boolean;
  }>({});
  
  // Boss Mechanics State
  const [burnStacks, setBurnStacks] = useState(0);

  // Game History for Sharing
  const [matchHistory, setMatchHistory] = useState<string[]>([]);
  const [showCopied, setShowCopied] = useState(false);
  
  // Entities
  const [player, setPlayer] = useState<Entity>({ 
    name: 'Hero', 
    maxHp: 12, 
    currentHp: 12, 
    shield: 0, 
    coins: 0,
    visual: '🧙',
    difficulty: 'EASY'
  });
  
  // Derived current enemy
  const enemy = enemies[currentFloorIndex] || { 
    name: 'Loading...', 
    maxHp: 10, 
    currentHp: 10, 
    shield: 0, 
    description: '',
    visual: '❓',
    difficulty: 'EASY',
    bossType: 'NONE'
  };

  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Animations
  const [playerAnim, setPlayerAnim] = useState<string>('');
  const [enemyAnim, setEnemyAnim] = useState<string>('');
  
  // AI Memory & Game Control
  const aiMemory = useRef<Map<number, CardData>>(new Map());
  const aiMistakeMade = useRef(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isGameOverRef = useRef(false);

  // --- Helpers ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(36), message, type }]);
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const triggerAnim = (target: 'PLAYER' | 'ENEMY', anim: string) => {
    if (target === 'PLAYER') {
      setPlayerAnim(anim);
      setTimeout(() => setPlayerAnim(''), 500);
    } else {
      setEnemyAnim(anim);
      setTimeout(() => setEnemyAnim(''), 500);
    }
  };

  const showAnnouncement = (text: string, duration: number = 2000) => {
    setAnnouncement(text);
    setTimeout(() => setAnnouncement(null), duration);
  };

  // --- Game Initialization ---
  const startRun = useCallback(async () => {
    initAudio();
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

    isGameOverRef.current = false;
    aiMistakeMade.current = false;
    setGameState(GameState.LOADING);
    setScreen('GAME');
    
    // Reset Run State
    setCurrentFloorIndex(0);
    setCurrentTowerLevel(1);
    setPlayer({ name: 'Hero', maxHp: 12, currentHp: 12, shield: 0, coins: 0, visual: '🧙', difficulty: 'EASY' });
    setMatchHistory([]);
    setLogs([]);
    setIsShuffling(false);
    setBurnStacks(0);
    setActiveEffects({});
    
    // Generate Level 1 Enemies
    const seed = `${getTodayString()}-tower-1`;
    const towerEnemies = await generateDailyEnemy(seed, 1.0);
    setEnemies(towerEnemies);
    
    startLevel(towerEnemies[0], 0, 1);
  }, []);

  const startLevel = (currentEnemy: Entity, floorIdx: number, towerLvl: number) => {
    isGameOverRef.current = false;
    aiMistakeMade.current = false;
    aiMemory.current.clear();
    setCombo(0);
    setComboOwner(null);
    enemyMatchesInTurn.current = 0;
    setFlippedIndices([]);
    setPlayerAnim('');
    setEnemyAnim('');
    setIsShuffling(false);
    isFirstTurnRef.current = true; // Reset first turn trigger
    setBurnStacks(0); 
    setActiveEffects(prev => ({ ...prev, enemySkipped: false })); // Reset round specific effects
    
    // Reset Boss Mistakes
    if (currentEnemy.difficulty === 'HARD') {
        bossMistakesRef.current = Math.floor(Math.random() * 3) + 1; 
    } else {
        bossMistakesRef.current = 0;
    }
    
    // Generate new deck for the floor
    const seed = `${getTodayString()}-t${towerLvl}-f${floorIdx}`;
    const initialDeck = generateDeck(seed);
    setCards(initialDeck);
    
    setGameState(GameState.PLAYER_TURN);
    addLog(`Tower ${towerLvl} - Floor ${floorIdx + 1}: ${currentEnemy.name} appears!`, 'enemy');
    addLog(currentEnemy.description || "Prepare for battle!", 'info');

    if (currentEnemy.bossType && currentEnemy.bossType !== 'NONE') {
        setTimeout(() => {
            if (currentEnemy.bossType === 'BURN') addLog("Boss Trait: Incorrect matches cause Burn!", 'enemy');
            if (currentEnemy.bossType === 'SLIME') addLog("Boss Trait: Slimes cards to prevent use!", 'enemy');
            if (currentEnemy.bossType === 'CONFUSION') addLog("Boss Trait: Confuses card positions!", 'enemy');
        }, 1000);
    }
  };

  const nextFloor = async () => {
    if (currentFloorIndex < 2) {
       // Standard Floor Progression within Tower
       // Check for merchant: Let's spawn Merchant after Floor 2 (index 1), before Boss (index 2)
       if (currentFloorIndex === 1) {
           setGameState(GameState.MERCHANT);
           return;
       }

       proceedToFloor(currentFloorIndex + 1);
    } else {
       // Tower Complete -> Next Tower
       // Generate new enemies harder
       const nextTower = currentTowerLevel + 1;
       setCurrentTowerLevel(nextTower);
       setCurrentFloorIndex(0);
       
       setGameState(GameState.LOADING);
       const difficultyMult = 1 + (nextTower - 1) * 0.3; // 30% harder per tower
       const newEnemies = await generateDailyEnemy(`${getTodayString()}-tower-${nextTower}`, difficultyMult);
       setEnemies(newEnemies);
       
       proceedToFloor(0, nextTower, newEnemies);
    }
  };

  const proceedToFloor = (floorIdx: number, towerLvl: number = currentTowerLevel, enemyList: Entity[] = enemies) => {
       playSound('ascend');
       setCurrentFloorIndex(floorIdx);
       
       setPlayer(p => {
          if (p.currentHp >= p.maxHp) {
            return { ...p, coins: (p.coins || 0) + 5 };
          } else {
            return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 3) };
          }
       });
       
       startLevel(enemyList[floorIdx], floorIdx, towerLvl);
  };

  // --- ITEM LOGIC ---
  const useItem = (itemId: ItemId) => {
      if (gameState !== GameState.PLAYER_TURN) return;
      
      const itemConfig = ITEMS.find(i => i.id === itemId);
      if (!itemConfig) return;

      playSound('heal'); // Generic item use sound
      addLog(`Used ${itemConfig.name}!`, 'item');

      // Consume item
      setUserProgress(prev => {
          const idx = prev.inventory.indexOf(itemId);
          if (idx > -1) {
              const newInv = [...prev.inventory];
              newInv.splice(idx, 1);
              return { ...prev, inventory: newInv };
          }
          return prev;
      });

      // Apply Effect
      switch(itemId) {
          case 'SPYGLASS':
              // Reveal 3 random
              setCards(prev => {
                  const hidden = prev.filter(c => !c.isFlipped && !c.isMatched);
                  const toReveal = hidden.sort(() => 0.5 - Math.random()).slice(0, 3);
                  const revealIds = toReveal.map(c => c.id);
                  
                  // Reveal briefly
                  setTimeout(() => {
                      setCards(curr => curr.map(c => revealIds.includes(c.id) ? { ...c, isFlipped: false } : c));
                  }, 2000);
                  
                  // Update Memory
                  toReveal.forEach(c => {
                      const idx = prev.findIndex(x => x.id === c.id);
                      if (idx > -1) aiMemory.current.set(idx, c);
                  });

                  return prev.map(c => revealIds.includes(c.id) ? { ...c, isFlipped: true } : c);
              });
              break;
          
          case 'HOURGLASS':
              // Extra turn implies we just don't end turn on miss? Or reset current flow?
              // Simple way: No immediate effect, but notify player.
              // Logic: Actually, we just add a log. The player is ALREADY in their turn. 
              // This is useful if they miss. So we treat it like Mercy? 
              // Prompt said: "Take an extra turn". In a turn-based card game, this usually means "If you miss, you go again". 
              // Let's alias it to Mercy logic for simplicity but maybe visual distinctness.
              setActiveEffects(prev => ({ ...prev, mercy: true })); 
              addLog("Time bends... (Next miss won't end turn)", 'info');
              break;

          case 'EYE_OF_FATE':
              // Highlight a pair
              const pair = findHiddenPair();
              if (pair) {
                  const [i1, i2] = pair;
                  // Flip them up permanently? Or just flash?
                  // Let's flip them up briefly then down
                  setCards(prev => prev.map((c, i) => (i === i1 || i === i2) ? { ...c, isFlipped: true } : c));
                  aiMemory.current.set(i1, cards[i1]);
                  aiMemory.current.set(i2, cards[i2]);
                  setTimeout(() => {
                      setCards(prev => prev.map((c, i) => (i === i1 || i === i2) ? { ...c, isFlipped: false } : c));
                  }, 1500);
              }
              break;

          case 'BANDAGE':
              setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + 5) }));
              break;

          case 'MERCY':
              setActiveEffects(prev => ({ ...prev, mercy: true }));
              break;

          case 'BRAINFOG':
              aiMemory.current.clear();
              addLog(`${enemy.name} looks confused.`, 'info');
              break;

          case 'SLEEP':
              setActiveEffects(prev => ({ ...prev, enemySkipped: true }));
              addLog(`${enemy.name} falls asleep!`, 'info');
              break;

          case 'RITUAL':
              setPlayer(p => ({ ...p, currentHp: Math.max(1, p.currentHp - 4) }));
              // Reveal 4
              setCards(prev => {
                  const hidden = prev.filter(c => !c.isFlipped && !c.isMatched);
                  const toReveal = hidden.sort(() => 0.5 - Math.random()).slice(0, 4);
                  const revealIds = toReveal.map(c => c.id);
                  setTimeout(() => {
                      setCards(curr => curr.map(c => revealIds.includes(c.id) ? { ...c, isFlipped: false } : c));
                  }, 2000);
                  toReveal.forEach(c => {
                    const idx = prev.findIndex(x => x.id === c.id);
                    if (idx > -1) aiMemory.current.set(idx, c);
                  });
                  return prev.map(c => revealIds.includes(c.id) ? { ...c, isFlipped: true } : c);
              });
              break;

          case 'CANDLE':
              // Reveal ALL briefly
              setCards(prev => prev.map(c => (!c.isMatched ? { ...c, isFlipped: true } : c)));
              setTimeout(() => {
                  setCards(prev => prev.map(c => (!c.isMatched ? { ...c, isFlipped: false } : c)));
                  // Shuffle one pair logic... simplified: just shuffle whole board that isn't matched
                  // Implementing true "shuffle one pair" is complex with state. 
                  // Let's stick to Reveal All for 2s.
              }, 2000);
              break;

          case 'TRICKSTER':
              setCards(prev => {
                  const hidden = prev.filter(c => !c.isMatched && !c.isWildcard);
                  if (hidden.length > 0) {
                      const randomIdx = Math.floor(Math.random() * hidden.length);
                      const targetId = hidden[randomIdx].id;
                      return prev.map(c => c.id === targetId ? { ...c, isWildcard: true, isFlipped: true } : c);
                  }
                  return prev;
              });
              break;

          case 'MIRROR':
              setActiveEffects(prev => ({ ...prev, mirror: true }));
              break;
      }
  };
  
  const findHiddenPair = (): [number, number] | null => {
      const hidden = cards.map((c, i) => ({ ...c, idx: i })).filter(c => !c.isMatched && !c.isFlipped);
      const map = new Map<CardEffect, number>();
      for (const c of hidden) {
          if (map.has(c.effect)) {
              return [map.get(c.effect)!, c.idx];
          }
          map.set(c.effect, c.idx);
      }
      return null;
  };

  // Scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // --- Reshuffle Logic ---
  const reshuffleDeck = useCallback((currentTurnState: GameState) => {
    if (isGameOverRef.current) return;
    addLog("Board reshuffling...", 'info');
    playSound('flip');
    
    setIsShuffling(true);

    setTimeout(() => {
        let deckEffects: CardEffect[] = [];
        DECK_COMPOSITION.forEach(effect => {
        deckEffects.push(effect);
        deckEffects.push(effect);
        });

        for (let i = deckEffects.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckEffects[i], deckEffects[j]] = [deckEffects[j], deckEffects[i]];
        }

        const newCards = deckEffects.map((effect, index) => ({
        id: `card-round-${Date.now()}-${index}`,
        effect,
        isFlipped: false,
        isMatched: false,
        isSlimed: false,
        isWildcard: false
        }));
        
        setCards(newCards);
        setFlippedIndices([]);
        aiMemory.current.clear();
        setIsShuffling(false);
        isFirstTurnRef.current = true;
        enemyMatchesInTurn.current = 0;

        if (currentTurnState === GameState.ENEMY_ACTING || currentTurnState === GameState.ENEMY_THINKING) {
           setGameState(GameState.ENEMY_THINKING); 
           addLog(`${enemy.name} prepares to continue...`, 'enemy');
        } else {
           setGameState(GameState.PLAYER_TURN);
           addLog("Your turn!", 'info');
        }
    }, 450); 
  }, [enemy.name]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      if (enemy.currentHp > 0 && player.currentHp > 0) {
        const timer = setTimeout(() => {
          reshuffleDeck(gameState);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [cards, enemy.currentHp, player.currentHp, reshuffleDeck, gameState]);

  // --- Combat Logic ---
  const applyEffect = (effect: CardEffect, source: 'PLAYER' | 'ENEMY', currentCombo: number) => {
    const config = EFFECT_CONFIG[effect];
    let value = config.value;
    
    // Apply Combo Multiplier
    if (currentCombo > 0) {
      value = Math.floor(value * (1 + currentCombo * 0.5));
    }
    
    // Apply Mirror (Player only)
    if (source === 'PLAYER' && activeEffects.mirror) {
        value *= 2;
        addLog("Mirror doubles the effect!", 'item');
        setActiveEffects(prev => ({ ...prev, mirror: false }));
    }

    const isPlayerSource = source === 'PLAYER';
    
    if (isPlayerSource) {
      let emoji = '⬜';
      if (effect.includes('ATTACK')) emoji = '⚔️';
      else if (effect.includes('HEAL')) emoji = '💚';
      else if (effect.includes('SHIELD')) emoji = '🛡️';
      else if (effect.includes('COIN')) emoji = '🪙';
      setMatchHistory(prev => [...prev, emoji]);
    } else {
      if (effect.includes('ATTACK')) setMatchHistory(prev => [...prev, '🩸']);
    }

    if (effect.includes('ATTACK')) {
       playSound('attack');
       if (isPlayerSource) {
         triggerAnim('PLAYER', 'anim-attack-up');
         setTimeout(() => triggerAnim('ENEMY', 'anim-damage'), 150);
       } else {
         triggerAnim('ENEMY', 'anim-attack-down');
         setTimeout(() => triggerAnim('PLAYER', 'anim-damage'), 150);
       }
    } else if (effect.includes('HEAL') || effect.includes('SHIELD') || effect.includes('COIN')) {
       playSound(effect.includes('COIN') ? 'coin' : effect.includes('SHIELD') ? 'shield' : 'heal');
       triggerAnim(isPlayerSource ? 'PLAYER' : 'ENEMY', 'anim-heal');
    }

    const damageEntity = (target: Entity, amount: number): Entity => {
      let dmg = amount;
      let newShield = target.shield;
      if (newShield > 0) {
        if (newShield >= dmg) {
          newShield -= dmg;
          dmg = 0;
        } else {
          dmg -= newShield;
          newShield = 0;
        }
      }
      return { ...target, currentHp: Math.max(0, target.currentHp - dmg), shield: newShield };
    };

    const comboText = currentCombo > 0 ? ` (Combo x${1 + currentCombo * 0.5}!)` : '';

    if (effect.includes('ATTACK')) {
      if (isPlayerSource) {
        setEnemies(prev => {
          const newEnemies = [...prev];
          newEnemies[currentFloorIndex] = damageEntity(newEnemies[currentFloorIndex], value);
          return newEnemies;
        });
        addLog(`Player attacks for ${value} damage!${comboText}`, 'player');
      } else {
        setPlayer(prev => damageEntity(prev, value));
        addLog(`${enemy.name} attacks you for ${value} damage!${comboText}`, 'enemy');
      }
    } 
    else if (effect.includes('HEAL')) {
      if (isPlayerSource) {
        setPlayer(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + value) }));
        addLog(`Player heals for ${value} HP.${comboText}`, 'heal');
      } else {
        setEnemies(prev => {
          const newEnemies = [...prev];
          newEnemies[currentFloorIndex] = { ...newEnemies[currentFloorIndex], currentHp: Math.min(newEnemies[currentFloorIndex].maxHp, newEnemies[currentFloorIndex].currentHp + value) };
          return newEnemies;
        });
        addLog(`${enemy.name} heals for ${value} HP.${comboText}`, 'enemy');
      }
    }
    else if (effect.includes('SHIELD')) {
      if (isPlayerSource) {
        setPlayer(prev => ({ ...prev, shield: prev.shield + value }));
        addLog(`Player gains ${value} Shield.${comboText}`, 'player');
      } else {
        setEnemies(prev => {
          const newEnemies = [...prev];
          newEnemies[currentFloorIndex] = { ...newEnemies[currentFloorIndex], shield: newEnemies[currentFloorIndex].shield + value };
          return newEnemies;
        });
        addLog(`${enemy.name} raises a shield (${value}).${comboText}`, 'enemy');
      }
    }
    else if (effect.includes('COIN')) {
      if (isPlayerSource) {
        setPlayer(prev => ({ ...prev, coins: (prev.coins || 0) + value }));
        addLog(`Player found ${value} coins!${comboText}`, 'info');
      } else {
        addLog(`${enemy.name} finds some gold.${comboText}`, 'info');
      }
    }
  };

  // --- Interaction Logic ---
  const handleCardClick = (clickedCard: CardData) => {
    if (gameState !== GameState.PLAYER_TURN || flippedIndices.length >= 2 || isGameOverRef.current || isShuffling) return;

    const realIndex = cards.findIndex(c => c.id === clickedCard.id);
    if (realIndex === -1) return;
    if (clickedCard.isSlimed) return;

    playSound('tap');
    setTimeout(() => {
        playSound('flip');
        const newCards = [...cards];
        newCards[realIndex].isFlipped = true;
        setCards(newCards);
        
        const newFlipped = [...flippedIndices, realIndex];
        setFlippedIndices(newFlipped);

        aiMemory.current.set(realIndex, clickedCard);

        if (newFlipped.length === 2) {
            const card1 = newCards[newFlipped[0]];
            const card2 = newCards[newFlipped[1]];

            // Check for Wildcards
            const isMatch = card1.effect === card2.effect || card1.isWildcard || card2.isWildcard;

            if (isMatch) {
                // Determine effect to apply (Non-wildcard effect takes precedence)
                let effectToApply = card1.effect;
                if (card1.isWildcard && !card2.isWildcard) effectToApply = card2.effect;
                // If both wildcard, default to something? Or just Attack Small? 
                // Let's say if both wildcard, they trigger Attack Medium.
                if (card1.isWildcard && card2.isWildcard) effectToApply = CardEffect.ATTACK_MEDIUM;

                setTimeout(() => {
                    handleMatch(newFlipped[0], newFlipped[1], effectToApply, 'PLAYER');
                }, 500);
            } else {
                // NO MATCH
                isFirstTurnRef.current = false; 
                
                if (enemy.bossType === 'BURN') {
                    setBurnStacks(prev => prev + 2);
                }

                setTimeout(() => {
                    unflipCards(newFlipped);
                    
                    // Check Mercy / Hourglass
                    if (activeEffects.mercy) {
                        addLog("Mercy saved your turn!", 'item');
                        setActiveEffects(prev => ({ ...prev, mercy: false }));
                        setCombo(0); // Still break combo? Yes.
                    } else {
                        // End turn
                        setCombo(0); 
                        setComboOwner(null);
                        processEndOfPlayerTurn();
                        
                        if (activeEffects.enemySkipped) {
                            addLog("Enemy is asleep. Your turn!", 'item');
                            setActiveEffects(prev => ({ ...prev, enemySkipped: false }));
                            setGameState(GameState.PLAYER_TURN);
                        } else {
                            setGameState(GameState.ENEMY_THINKING);
                        }
                    }
                }, 1000);
            }
        }
    }, 50);
  };

  const processEndOfPlayerTurn = () => {
     if (burnStacks > 0) {
         setTimeout(() => {
             playSound('attack'); 
             setPlayer(prev => {
                 let dmg = 1;
                 let newShield = prev.shield;
                 if (newShield > 0) {
                     newShield -= dmg;
                     dmg = 0;
                 }
                 return { ...prev, currentHp: Math.max(0, prev.currentHp - dmg), shield: newShield };
             });
             triggerAnim('PLAYER', 'anim-damage');
             addLog(`Burn deals 1 damage! (${burnStacks} stacks left)`, 'enemy');
             setBurnStacks(prev => Math.max(0, prev - 1));
         }, 300);
     }
  };

  const handleMatch = (idx1: number, idx2: number, effect: CardEffect, who: 'PLAYER' | 'ENEMY') => {
    if (isGameOverRef.current) return;

    setCards(prev => {
      const c = [...prev];
      if (c[idx1]) c[idx1].isMatched = true;
      if (c[idx2]) c[idx2].isMatched = true;
      return c;
    });
    setFlippedIndices([]);
    setComboOwner(who);

    if (who === 'ENEMY') {
        enemyMatchesInTurn.current += 1;
    } else {
        enemyMatchesInTurn.current = 0;
    }

    if (combo > 0) {
        let text = "COMBO!";
        if (combo === 2) text = "SUPER COMBO!";
        if (combo === 3) text = "MEGA COMBO!";
        if (combo >= 4) text = "ULTRA COMBO!";
        addLog(text, 'info'); 
        setTimeout(() => playSound('combo'), 100);
    }

    if (who === 'PLAYER') {
      playSound('match');
      if (isFirstTurnRef.current) {
         // triggerForetell(); // Optional: Re-enable if desired for Foretell
         isFirstTurnRef.current = false;
      }
    } else {
      playSound('enemy_match');
    }

    applyEffect(effect, who, combo);
    setCombo(prev => prev + 1);
    
    aiMemory.current.delete(idx1);
    aiMemory.current.delete(idx2);

    if (who === 'ENEMY') {
       setTimeout(() => executeAiTurn(), 1000); 
    }
  };

  const unflipCards = (indices: number[]) => {
    playSound('flip');
    setCards(prev => {
      const c = [...prev];
      indices.forEach(i => {
        if (c[i]) c[i].isFlipped = false;
      });
      return c;
    });
    setFlippedIndices([]);
  };

  // --- End Game Checks ---
  useEffect(() => {
    if (gameState === GameState.VICTORY || gameState === GameState.DEFEAT || gameState === GameState.LEVEL_COMPLETE || gameState === GameState.MERCHANT) return;

    if (player.currentHp <= 0) {
      setGameState(GameState.DEFEAT);
      playSound('defeat');
      isGameOverRef.current = true;
      return;
    }
    
    if (enemy && enemy.currentHp <= 0) {
      isGameOverRef.current = true;
      
      setUserProgress(prev => {
           const newCoins = prev.coins + (player.coins || 0);
           const knownEnemy = prev.bestiary.find(e => e.name === enemy.name);
           let newBestiary = [...prev.bestiary];
           if (!knownEnemy) {
             newBestiary.push({ ...enemy, dateEncountered: getTodayString() });
           }
           
           // Update Max Tower Record
           const newMaxTower = Math.max(prev.towerLevel || 1, currentTowerLevel);

           return { ...prev, coins: newCoins, bestiary: newBestiary, towerLevel: newMaxTower };
      });

      if (currentFloorIndex === 2) {
         // Tower Cleared (Boss Defeated)
         setGameState(GameState.VICTORY); // This will now show TowerCompleteScreen
         playSound('victory');
      } else {
         setGameState(GameState.LEVEL_COMPLETE);
         playSound('victory'); 
      }
      return;
    }

    if (gameState === GameState.ENEMY_THINKING) {
      const aiTimeout = setTimeout(() => {
        executeAiTurn();
      }, 1500);
      return () => clearTimeout(aiTimeout);
    }
  }, [player.currentHp, enemy?.currentHp, gameState, currentFloorIndex, currentTowerLevel]);

  // --- AI Logic ---
  const flipCardAI = (index: number): Promise<CardData> => {
    return new Promise((resolve) => {
      setCards(prev => {
        const newCards = [...prev];
        if (newCards[index]) {
          newCards[index].isFlipped = true;
        }
        return newCards;
      });
      setFlippedIndices(prev => [...prev, index]);
      resolve(cards[index]);
    });
  };

  const executeAiTurn = () => {
    if (isGameOverRef.current || player.currentHp <= 0 || enemy.currentHp <= 0) return;

    setGameState(GameState.ENEMY_ACTING);
    const memory = aiMemory.current;
    
    let mistakeChance = 0.0;
    let forgetChance = 0.0;
    let guaranteedMistake = false;

    switch (enemy.difficulty) {
        case 'EASY': 
            mistakeChance = 0.6; forgetChance = 0.5; guaranteedMistake = true; break;
        case 'MEDIUM':
            mistakeChance = 0.3; forgetChance = 0.3; guaranteedMistake = true; break;
        case 'HARD':
            mistakeChance = 0.6; forgetChance = 0.4; guaranteedMistake = true; break;
    }
    
    let matchFound: [number, number] | null = null;
    const seenEffects = new Map<CardEffect, number>();
    
    // Scan memory for pairs
    for (const [idx, card] of memory.entries()) {
      if (cards[idx] && cards[idx].isMatched) continue;
      // Skip wildcard logic for AI simplicity for now, they treat wildcards as unknown unless lucky
      if (card.isWildcard) continue;

      if (seenEffects.has(card.effect)) {
        matchFound = [seenEffects.get(card.effect)!, idx];
        break;
      }
      seenEffects.set(card.effect, idx);
    }

    const forceStreakEnd = enemyMatchesInTurn.current >= 2;
    if (forceStreakEnd && matchFound) {
       addLog(`${enemy.name} gets greedy...`, 'info'); 
       matchFound = null; 
    }

    const cardsInPlay = cards.filter(c => !c.isMatched).length;
    if (enemy.difficulty === 'HARD' && cardsInPlay > 4 && bossMistakesRef.current > 0 && matchFound && !forceStreakEnd) {
        matchFound = null;
        bossMistakesRef.current--;
        addLog(`${enemy.name} gets distracted...`, 'info');
    }

    if (matchFound) {
       let forceError = false;
       if (guaranteedMistake && !aiMistakeMade.current) {
          forceError = true;
          aiMistakeMade.current = true;
       }
       if (forceError || Math.random() < forgetChance) {
          matchFound = null; 
       }
    }

    const availableIndices = cards.map((c, i) => (c.isMatched ? -1 : i)).filter(i => i !== -1);
    if (availableIndices.length === 0) return;

    let firstIdx: number;
    let secondIdx: number;

    if (matchFound) {
      [firstIdx, secondIdx] = matchFound;
    } else {
      const unknownIndices = availableIndices.filter(i => !memory.has(i));
      firstIdx = unknownIndices.length > 0 ? unknownIndices[Math.floor(Math.random() * unknownIndices.length)] : availableIndices[Math.floor(Math.random() * availableIndices.length)];
    }

    flipCardAI(firstIdx).then((card1) => {
       if (isGameOverRef.current) return;
       playSound('flip');
       aiMemory.current.set(firstIdx, card1);

       if (!matchFound) {
          // Check for pair in memory with revealed card
          let pairInMem = -1;
          if (!card1.isWildcard) {
              for (const [idx, mCard] of memory.entries()) {
                 if (idx !== firstIdx && !mCard.isMatched && mCard.effect === card1.effect) {
                    pairInMem = idx;
                    break;
                 }
              }
          }

          if (pairInMem !== -1) {
             let forceError = false;
             if (guaranteedMistake && !aiMistakeMade.current) {
                 forceError = true;
                 aiMistakeMade.current = true;
             }
             if (forceStreakEnd || forceError || Math.random() < mistakeChance) {
                 const validSeconds = availableIndices.filter(i => i !== firstIdx && i !== pairInMem);
                 secondIdx = validSeconds.length > 0 ? validSeconds[Math.floor(Math.random() * validSeconds.length)] : pairInMem;
             } else {
                 secondIdx = pairInMem;
                 addLog(`${enemy.name} sneers...`, 'enemy');
             }
          } else {
             const validSeconds = availableIndices.filter(i => i !== firstIdx);
             secondIdx = validSeconds[Math.floor(Math.random() * validSeconds.length)];
          }
       }

       setTimeout(() => {
         if (isGameOverRef.current) return;
         flipCardAI(secondIdx).then((card2) => {
            playSound('flip');
            aiMemory.current.set(secondIdx, card2);
            
            const isMatch = card1.effect === card2.effect || card1.isWildcard || card2.isWildcard;

            if (isMatch) {
               let effect = card1.isWildcard && !card2.isWildcard ? card2.effect : card1.effect;
               if (card1.isWildcard && card2.isWildcard) effect = CardEffect.ATTACK_MEDIUM;
               
               setTimeout(() => handleMatch(firstIdx, secondIdx, effect, 'ENEMY'), 800);
            } else {
               setTimeout(() => {
                 unflipCards([firstIdx, secondIdx]);
                 setCombo(0); 
                 setComboOwner(null);
                 
                 // Boss Specials
                 if (enemy.bossType === 'SLIME') {
                     setCards(curr => {
                        const nextCards = curr.map(c => ({ ...c, isSlimed: false }));
                        const available = nextCards.map((c, i) => !c.isMatched ? i : -1).filter(i => i !== -1);
                        const shuffled = available.sort(() => 0.5 - Math.random());
                        const toSlime = shuffled.slice(0, 2);
                        if (toSlime.length > 0) {
                            toSlime.forEach(i => nextCards[i].isSlimed = true);
                            addLog(`${enemy.name} slimes 2 cards!`, 'enemy');
                            triggerAnim('ENEMY', 'anim-attack-down'); 
                        }
                        return nextCards;
                     });
                 }
                 if (enemy.bossType === 'CONFUSION') {
                     setCards(curr => {
                        const available = curr.map((c, i) => !c.isMatched && !c.isFlipped ? i : -1).filter(i => i !== -1);
                        if (available.length >= 2) {
                             const idx1 = available[Math.floor(Math.random() * available.length)];
                             let idx2 = available[Math.floor(Math.random() * available.length)];
                             while (idx2 === idx1 && available.length > 1) idx2 = available[Math.floor(Math.random() * available.length)];
                             if (idx1 !== idx2) {
                                 const nextCards = [...curr];
                                 const temp = { ...nextCards[idx1] };
                                 nextCards[idx1] = { ...nextCards[idx2], id: nextCards[idx1].id }; 
                                 nextCards[idx2] = { ...temp, id: nextCards[idx2].id }; 
                                 addLog("Confusion! Two cards swapped.", 'enemy');
                                 playSound('flip');
                                 return nextCards;
                             }
                        }
                        return curr;
                     });
                 }
                 setGameState(GameState.PLAYER_TURN);
               }, 1000);
            }
         });
       }, 800);
    });
  };

  const shareResult = async () => {
    const status = gameState === GameState.VICTORY ? `🏆 Tower ${currentTowerLevel} Conquered` : `💀 Died Tower ${currentTowerLevel} Floor ${currentFloorIndex + 1}`;
    const moves = matchHistory.join('');
    const text = `Towerflip 🏰\n${new Date().toDateString()}\n${status}\n${moves}\n\nPlay now!`;
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  // --- RENDERERS ---

  const renderStore = () => {
    const handleBuyTheme = (theme: CardTheme) => {
      if (userProgress.coins >= theme.price) {
        playSound('coin');
        setUserProgress(prev => ({
          ...prev,
          coins: prev.coins - theme.price,
          unlockedThemes: [...prev.unlockedThemes, theme.id],
          selectedThemeId: theme.id 
        }));
      } else {
        playSound('tap');
      }
    };

    const handleSelectTheme = (id: string) => {
      playSound('tap');
      setUserProgress(prev => ({ ...prev, selectedThemeId: id }));
    };

    return (
      <div className="min-h-screen w-full p-6 flex flex-col items-center relative overflow-hidden">
        <StarBackground />
        
        <header className="w-full max-w-4xl flex items-center justify-between mb-8 relative z-10">
          <button onClick={() => setScreen('MENU')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 shadow-lg">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-amber-100 font-mono">{userProgress.coins}</span>
          </div>
        </header>

        <div className="relative z-10 text-center mb-8">
            <h1 className="text-4xl font-bold font-serif mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-100">Merchant's Wares</h1>
            <p className="text-slate-400 font-serif italic">Unlock new card styles.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl relative z-10 pb-10">
           {CARD_THEMES.map(theme => {
             const isUnlocked = userProgress.unlockedThemes.includes(theme.id);
             const isSelected = userProgress.selectedThemeId === theme.id;
             
             return (
               <div key={theme.id} className={`relative group p-6 rounded-lg border transition-all duration-300 ${isSelected ? 'bg-indigo-950/60 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'} backdrop-blur-sm flex flex-col items-center gap-4 overflow-hidden`}>
                  
                  {/* Preview */}
                  <div className={`w-32 h-44 rounded-lg border-2 shadow-xl ${theme.bgClass} flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-105 perspective-1000`}>
                     <div className={`w-10 h-10 rounded-full ${theme.decorClass} flex items-center justify-center`}>
                        <div className="w-2 h-2 rounded-full bg-white/30" />
                     </div>
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                     
                     {isSelected && (
                       <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg text-black border border-white/20">
                         <Check className="w-4 h-4 stroke-[3]" />
                       </div>
                     )}
                  </div>

                  <div className="text-center w-full">
                    <h3 className="font-bold text-lg text-slate-200">{theme.name}</h3>
                    <p className="text-xs text-slate-500 h-8 line-clamp-2 px-4">{theme.description}</p>
                  </div>

                  <div className="w-full mt-2">
                    {isUnlocked ? (
                      <button 
                        onClick={() => handleSelectTheme(theme.id)}
                        disabled={isSelected}
                        className={`w-full py-3 rounded font-bold text-xs uppercase tracking-widest transition-colors ${isSelected ? 'bg-indigo-500/20 text-indigo-300 cursor-default border border-indigo-500/20' : 'bg-slate-800 hover:bg-indigo-900 text-slate-300 hover:text-white border border-slate-700'}`}
                      >
                        {isSelected ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                       <button 
                         onClick={() => handleBuyTheme(theme)}
                         className={`w-full py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${userProgress.coins >= theme.price ? 'bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700 shadow-lg' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
                         disabled={userProgress.coins < theme.price}
                       >
                         {userProgress.coins < theme.price && <Lock className="w-3 h-3" />}
                         {theme.price} <Coins className="w-3 h-3" />
                       </button>
                    )}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderBestiary = () => {
    return (
      <div className="min-h-screen w-full p-6 flex flex-col items-center relative overflow-hidden">
        <StarBackground />
        
        <header className="w-full max-w-4xl flex items-center justify-between mb-8 relative z-10">
          <button onClick={() => setScreen('MENU')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
          </button>
        </header>

        <div className="flex flex-col items-center gap-2 mb-10 relative z-10 text-center">
           <h1 className="text-4xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-fuchsia-200">Bestiary</h1>
           <p className="text-slate-400 font-serif italic">Monsters you have vanquished.</p>
           <div className="text-[10px] uppercase tracking-widest font-bold bg-slate-900/80 px-4 py-1.5 rounded-full text-slate-400 border border-slate-700 mt-2">
             {userProgress.bestiary.length} Recorded
           </div>
        </div>

        {userProgress.bestiary.length === 0 ? (
          <div className="relative z-10 flex flex-col items-center justify-center gap-6 py-20 text-slate-600">
             <div className="w-24 h-24 rounded-full bg-slate-900/50 flex items-center justify-center border-2 border-slate-800 border-dashed">
                <BookOpen className="w-10 h-10 opacity-20" />
             </div>
             <p className="font-serif italic">The pages are empty... for now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl relative z-10 pb-20">
             {userProgress.bestiary.map((creature, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg flex items-start gap-4 hover:border-indigo-500/50 transition-colors backdrop-blur-sm group">
                   <div className="w-14 h-14 flex-none bg-black/40 rounded border border-slate-700 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      {creature.visual}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <h3 className="font-bold text-indigo-200 truncate pr-2">{creature.name}</h3>
                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${creature.difficulty === 'HARD' ? 'bg-red-950/50 text-red-400 border-red-900/50' : creature.difficulty === 'MEDIUM' ? 'bg-orange-950/50 text-orange-400 border-orange-900/50' : 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'}`}>
                           {creature.difficulty}
                         </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic leading-relaxed">"{creature.description}"</p>
                      
                      <div className="mt-3 flex items-center gap-2">
                         {creature.bossType && creature.bossType !== 'NONE' && (
                             <span className="text-[9px] font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1">
                                <Skull className="w-3 h-3" /> {creature.bossType} Boss
                             </span>
                         )}
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                         <span>Max HP: {creature.maxHp}</span>
                         <span>{creature.dateEncountered}</span>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  const renderGame = () => {
    const activeTheme = CARD_THEMES.find(t => t.id === userProgress.selectedThemeId) || CARD_THEMES[0];
    const isPlayerTurn = gameState === GameState.PLAYER_TURN;
    const isEnemyTurn = gameState === GameState.ENEMY_THINKING || gameState === GameState.ENEMY_ACTING;

    if (gameState === GameState.LOADING) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white relative z-10">
          <div className="flex flex-col items-center gap-8">
            <div className="relative w-32 h-32 flex items-center justify-center animate-orbit">
               <div className="loader-card" style={{ transform: 'translateY(-40px)' }}></div>
               <div className="loader-card" style={{ transform: 'rotate(120deg) translateY(-40px)' }}></div>
               <div className="loader-card" style={{ transform: 'rotate(240deg) translateY(-40px)' }}></div>
            </div>
            <p className="text-sm font-serif italic text-slate-400 animate-pulse tracking-widest uppercase">{loadingPhrase}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen text-slate-100 font-sans flex flex-col md:flex-row max-w-7xl mx-auto relative overflow-hidden z-10">
        
        {announcement && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                 <div className="animate-pop text-6xl md:text-8xl font-bold text-white font-serif tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] flex flex-col items-center gap-2">
                    <span>{announcement}</span>
                    <Eye className="w-12 h-12 text-indigo-400 animate-pulse" />
                 </div>
            </div>
        )}

        {/* MERCHANT OVERLAY */}
        {gameState === GameState.MERCHANT && (
            <Merchant 
               coins={player.coins || 0}
               onLeave={() => {
                   proceedToFloor(currentFloorIndex + 1); // Move to Boss
               }}
               spendCoins={(amt) => setPlayer(p => ({ ...p, coins: (p.coins || 0) - amt }))}
               addItem={(id) => setUserProgress(prev => ({ ...prev, inventory: [...prev.inventory, id] }))}
            />
        )}

        {/* LEFT PANEL */}
        <div className="w-full md:w-80 lg:w-96 flex-none md:flex-initial max-h-[40vh] md:max-h-full p-2 md:p-4 flex flex-col border-b md:border-b-0 md:border-r border-slate-900 bg-slate-900 z-30 shadow-2xl overflow-hidden">
          <header className="flex flex-row justify-between items-center mb-2">
             <div className="flex flex-col">
               <div className="flex items-center gap-1 mb-1">
                 {/* Visual progress for 3 floors: 0, 1, 2 */}
                 {[0, 1, 2].map(i => (
                   <div key={i} className={`h-1.5 w-6 rounded-sm transition-all ${currentFloorIndex === i ? 'bg-indigo-600 shadow-lg shadow-indigo-900/50' : currentFloorIndex > i ? 'bg-emerald-900' : 'bg-slate-800'}`} />
                 ))}
               </div>
               <span className="text-[10px] text-slate-500 font-serif italic tracking-wider">Tower {currentTowerLevel} - Floor {currentFloorIndex + 1}</span>
             </div>
             <button onClick={() => setScreen('MENU')} className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-white px-2 py-1 bg-slate-900 border border-slate-800 rounded-sm">Exit</button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-4 mb-2 md:mb-4 flex-none">
            {/* ENEMY */}
            <div className={`col-span-1 p-2 md:p-4 rounded-sm border shadow-lg ${enemyAnim} transition-all duration-300 relative overflow-hidden ${isEnemyTurn ? 'bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50' : 'bg-slate-900/50 border-red-900/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-black/40 flex items-center justify-center border border-red-900/30 overflow-hidden text-2xl md:text-3xl">{enemy.visual}</div>
                <div className="overflow-hidden">
                  <h2 className="font-bold text-xs md:text-sm leading-none truncate font-serif text-slate-300">{enemy.name}</h2>
                  <div className="flex items-center gap-2">
                     <p className="text-[10px] text-slate-600 uppercase tracking-widest">{enemy.difficulty}</p>
                     {enemy.bossType && enemy.bossType !== 'NONE' && (
                        <div className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border flex items-center gap-1
                            ${enemy.bossType === 'BURN' ? 'bg-orange-950 text-orange-400 border-orange-900' : 
                              enemy.bossType === 'SLIME' ? 'bg-lime-950 text-lime-400 border-lime-900' :
                              'bg-fuchsia-950 text-fuchsia-400 border-fuchsia-900'}
                        `}>
                            {enemy.bossType === 'BURN' && <Flame className="w-2 h-2" />}
                            {enemy.bossType === 'SLIME' && <Droplets className="w-2 h-2" />}
                            {enemy.bossType === 'CONFUSION' && <Shuffle className="w-2 h-2" />}
                            {enemy.bossType}
                        </div>
                     )}
                  </div>
                </div>
              </div>
              <HealthBar current={enemy.currentHp} max={enemy.maxHp} shield={enemy.shield} label="ENEMY" isEnemy />
            </div>

            {/* PLAYER */}
            <div className={`col-span-1 p-2 md:p-4 rounded-sm border shadow-lg relative overflow-hidden ${playerAnim} transition-all duration-300 ${isPlayerTurn ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50' : 'bg-slate-900/50 border-indigo-900/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-black/40 flex items-center justify-center border border-indigo-900/30 text-2xl md:text-3xl">{player.visual}</div>
                <div className="flex-1 overflow-hidden">
                  <h2 className="font-bold text-xs md:text-sm leading-none truncate font-serif text-slate-300">{player.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                     <div className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-700" /><span className="text-[10px] text-amber-600 font-mono">+{player.coins}</span></div>
                     {burnStacks > 0 && (
                        <div className="flex items-center gap-1 bg-orange-950/50 px-1 rounded border border-orange-900/50 animate-pulse">
                            <Flame className="w-3 h-3 text-orange-500" /><span className="text-[10px] text-orange-400 font-bold">{burnStacks}</span>
                        </div>
                     )}
                  </div>
                </div>
              </div>
              <HealthBar current={player.currentHp} max={player.maxHp} shield={player.shield} label="PLAYER" />
              
              {/* Inventory Bar */}
              {userProgress.inventory.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 overflow-x-auto">
                      <div className="flex gap-2">
                          {userProgress.inventory.map((itemId, idx) => {
                              const item = ITEMS.find(i => i.id === itemId);
                              if(!item) return null;
                              return (
                                  <button 
                                    key={`${itemId}-${idx}`}
                                    onClick={() => useItem(itemId)}
                                    disabled={!isPlayerTurn}
                                    title={item.name + ": " + item.description}
                                    className={`w-8 h-8 flex-none rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 hover:border-indigo-500 transition-colors ${!isPlayerTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                      {item.icon}
                                  </button>
                              )
                          })}
                      </div>
                  </div>
              )}
            </div>
          </div>

          <div className="flex-none h-14 md:min-h-0 md:flex-1 bg-slate-950/50 rounded-sm border border-slate-900 p-2 md:p-3 overflow-hidden flex flex-col relative">
            <div 
              ref={logContainerRef}
              className="overflow-y-auto flex-1 pr-2 space-y-1 md:space-y-2 text-[10px] md:text-xs font-mono scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.length === 0 && <span className="text-slate-700 italic font-serif">Battle started.</span>}
              {logs.map((log) => (
                <div key={log.id} className={`
                  ${log.message.includes('COMBO') ? 'text-amber-500 font-black text-xs md:text-sm animate-pulse uppercase tracking-wider drop-shadow-md' : 
                    log.type === 'enemy' ? 'text-red-900/80' : 
                    log.type === 'player' ? 'text-slate-400' : 
                    log.type === 'heal' ? 'text-emerald-900' : 
                    log.type === 'burn' ? 'text-orange-600 font-bold' : 
                    log.type === 'item' ? 'text-indigo-400 font-bold italic' : 'text-slate-600'}
                `}>
                  <span className="opacity-30 text-[10px] mr-1">{'>'}</span>{log.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: BOARD */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-hidden z-10">
          <div className="grid grid-cols-4 gap-3 w-full max-w-[min(90vw,50vh)] aspect-square mx-auto">
            {cards.map((card, idx) => (
              <Card key={card.id} card={card} index={idx} isExitAnimating={isShuffling} onClick={handleCardClick} disabled={gameState !== GameState.PLAYER_TURN} theme={activeTheme} combo={combo} />
            ))}
          </div>

          {(gameState === GameState.VICTORY || gameState === GameState.DEFEAT || gameState === GameState.LEVEL_COMPLETE) && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               {gameState === GameState.VICTORY ? (
                   <>
                   <SolitaireCelebration theme={activeTheme} />
                   <TowerCompleteScreen 
                      onContinue={nextFloor} 
                      towerLevel={currentTowerLevel} 
                      onShare={shareResult} 
                      showCopied={showCopied} 
                   />
                   </>
               ) : (
                   <div className="bg-slate-950 border border-slate-800 p-0 rounded-sm shadow-2xl max-w-sm w-full text-center transform transition-all animate-[fadeIn_0.5s_ease-out] overflow-hidden">
                      {gameState === GameState.LEVEL_COMPLETE && (
                         <TowerLevelTransition currentFloor={currentFloorIndex} towerLevel={currentTowerLevel} onNext={nextFloor} />
                      )}
                      {gameState === GameState.DEFEAT && (
                        <div className="p-8 flex flex-col items-center gap-4">
                          <Skull className="w-16 h-16 text-red-900 animate-pulse" />
                          <h2 className="text-3xl font-bold font-serif text-slate-200">Defeat</h2>
                          <p className="text-slate-500 font-serif italic">The Tower claims another soul.</p>
                          <div className="flex gap-2 mt-4 w-full">
                             <button onClick={shareResult} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-sm flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                                {showCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Share2 className="w-3 h-3" /> Share</>}
                             </button>
                             <button onClick={() => setScreen('MENU')} className="flex-1 py-3 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-900 text-indigo-300 font-bold rounded-sm uppercase tracking-widest text-[10px]">
                                Return
                             </button>
                          </div>
                        </div>
                      )}
                   </div>
               )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-900 overflow-hidden">
      {screen === 'MENU' && <Menu userProgress={userProgress} setUserProgress={setUserProgress} setScreen={setScreen} startRun={startRun} />}
      {screen === 'STORE' && renderStore()}
      {screen === 'BESTIARY' && renderBestiary()}
      {screen === 'GAME' && renderGame()}
    </div>
  );
};

export default App;
