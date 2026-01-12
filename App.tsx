
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coins, Skull, RefreshCw, Trophy, ShieldAlert, Zap, ShoppingBag, BookOpen, ArrowLeft, Check, Lock, Flame, Sword, Share2, ArrowUpCircle, RectangleVertical, Heart, Eye, Clock, Castle, Star } from 'lucide-react';
import Card from './components/Card';
import HealthBar from './components/HealthBar';
import { CardData, CardEffect, Entity, GameState, LogEntry, Screen, UserProgress, CardTheme } from './types';
import { generateDeck, EFFECT_CONFIG, DECK_COMPOSITION, CARD_THEMES, GAME_VERSION } from './constants';
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
                   <Star className="w-3 h-3 text-indigo-400" /> The Daily Tower awaits <Star className="w-3 h-3 text-indigo-400" />
                </p>
             </div>
             
             {/* Play & Store Section */}
             <div className="flex flex-col w-full gap-4 max-w-sm">
                <button onClick={startRun} className="w-full bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-700/50 text-indigo-100 p-6 rounded-sm font-bold text-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] flex items-center justify-center gap-3 active:scale-95 group backdrop-blur-sm">
                  <Sword className="w-5 h-5 group-hover:rotate-45 transition-transform" /> <span className="font-serif tracking-widest">ENTER</span>
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
                  <Skull className="w-5 h-5 text-red-500" />
                  <div className="flex flex-col items-center leading-none">
                     <span className="text-red-100 font-bold font-mono text-sm">{userProgress.bestiary.length}</span>
                     <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Kills</span>
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

