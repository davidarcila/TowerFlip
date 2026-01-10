import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coins, Skull, RefreshCw, Trophy, ShieldAlert, Zap, ShoppingBag, BookOpen, ArrowLeft, Check, Lock, Flame, Sword, Share2, ArrowUpCircle, RectangleVertical, Heart } from 'lucide-react';
import Card from './components/Card';
import HealthBar from './components/HealthBar';
import { CardData, CardEffect, Entity, GameState, LogEntry, Screen, UserProgress, CardTheme } from './types';
import { generateDeck, EFFECT_CONFIG, DECK_COMPOSITION, CARD_THEMES, GAME_VERSION } from './constants';
import { generateDailyEnemy } from './services/gemini';
import { initAudio, playSound } from './services/audio';

const App: React.FC = () => {
  // --- Persistent User State ---
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('dungeon_user_progress');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      coins: 0,
      unlockedThemes: ['default'],
      selectedThemeId: 'default',
      lastDailyClaim: '',
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
  const [isShuffling, setIsShuffling] = useState(false);
  
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
    difficulty: 'EASY'
  });
  
  // Derived current enemy
  const enemy = enemies[currentFloor] || { 
    name: 'Loading...', 
    maxHp: 10, 
    currentHp: 10, 
    shield: 0, 
    description: '',
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

  // --- Game Initialization ---
  const startRun = useCallback(async () => {
    // Initialize audio context on user interaction
    initAudio();
    
    isGameOverRef.current = false;
    aiMistakeMade.current = false;
    setGameState(GameState.LOADING);
    setScreen('GAME');
    
    // Reset Run State
    setCurrentFloor(0);
    setPlayer({ name: 'Hero', maxHp: 12, currentHp: 12, shield: 0, coins: 0, difficulty: 'EASY' });
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
    setFlippedIndices([]);
    setPlayerAnim('');
    setEnemyAnim('');
    setIsShuffling(false);
    
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
       // Small heal between floors
       setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + 3) }));
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
            setTimeout(() => {
            unflipCards(newFlipped);
            // End turn, reset combo
            setCombo(0); 
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

    if (who === 'PLAYER') {
      playSound('match');
      if (combo > 0) {
        setTimeout(() => playSound('combo'), 100);
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
            mistakeChance = 0.1;
            forgetChance = 0.1;
            guaranteedMistake = false;
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

    // Mistake Logic
    if (matchFound) {
       // Guaranteed mistake logic (only happens once per match for Medium, maybe always for Easy?)
       // Let's stick to "once per match" logic for Medium. Easy acts dumb randomly.
       
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

             if (forceError || Math.random() < mistakeChance) {
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


  // --- MENU COMPONENT ---
  const renderMenu = () => {
    const today = new Date().toDateString();
    const canClaim = userProgress.lastDailyClaim !== today;
    const currentTheme = CARD_THEMES.find(t => t.id === userProgress.selectedThemeId) || CARD_THEMES[0];

    const claimDaily = () => {
      playSound('coin');
      setUserProgress(prev => ({
        ...prev,
        coins: prev.coins + 10,
        lastDailyClaim: today
      }));
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-md mx-auto p-6 gap-6 md:gap-8 relative">
         <div className="text-center space-y-2 mt-4">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-cyan-400 leading-tight font-serif tracking-tighter">
              Towerflip
            </h1>
            <p className="text-slate-500 text-sm font-serif italic">The Daily Tower awaits.</p>
         </div>

         <div className="flex flex-col w-full gap-4 max-w-sm">
            <button onClick={startRun} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white p-6 rounded-sm font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 group">
              <Sword className="w-5 h-5 group-hover:rotate-45 transition-transform" /> <span className="font-serif tracking-widest">PLAY</span>
            </button>
            
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setScreen('STORE')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-4 rounded-sm font-bold transition-all flex flex-col items-center justify-center gap-2 active:scale-95">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <span className="text-xs uppercase tracking-widest">Store</span>
                </button>
                
                <button onClick={() => setScreen('BESTIARY')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-4 rounded-sm font-bold transition-all flex flex-col items-center justify-center gap-2 active:scale-95">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span className="text-xs uppercase tracking-widest">Bestiary</span>
                </button>
            </div>
         </div>

         {/* Daily Streak */}
         <div className="w-full max-w-sm bg-slate-900/80 rounded-sm p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className={`w-6 h-6 ${canClaim ? 'text-orange-500 animate-pulse' : 'text-slate-700'}`} />
              <div>
                <h3 className="font-bold text-slate-300 text-sm font-serif">Daily Reward</h3>
                <p className="text-[10px] text-slate-600 italic">{canClaim ? 'Reward available!' : 'Come back tomorrow for more.'}</p>
              </div>
            </div>
            <button 
              disabled={!canClaim}
              onClick={claimDaily}
              className={`px-3 py-1 rounded-sm font-bold text-xs flex items-center gap-2 border ${canClaim ? 'bg-orange-900/30 border-orange-700/50 text-orange-200 hover:bg-orange-900/50' : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'}`}
            >
              <Coins className="w-3 h-3" />
              {canClaim ? '+10' : 'Taken'}
            </button>
         </div>

         {/* Stats */}
         <div className="flex justify-between w-full max-w-sm text-slate-500 text-xs font-mono px-2 border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2">
              <Coins className="w-3 h-3 text-amber-600" />
              <span>{userProgress.coins}</span>
            </div>
            <div className="flex items-center gap-2">
              <Skull className="w-3 h-3 text-red-900" />
              <span>{userProgress.bestiary.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <RectangleVertical className="w-3 h-3 text-indigo-400" />
              <span className="uppercase tracking-widest text-[10px]">{currentTheme.name}</span>
            </div>
         </div>

         {/* Version Number */}
         <div className="absolute bottom-2 text-[10px] text-slate-800 font-mono">
           v{GAME_VERSION}
         </div>
      </div>
    );
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
      <div className="h-screen w-full flex flex-col max-w-5xl mx-auto bg-slate-950 text-slate-200">
        <header className="flex-none flex items-center justify-between p-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md z-10">
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
      <div className="h-screen w-full flex flex-col max-w-5xl mx-auto bg-slate-950 text-slate-200">
        <header className="flex-none flex items-center justify-between p-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md z-10">
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
                    <div className="h-32 w-full bg-black relative overflow-hidden">
                       {entry.imageUrl ? (
                         <img src={entry.imageUrl} alt={entry.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity grayscale hover:grayscale-0" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <Skull className="text-slate-800 w-12 h-12" />
                         </div>
                       )}
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-900" />
            <p className="text-sm font-serif italic text-slate-500">Generating dungeon...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row max-w-7xl mx-auto">
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
            <div className={`col-span-1 bg-slate-900/50 p-2 md:p-4 rounded-sm border border-red-900/20 shadow-lg ${enemyAnim} transition-transform`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-black/40 flex items-center justify-center border border-red-900/30 overflow-hidden">
                   {enemy.imageUrl ? (
                     <img src={enemy.imageUrl} alt="enemy" className="w-full h-full object-cover opacity-80" />
                   ) : (
                     <Skull className="text-red-900 w-4 h-4 md:w-5 md:h-5" />
                   )}
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
              {combo > 1 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-amber-500 font-bold animate-pulse bg-black/80 px-2 rounded-sm border border-amber-900/50 scale-75 origin-right">
                  <Zap className="w-3 h-3 fill-amber-500" />
                  <span className="text-xs">x{1 + combo * 0.5}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-black/40 flex items-center justify-center border border-indigo-900/30">
                  <ShieldAlert className="text-indigo-800 w-4 h-4 md:w-5 md:h-5" />
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
                  ${log.type === 'enemy' ? 'text-red-900/80' : 
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
               <div className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-sm shadow-2xl max-w-sm w-full text-center transform transition-all animate-[fadeIn_0.5s_ease-out]">
                  
                  {gameState === GameState.LEVEL_COMPLETE && (
                    <div className="flex flex-col items-center gap-4">
                      <ArrowUpCircle className="w-16 h-16 text-emerald-900 animate-pulse" />
                      <h2 className="text-2xl font-bold font-serif text-slate-200">Floor Cleared</h2>
                      <p className="text-slate-500 text-sm font-serif italic">The echo of {enemy.name} fades.</p>
                      
                      <div className="flex flex-col items-center gap-2 mt-2 p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg w-full">
                          <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-emerald-400 animate-bounce" />
                            <span className="text-emerald-300 font-bold font-serif text-sm animate-heal-glow">Resting at Campfire</span>
                          </div>
                          <span className="text-emerald-500/80 text-xs uppercase tracking-widest">+3 Health Recovered</span>
                      </div>

                      <button 
                        onClick={nextFloor}
                        className="w-full py-3 mt-4 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-900/50 text-emerald-400 font-bold rounded-sm shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                      >
                         Next Floor <ArrowUpCircle className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {gameState === GameState.VICTORY && (
                    <div className="flex flex-col items-center gap-4">
                      <Trophy className="w-16 h-16 text-amber-700 animate-pulse" />
                      <h2 className="text-3xl font-bold font-serif text-slate-200">Victory!</h2>
                      <p className="text-slate-500 font-serif italic">You have cleared the dungeon.</p>
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

                  {gameState === GameState.DEFEAT && (
                    <div className="flex flex-col items-center gap-4">
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
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <>
      {screen === 'MENU' && renderMenu()}
      {screen === 'STORE' && renderStore()}
      {screen === 'BESTIARY' && renderBestiary()}
      {screen === 'GAME' && renderGame()}
    </>
  );
};

export default App;