// --- TOWER TRANSITION SCREEN ---
const TowerLevelTransition = ({ currentFloor, onNext }: { currentFloor: number, onNext: () => void }) => {
    // Current floor passed here is the one JUST defeated (0 or 1). We are about to go to (currentFloor + 1).

    // Map configuration
    const floors = [
        { id: 0, label: "Floor 1", icon: <Sword className="w-4 h-4" /> },
        { id: 1, label: "Floor 2", icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 2, label: "The Top", icon: <Skull className="w-5 h-5" />, isBoss: true }
    ];

    // Animation state
    const [animating, setAnimating] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setAnimating(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 rounded-lg border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-esoteric opacity-50"></div>
            
            <h2 className="text-2xl font-serif text-slate-200 mb-8 relative z-10">Ascending Tower</h2>
            
            <div className="flex flex-col-reverse gap-6 relative z-10 w-full max-w-[200px]">
                {/* Connecting Line */}
                <div className="absolute left-1/2 top-4 bottom-4 w-1 bg-slate-800 -translate-x-1/2 rounded-full"></div>
                
                {floors.map((floor) => {
                    const isDefeated = floor.id <= currentFloor;
                    const isNext = floor.id === currentFloor + 1;
                    const isFuture = floor.id > currentFloor + 1;

                    return (
                        <div key={floor.id} className={`relative flex items-center justify-between w-full p-3 rounded-lg border transition-all duration-1000 z-10
                            ${isDefeated ? 'bg-emerald-900/20 border-emerald-900/50' : ''}
                            ${isNext ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : ''}
                            ${isFuture ? 'bg-slate-900 border-slate-800 opacity-50' : ''}
                        `}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                    ${isDefeated ? 'bg-emerald-900 border-emerald-700 text-emerald-400' : ''}
                                    ${isNext ? 'bg-indigo-900 border-indigo-400 text-indigo-300 animate-pulse' : ''}
                                    ${isFuture ? 'bg-slate-800 border-slate-700 text-slate-600' : ''}
                                `}>
                                    {isDefeated ? <Check className="w-4 h-4" /> : floor.icon}
                                </div>
                                <span className={`font-serif font-bold text-sm tracking-wider ${isNext ? 'text-white' : 'text-slate-400'}`}>
                                    {floor.label}
                                </span>
                            </div>

                            {/* Player Marker Animation */}
                            {isDefeated && floor.id === currentFloor && (
                                <div className={`absolute right-4 text-white transition-all duration-[1500ms] ease-in-out ${animating ? '-translate-y-[calc(100%+24px)] opacity-0' : 'opacity-100'}`}>
                                    <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                                </div>
                            )}
                            
                            {isNext && (
                                <div className={`absolute right-4 text-white transition-all duration-[1000ms] delay-[1400ms] ${animating ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                                    <ArrowUpCircle className="w-5 h-5 text-indigo-400" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={onNext}
                className="mt-10 px-8 py-3 bg-indigo-900/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 font-bold rounded-sm shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 relative z-10"
            >
                Continue Climb <ArrowUpCircle className="w-4 h-4" />
            </button>
        </div>
    );
}

// --- TOWER ASCENSION VICTORY COMPONENT (End of Run) ---
const TowerAscension = ({ onContinue, floorCleared, onShare, showCopied }: { onContinue: () => void, floorCleared: boolean, onShare: () => void, showCopied: boolean }) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIndex = new Date().getDay();
  
  const renderFloors = () => {
    return days.map((day, idx) => {
        let status = 'locked';
        if (idx < todayIndex) status = 'cleared';
        if (idx === todayIndex) status = 'current';
        
        const isToday = idx === todayIndex;
        
        return (
            <div key={day} className={`
                flex items-center justify-center w-64 h-16 border-x-4 border-t border-b mb-1 relative transition-all duration-1000
                ${isToday && floorCleared ? 'border-emerald-700 bg-emerald-900/30' : 'border-slate-800 bg-slate-900/50'}
                ${idx < todayIndex ? 'opacity-50 border-slate-800' : ''}
                ${idx > todayIndex ? 'opacity-30 border-slate-800 border-dashed' : ''}
            `}>
                <span className={`font-serif font-bold tracking-widest uppercase ${isToday ? 'text-white' : 'text-slate-500'}`}>
                    {day}
                </span>
                
                {isToday && (
                    <div className="absolute -left-12 text-emerald-500 animate-bounce">
                        <ArrowUpCircle className="w-8 h-8" />
                    </div>
                )}
                
                {/* Castle Bricks Decor */}
                <div className="absolute top-0 left-0 w-2 h-2 bg-slate-800"></div>
                <div className="absolute top-0 right-0 w-2 h-2 bg-slate-800"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-slate-800"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-slate-800"></div>
            </div>
        )
    }).reverse(); 
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-[fadeIn_1s_ease-out]">
        <h2 className="text-3xl font-bold font-serif text-amber-100 mb-6 drop-shadow-lg flex items-center gap-3">
            <Castle className="w-8 h-8" /> Weekly Ascent
        </h2>
        
        <div className="flex flex-col items-center gap-0 mb-8 py-10 px-12 bg-black/40 rounded-lg border border-slate-800 shadow-2xl backdrop-blur-sm relative overflow-hidden">
            {renderFloors()}
        </div>

        <div className="flex gap-4">
             <button onClick={onShare} className="px-8 py-3 bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 font-bold rounded-sm flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-colors">
                 {showCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Share2 className="w-3 h-3" /> Share Run</>}
             </button>
             <button onClick={onContinue} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-sm flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-colors">
                Return to Camp
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
        lastClaimTimestamp: parsed.lastClaimTimestamp || 0
      };
    }
    return {
      coins: 0,
      unlockedThemes: ['default'],
      selectedThemeId: 'default',
      lastDailyClaim: '',
      lastClaimTimestamp: 0,
      bestiary: []
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
  const [currentFloor, setCurrentFloor] = useState(0); // 0, 1, 2
  
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
  const enemy = enemies[currentFloor] || { 
    name: 'Loading...', 
    maxHp: 10, 
    currentHp: 10, 
    shield: 0, 
    description: '',
    visual: '❓',
    difficulty: 'EASY'
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
    // Initialize audio context on user interaction
    initAudio();
    
    // Pick random loading phrase
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

    isGameOverRef.current = false;
    aiMistakeMade.current = false;
    setGameState(GameState.LOADING);
    setScreen('GAME');
    
    // Reset Run State
    setCurrentFloor(0);
    setPlayer({ name: 'Hero', maxHp: 12, currentHp: 12, shield: 0, coins: 0, visual: '🧙', difficulty: 'EASY' });
    setMatchHistory([]);
    setLogs([]);
    setIsShuffling(false);
    
    const dateStr = getTodayString();
    const dailyEnemies = await generateDailyEnemy(dateStr);
    setEnemies(dailyEnemies);
    
    startLevel(dailyEnemies[0]);
  }, []);

  const startLevel = (currentEnemy: Entity) => {
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
    
    // Reset Boss Mistakes
    if (currentEnemy.difficulty === 'HARD') {
        bossMistakesRef.current = Math.floor(Math.random() * 3) + 1; // 1 to 3 mistakes
        console.log(`Boss will make ${bossMistakesRef.current} intentional mistakes.`);
    } else {
        bossMistakesRef.current = 0;
    }
    
    // Generate new deck for the floor
    const initialDeck = generateDeck(`${getTodayString()}-floor-${currentFloor}`);
    setCards(initialDeck);
    
    setGameState(GameState.PLAYER_TURN);
    addLog(`Floor ${currentFloor + 1}: ${currentEnemy.name} appears!`, 'enemy');
    addLog(currentEnemy.description || "Prepare for battle!", 'info');
  };

  const nextFloor = () => {
    if (currentFloor < 2) {
       playSound('ascend');
       const nextF = currentFloor + 1;
       setCurrentFloor(nextF);
       
       setPlayer(p => {
          if (p.currentHp >= p.maxHp) {
            // Give 5 coins if full health
            return { ...p, coins: (p.coins || 0) + 5 };
          } else {
            // Small heal between floors
            return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 3) };
          }
       });
       
       startLevel(enemies[nextF]);
    }
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
    
    // Trigger shuffle out animation
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
        }));
        
        setCards(newCards);
        setFlippedIndices([]);
        aiMemory.current.clear();
        setIsShuffling(false);
        isFirstTurnRef.current = true; // Reset first turn trigger on reshuffle
        enemyMatchesInTurn.current = 0; // Reset enemy streak tracking

        // Check if it was Enemy's turn when board cleared
        if (currentTurnState === GameState.ENEMY_ACTING || currentTurnState === GameState.ENEMY_THINKING) {
           setGameState(GameState.ENEMY_THINKING); // Go back to thinking to re-trigger AI loop
           addLog(`${enemy.name} prepares to continue...`, 'enemy');
        } else {
           setGameState(GameState.PLAYER_TURN);
           addLog("Your turn!", 'info');
        }
    }, 450); // Matches the shuffle-out animation duration
  }, [enemy.name]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      if (enemy.currentHp > 0 && player.currentHp > 0) {
        // Condition triggered regardless of whose turn it was, ensuring game doesn't stall if Enemy clears board
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
    
    // Apply Combo Multiplier (Base + 50% per stack)
    if (currentCombo > 0) {
      value = Math.floor(value * (1 + currentCombo * 0.5));
    }

    const isPlayerSource = source === 'PLAYER';
    
    // Record History (only relevant moves for flavor)
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

    // Trigger Animations & Sounds
    if (effect.includes('ATTACK')) {
       playSound('attack');
       if (isPlayerSource) {
         triggerAnim('PLAYER', 'anim-attack-up');
         setTimeout(() => triggerAnim('ENEMY', 'anim-damage'), 150);
       } else {
         triggerAnim('ENEMY', 'anim-attack-down');
         setTimeout(() => triggerAnim('PLAYER', 'anim-damage'), 150);
       }
    } else if (effect.includes('HEAL')) {
       playSound('heal');
       triggerAnim(isPlayerSource ? 'PLAYER' : 'ENEMY', 'anim-heal');
    } else if (effect.includes('SHIELD')) {
       playSound('shield');
       triggerAnim(isPlayerSource ? 'PLAYER' : 'ENEMY', 'anim-heal');
    } else if (effect.includes('COIN') && isPlayerSource) {
       playSound('coin');
       triggerAnim('PLAYER', 'anim-heal');
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
      
      const newHp = Math.max(0, target.currentHp - dmg);
      return { ...target, currentHp: newHp, shield: newShield };
    };

    const comboText = currentCombo > 0 ? ` (Combo x${1 + currentCombo * 0.5}!)` : '';

    if (effect.includes('ATTACK')) {
      if (isPlayerSource) {
        setEnemies(prev => {
          const newEnemies = [...prev];
          newEnemies[currentFloor] = damageEntity(newEnemies[currentFloor], value);
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
          newEnemies[currentFloor] = { ...newEnemies[currentFloor], currentHp: Math.min(newEnemies[currentFloor].maxHp, newEnemies[currentFloor].currentHp + value) };
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
          newEnemies[currentFloor] = { ...newEnemies[currentFloor], shield: newEnemies[currentFloor].shield + value };
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

  // --- Foretell Logic ---
  const triggerForetell = () => {
    // 1. Announce
    playSound('ascend');
    // Show announcement briefly so it clears quickly
    showAnnouncement("FORETELL!", 1000);
    addLog("First match! The cards reveal themselves...", 'info');
    
    // 2. Select 2 random cards that are NOT matched and NOT flipped
    const candidates = cards
      .map((c, i) => ({ ...c, originalIndex: i }))
      .filter(c => !c.isMatched && !c.isFlipped);
    
    if (candidates.length === 0) return;

    // Pick 2 (or 1 if only 1 left)
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    const revealed = shuffled.slice(0, 2);
    const indicesToReveal = revealed.map(c => c.originalIndex);

    if (indicesToReveal.length === 0) return;

    // 3. Temporarily Flip
    setIsShuffling(true); // Block input
    
    // Update AI Memory immediately (AI sees them too)
    revealed.forEach(c => {
        aiMemory.current.set(c.originalIndex, c);
    });

    // Animate flip up
    setCards(prev => prev.map((c, i) => 
        indicesToReveal.includes(i) ? { ...c, isFlipped: true } : c
    ));

    // 4. Flip back after delay (Increased to 2500ms)
    setTimeout(() => {
        setCards(prev => prev.map((c, i) => 
            indicesToReveal.includes(i) ? { ...c, isFlipped: false } : c
        ));
        setIsShuffling(false); // Unblock
    }, 2500);
  };

  // --- Interaction Logic ---
  const handleCardClick = (clickedCard: CardData) => {
    if (gameState !== GameState.PLAYER_TURN || flippedIndices.length >= 2 || isGameOverRef.current || isShuffling) return;

    const realIndex = cards.findIndex(c => c.id === clickedCard.id);
    if (realIndex === -1) return;

    playSound('tap');
    // Small delay to let tap sound play before flip
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

            if (card1.effect === card2.effect) {
                // MATCH
                setTimeout(() => {
                    handleMatch(newFlipped[0], newFlipped[1], card1.effect, 'PLAYER');
                }, 500);
            } else {
                // NO MATCH
                isFirstTurnRef.current = false; // Missed the first turn foretell chance
                setTimeout(() => {
                    unflipCards(newFlipped);
                    // End turn, reset combo
                    setCombo(0); 
                    setComboOwner(null);
                    setGameState(GameState.ENEMY_THINKING);
                }, 1000);
            }
        }
    }, 50);
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
        // If player matches, reset enemy streak counter (though normally turns switch, this is safe)
        enemyMatchesInTurn.current = 0;
    }

    // Logic for Combo display - Shared by Player and Enemy
    if (combo > 0) {
        let text = "COMBO!";
        if (combo === 2) text = "SUPER COMBO!";
        else if (combo === 3) text = "MEGA COMBO!";
        else if (combo >= 4) text = "ULTRA COMBO!";
        
        addLog(text, 'info'); 
        
        // Play combo sound for impact (both player and enemy)
        setTimeout(() => playSound('combo'), 100);
    }

    if (who === 'PLAYER') {
      playSound('match');
      // Check for Foretell
      if (isFirstTurnRef.current) {
         setTimeout(() => triggerForetell(), 600); // Trigger after match sound/anim
         isFirstTurnRef.current = false;
      }
    } else {
      playSound('enemy_match');
    }

    applyEffect(effect, who, combo);
    
    // Increment combo
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
    // Only check if we are in active combat
    if (gameState === GameState.VICTORY || gameState === GameState.DEFEAT || gameState === GameState.LEVEL_COMPLETE) return;

    if (player.currentHp <= 0) {
      setGameState(GameState.DEFEAT);
      playSound('defeat');
      isGameOverRef.current = true;
      return;
    }
    
    // Check enemy death
    if (enemy && enemy.currentHp <= 0) {
      isGameOverRef.current = true;
      
      // Update Bestiary
      setUserProgress(prev => {
           const newCoins = prev.coins + (player.coins || 0);
           const knownEnemy = prev.bestiary.find(e => e.name === enemy.name);
           let newBestiary = [...prev.bestiary];
           if (!knownEnemy) {
             newBestiary.push({ ...enemy, dateEncountered: getTodayString() });
           }
           return { ...prev, coins: newCoins, bestiary: newBestiary };
      });

      if (currentFloor === 2) {
         setGameState(GameState.VICTORY);
         playSound('victory');
      } else {
         setGameState(GameState.LEVEL_COMPLETE);
         playSound('victory'); // Or a distinct "Level Clear" sound
      }
      return;
    }

    if (gameState === GameState.ENEMY_THINKING) {
      const aiTimeout = setTimeout(() => {
        executeAiTurn();
      }, 1500);
      return () => clearTimeout(aiTimeout);
    }
  }, [player.currentHp, enemy?.currentHp, gameState, currentFloor]);

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
    // If game ended, stop
    if (isGameOverRef.current || player.currentHp <= 0 || enemy.currentHp <= 0) return;

    setGameState(GameState.ENEMY_ACTING);
    const memory = aiMemory.current;
    
    // Config based on floor/difficulty
    let mistakeChance = 0.0;
    let forgetChance = 0.0;
    let guaranteedMistake = false;

    switch (enemy.difficulty) {
        case 'EASY': 
            mistakeChance = 0.6; 
            forgetChance = 0.5;
            guaranteedMistake = true;
            break;
        case 'MEDIUM':
            mistakeChance = 0.3;
            forgetChance = 0.3;
            guaranteedMistake = true;
            break;
        case 'HARD':
            // Nerfed boss difficulty: Higher mistake/forget chance
            mistakeChance = 0.6; 
            forgetChance = 0.4; 
            guaranteedMistake = true; 
            break;
    }
    
    // Find pair in memory
    let matchFound: [number, number] | null = null;
    const seenEffects = new Map<CardEffect, number>();
    for (const [idx, card] of memory.entries()) {
      if (cards[idx] && cards[idx].isMatched) continue;

      if (seenEffects.has(card.effect)) {
        matchFound = [seenEffects.get(card.effect)!, idx];
        break;
      }
      seenEffects.set(card.effect, idx);
    }

    // Determine if we should force a mistake due to streak cap
    // We want to stop the streak AT 2 (forcing 3rd to miss).
    const forceStreakEnd = enemyMatchesInTurn.current >= 2;

    if (forceStreakEnd && matchFound) {
       addLog(`${enemy.name} gets greedy and loses focus...`, 'info'); 
       matchFound = null; // Forget the known pair
    }

    // --- Special Boss AI (Hard) Intentional Mistake Logic ---
    const cardsInPlay = cards.filter(c => !c.isMatched).length;
    if (enemy.difficulty === 'HARD' && cardsInPlay > 4 && bossMistakesRef.current > 0 && matchFound && !forceStreakEnd) {
        matchFound = null;
        bossMistakesRef.current--;
        addLog(`${enemy.name} seems distracted by the chaos...`, 'info');
    }

    // Mistake Logic (Standard)
    if (matchFound) {
       let forceError = false;
       if (guaranteedMistake && !aiMistakeMade.current) {
          forceError = true;
          aiMistakeMade.current = true;
       }

       if (forceError || Math.random() < forgetChance) {
          matchFound = null; // AI "forgets"
       }
    }

    const availableIndices = cards
      .map((c, i) => (c.isMatched ? -1 : i))
      .filter(i => i !== -1);
    
    if (availableIndices.length === 0) return;

    let firstIdx: number;
    let secondIdx: number;

    if (matchFound) {
      [firstIdx, secondIdx] = matchFound;
    } else {
      const unknownIndices = availableIndices.filter(i => !memory.has(i));
      if (unknownIndices.length > 0) {
         firstIdx = unknownIndices[Math.floor(Math.random() * unknownIndices.length)];
      } else {
         firstIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      }
    }

    // AI Execute
    flipCardAI(firstIdx).then((card1) => {
       if (isGameOverRef.current) return;
       playSound('flip');
       aiMemory.current.set(firstIdx, card1);

       if (!matchFound) {
          let pairInMem = -1;
          for (const [idx, mCard] of memory.entries()) {
             if (idx !== firstIdx && !mCard.isMatched && mCard.effect === card1.effect) {
                pairInMem = idx;
                break;
             }
          }

          if (pairInMem !== -1) {
             let forceError = false;
             if (guaranteedMistake && !aiMistakeMade.current) {
                 forceError = true;
                 aiMistakeMade.current = true;
             }

             // If forceStreakEnd is active, ensure we mistake
             if (forceStreakEnd || forceError || Math.random() < mistakeChance) {
                 const validSeconds = availableIndices.filter(i => i !== firstIdx && i !== pairInMem);
                 if (validSeconds.length > 0) {
                     secondIdx = validSeconds[Math.floor(Math.random() * validSeconds.length)];
                     addLog(`${enemy.name} stumbles!`, 'info');
                 } else {
                     secondIdx = pairInMem; 
                 }
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
            
            if (card1.effect === card2.effect) {
               setTimeout(() => {
                 handleMatch(firstIdx, secondIdx, card1.effect, 'ENEMY');
               }, 800);
            } else {
               setTimeout(() => {
                 unflipCards([firstIdx, secondIdx]);
                 setCombo(0); 
                 setComboOwner(null);
                 setGameState(GameState.PLAYER_TURN);
               }, 1000);
            }
         });
       }, 800);
    });
  };

  const shareResult = async () => {
    const status = gameState === GameState.VICTORY ? '🏆 Tower Conquered' : `💀 Died Floor ${currentFloor + 1}`;
    const moves = matchHistory.join('');
    const text = `Towerflip 🏰\n${new Date().toDateString()}\n${status}\n${moves}\n\nPlay now!`;
    
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // --- STORE COMPONENT ---
  const renderStore = () => {
    const buyTheme = (theme: CardTheme) => {
      if (userProgress.coins >= theme.price) {
        playSound('coin');
        setUserProgress(prev => ({
          ...prev,
          coins: prev.coins - theme.price,
          unlockedThemes: [...prev.unlockedThemes, theme.id],
          selectedThemeId: theme.id
        }));
      }
    };

    const selectTheme = (id: string) => {
      playSound('flip');
      setUserProgress(prev => ({ ...prev, selectedThemeId: id }));
    };

    return (
      <div className="h-screen w-full flex flex-col max-w-5xl mx-auto text-slate-200 z-10 relative">
        <header className="flex-none flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-10">
           <button onClick={() => setScreen('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-slate-200 transition-colors uppercase tracking-widest text-xs font-bold">
             <ArrowLeft className="w-4 h-4" /> Return
           </button>
           <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
             <Coins className="w-3 h-3 text-amber-600" />
             <span className="font-bold font-mono text-sm">{userProgress.coins}</span>
           </div>
        </header>

        <div className="flex-none p-6 pb-2">
          <h2 className="text-3xl font-serif text-slate-200 flex items-center gap-3">
            <ShoppingBag className="text-amber-700 w-6 h-6" /> <span className="italic">Store</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-serif">Spend your gold on new card themes.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-10">
             {CARD_THEMES.map(theme => {
               const isUnlocked = userProgress.unlockedThemes.includes(theme.id);
               const isSelected = userProgress.selectedThemeId === theme.id;

               return (
                 <div key={theme.id} className={`bg-slate-900 rounded-sm p-3 border transition-all relative group flex flex-col ${isSelected ? 'border-indigo-900/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-slate-800'}`}>
                    <div className={`w-full aspect-[3/4] rounded-sm mb-3 flex items-center justify-center relative ${theme.bgClass} shadow-inner`}>
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.decorClass}`}>
                         <div className="w-2 h-2 rounded-full bg-white/20"></div>
                       </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col justify-between">
                      <div className="mb-2">
                         <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">{theme.name}</h3>
                         <p className="text-[10px] text-slate-500 font-serif italic line-clamp-2">{theme.description}</p>
                      </div>

                      {isUnlocked ? (
                        <button 
                          onClick={() => selectTheme(theme.id)}
                          disabled={isSelected}
                          className={`w-full py-1.5 rounded-sm font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${isSelected ? 'bg-indigo-900/20 text-indigo-400 cursor-default border border-indigo-900/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`}
                        >
                          {isSelected ? <><Check className="w-3 h-3" /> Equipped</> : 'Equip'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => buyTheme(theme)}
                          disabled={userProgress.coins < theme.price}
                          className={`w-full py-1.5 rounded-sm font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${userProgress.coins >= theme.price ? 'bg-amber-900/20 hover:bg-amber-900/40 text-amber-500 border border-amber-900/30' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'}`}
                        >
                          {userProgress.coins >= theme.price ? (
                             <>Buy <Coins className="w-3 h-3" /> {theme.price}</>
                          ) : (
                             <><Lock className="w-3 h-3" /> {theme.price}</>
                          )}
                        </button>
                      )}
                    </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    );
  };

  // --- BESTIARY COMPONENT ---
  const renderBestiary = () => {
    return (
      <div className="h-screen w-full flex flex-col max-w-5xl mx-auto text-slate-200 z-10 relative">
        <header className="flex-none flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-10">
           <button onClick={() => setScreen('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-slate-200 transition-colors uppercase tracking-widest text-xs font-bold">
             <ArrowLeft className="w-4 h-4" /> Return
           </button>
        </header>

        <div className="flex-none p-6 pb-2">
          <h2 className="text-3xl font-serif text-slate-200 flex items-center gap-3">
            <BookOpen className="text-indigo-900 w-6 h-6" /> <span className="italic">Bestiary</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-serif">Track the monsters you have defeated.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {userProgress.bestiary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600 border border-slate-800 border-dashed rounded-sm bg-slate-900/30">
              <Skull className="w-8 h-8 mb-4 opacity-30" />
              <p className="font-serif italic">No monsters recorded yet.</p>
              <p className="text-xs uppercase tracking-widest mt-2">Defeat enemies to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
               {userProgress.bestiary.map((entry, idx) => (
                 <div key={idx} className="bg-slate-900 p-0 rounded-sm border border-slate-800 overflow-hidden group hover:border-indigo-900/30 transition-colors">
                    <div className="h-32 w-full bg-black relative flex items-center justify-center bg-gradient-to-t from-slate-900 to-slate-800">
                         <span className="text-6xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{entry.visual}</span>
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                       <div className="absolute bottom-2 left-3">
                          <h3 className="font-bold text-lg font-serif text-slate-200">{entry.name}</h3>
                       </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-slate-400 font-serif italic mb-3 leading-relaxed border-l-2 border-slate-800 pl-2">
                        "{entry.description}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider border-t border-slate-800 pt-2">
                        <span>HP: {entry.maxHp}</span>
                        <span className={`${entry.difficulty === 'HARD' ? 'text-red-900' : 'text-indigo-400'}`}>{entry.difficulty}</span>
                      </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- GAME COMPONENT ---
  const renderGame = () => {
    const activeTheme = CARD_THEMES.find(t => t.id === userProgress.selectedThemeId) || CARD_THEMES[0];

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
      <div className="min-h-screen text-slate-100 font-sans flex flex-col md:flex-row max-w-7xl mx-auto relative overflow-hidden z-10">
        
        {/* Foretell Announcement Overlay */}
        {announcement && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                 <div className="animate-pop text-6xl md:text-8xl font-bold text-white font-serif tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] flex flex-col items-center gap-2">
                    <span>{announcement}</span>
                    <Eye className="w-12 h-12 text-indigo-400 animate-pulse" />
                 </div>
            </div>
        )}

        {/* LEFT PANEL */}
        <div className="w-full md:w-80 lg:w-96 p-2 md:p-4 flex flex-col border-b md:border-b-0 md:border-r border-slate-900 bg-slate-900/30 z-20 shadow-2xl">
          <header className="flex flex-row justify-between items-center mb-2">
             <div className="flex flex-col">
               {/* TOWER PROGRESS */}
               <div className="flex items-center gap-1 mb-1">
                 {[0, 1, 2].map(i => (
                   <div key={i} className={`h-1.5 w-6 rounded-sm transition-all ${currentFloor === i ? 'bg-indigo-600 shadow-lg shadow-indigo-900/50' : currentFloor > i ? 'bg-emerald-900' : 'bg-slate-800'}`} />
                 ))}
               </div>
               <span className="text-[10px] text-slate-500 font-serif italic tracking-wider">Floor {currentFloor + 1} of 3</span>
             </div>
             
             <button onClick={() => setScreen('MENU')} className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-white px-2 py-1 bg-slate-900 border border-slate-800 rounded-sm">Exit Run</button>
          </header>

          {/* STATS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-4 mb-2 md:mb-4">
             {/* ENEMY SECTION */}
            <div className={`col-span-1 bg-slate-900/50 p-2 md:p-4 rounded-sm border border-red-900/20 shadow-lg ${enemyAnim} transition-transform relative overflow-hidden`}>
              {combo > 1 && comboOwner === 'ENEMY' && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-amber-500 font-bold animate-pulse bg-black/80 px-2 rounded-sm border border-amber-900/50 scale-75 origin-right">
                  <Zap className="w-3 h-3 fill-amber-500" />
                  <span className="text-xs">x{1 + combo * 0.5}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-black/40 flex items-center justify-center border border-red-900/30 overflow-hidden text-2xl md:text-3xl">
                   {enemy.visual}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1">
                    <h2 className="font-bold text-xs md:text-sm leading-none truncate font-serif text-slate-300">{enemy.name}</h2>
                    {enemy.difficulty === 'HARD' && <Skull className="w-3 h-3 text-red-900 animate-pulse" />}
                  </div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest">{enemy.difficulty}</p>
                </div>
              </div>
              <HealthBar current={enemy.currentHp} max={enemy.maxHp} shield={enemy.shield} label="ENEMY" isEnemy />
            </div>

            {/* PLAYER SECTION */}
            <div className={`col-span-1 bg-slate-900/50 p-2 md:p-4 rounded-sm border border-indigo-900/20 shadow-lg relative overflow-hidden ${playerAnim} transition-transform`}>
              {combo > 1 && comboOwner === 'PLAYER' && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-amber-500 font-bold animate-pulse bg-black/80 px-2 rounded-sm border border-amber-900/50 scale-75 origin-right">
                  <Zap className="w-3 h-3 fill-amber-500" />
                  <span className="text-xs">x{1 + combo * 0.5}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-black/40 flex items-center justify-center border border-indigo-900/30 text-2xl md:text-3xl">
                  {player.visual}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h2 className="font-bold text-xs md:text-sm leading-none truncate font-serif text-slate-300">{player.name}</h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Coins className="w-3 h-3 text-amber-700" />
                    <span className="text-[10px] text-amber-600 font-mono">+{player.coins}</span>
                  </div>
                </div>
              </div>
              <HealthBar current={player.currentHp} max={player.maxHp} shield={player.shield} label="PLAYER" />
            </div>
          </div>

          <div className="flex-none h-14 md:h-auto md:flex-1 bg-slate-950/50 rounded-sm border border-slate-900 p-2 md:p-3 overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none" />
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
                    log.type === 'heal' ? 'text-emerald-900' : 'text-slate-600'}
                `}>
                  <span className="opacity-30 text-[10px] mr-1">{'>'}</span>
                  {log.message}
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* RIGHT PANEL: BOARD */}
        <div className="flex-1 p-2 md:p-8 flex flex-col items-center justify-start md:justify-center relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          
          {/* Turn Indicator */}
          <div className="absolute top-2 md:top-8 flex items-center gap-2 px-4 py-1.5 rounded-sm bg-black/40 backdrop-blur border border-slate-800 shadow-2xl z-10 transition-all duration-300">
             {gameState === GameState.PLAYER_TURN ? (
               <>
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-30"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-900"></span>
                  </span>
                  <span className="font-bold text-slate-300 text-[10px] uppercase tracking-widest">Your Turn</span>
               </>
             ) : gameState === GameState.ENEMY_THINKING || gameState === GameState.ENEMY_ACTING ? (
                <>
                 <div className="w-2 h-2 border-2 border-red-900 border-t-transparent rounded-full animate-spin"></div>
                 <span className="font-bold text-red-900 text-[10px] uppercase tracking-widest">Enemy Turn</span>
                </>
             ) : <span className="font-bold text-slate-600 text-[10px] uppercase tracking-widest">...</span>}
          </div>

          <div className="grid grid-cols-4 gap-2 w-full max-w-[min(90vw,45vh)] aspect-square mx-auto mt-12 md:mt-0">
            {cards.map((card, idx) => (
              <Card 
                key={card.id} 
                card={card}
                index={idx}
                isExitAnimating={isShuffling}
                onClick={handleCardClick} 
                disabled={gameState !== GameState.PLAYER_TURN}
                theme={activeTheme}
                combo={combo}
              />
            ))}
          </div>

          {/* OVERLAYS (Victory / Defeat / Level Clear) */}
          {(gameState === GameState.VICTORY || gameState === GameState.DEFEAT || gameState === GameState.LEVEL_COMPLETE) && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               {gameState === GameState.VICTORY ? (
                   // Replace standard victory modal with Tower Ascension Screen
                   <TowerAscension 
                      onContinue={() => setScreen('MENU')} 
                      floorCleared={true} 
                      onShare={shareResult} 
                      showCopied={showCopied} 
                   />
               ) : (
                   <div className="bg-slate-950 border border-slate-800 p-0 rounded-sm shadow-2xl max-w-sm w-full text-center transform transition-all animate-[fadeIn_0.5s_ease-out] overflow-hidden">
                      
                      {gameState === GameState.LEVEL_COMPLETE && (
                         <TowerLevelTransition currentFloor={currentFloor} onNext={nextFloor} />
                      )}
    
                      {gameState === GameState.DEFEAT && (
                        <div className="p-8 flex flex-col items-center gap-4">
                          <Skull className="w-16 h-16 text-red-900 animate-pulse" />
                          <h2 className="text-3xl font-bold font-serif text-slate-200">Defeat</h2>
                          <p className="text-slate-500 font-serif italic">You were defeated.</p>
                          <div className="flex gap-2 mt-4 w-full">
                             <button onClick={shareResult} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-sm flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                                {showCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Share2 className="w-3 h-3" /> Share</>}
                             </button>
                             <button onClick={() => setScreen('MENU')} className="flex-1 py-3 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-900 text-indigo-300 font-bold rounded-sm uppercase tracking-widest text-[10px]">
                                Try Again
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

  // --- MAIN RENDER ---
  return (
    <div className="relative min-h-screen w-full bg-slate-900">
      {screen === 'MENU' && <Menu userProgress={userProgress} setUserProgress={setUserProgress} setScreen={setScreen} startRun={startRun} />}
      {screen === 'STORE' && renderStore()}
      {screen === 'BESTIARY' && renderBestiary()}
      {screen === 'GAME' && renderGame()}
    </div>
  );
};

export default App;
