
import { GoogleGenAI, Type } from "@google/genai";
import { Entity, BossType } from "../types";

export const generateDailyEnemy = async (dateString: string, difficultyMultiplier: number = 1): Promise<Entity[]> => {
  // Helper to pick a random boss type
  const getBossType = (): BossType => {
    const types: BossType[] = ['BURN', 'SLIME', 'CONFUSION'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const todayBossType = getBossType();
  
  const hpEasy = Math.floor(6 * difficultyMultiplier);
  const hpMed = Math.floor(10 * difficultyMultiplier);
  const hpHard = Math.floor(15 * difficultyMultiplier);

  // Fallback enemies if API fails
  const fallbackEnemies: Entity[] = [
    {
      name: "Rotting Rat",
      maxHp: hpEasy,
      currentHp: hpEasy,
      shield: 0,
      description: "It gnaws at the roots of the world.",
      visual: "🐀",
      coins: 0,
      difficulty: 'EASY',
      bossType: 'NONE'
    },
    {
      name: "Hollow Guard",
      maxHp: hpMed,
      currentHp: hpMed,
      shield: 0,
      description: "Armor rusting over nothing but dust.",
      visual: "🛡️",
      coins: 0,
      difficulty: 'MEDIUM',
      bossType: 'NONE'
    },
    {
      name: "The Forgotten",
      maxHp: hpHard,
      currentHp: hpHard,
      shield: 0,
      description: "It remembers you, but you do not remember it.",
      visual: "👁️",
      coins: 0,
      difficulty: 'HARD',
      bossType: todayBossType // Assign random boss type
    }
  ];

  if (!process.env.API_KEY) {
    console.warn("No API_KEY found, using fallback enemies.");
    return fallbackEnemies;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 fantasy enemies for a roguelike card game Tower (Seed: ${dateString}, Difficulty Multiplier: ${difficultyMultiplier}). 
                 The enemies should get progressively stronger in description.
                 The tone should be "Dark Fantasy".
                 Max 12 words per description.
                 For each enemy, provide a single UTF-8 Emoji that best represents it in the "visual" field.
                 
                 1. First enemy: Difficulty Easy (Weak, ~${hpEasy} HP).
                 2. Second enemy: Difficulty Medium (Average, ~${hpMed} HP).
                 3. Third enemy: Difficulty Hard (Boss, ~${hpHard} HP).
                 
                 Return them as a JSON list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              maxHp: { type: Type.INTEGER },
              description: { type: Type.STRING },
              visual: { type: Type.STRING, description: "A single emoji representing the enemy" }
            },
            required: ["name", "maxHp", "description", "visual"],
          }
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as any[];
      if (Array.isArray(data) && data.length >= 3) {
         return [
           { ...data[0], maxHp: hpEasy, currentHp: hpEasy, shield: 0, coins: 0, difficulty: 'EASY', bossType: 'NONE' },
           { ...data[1], maxHp: hpMed, currentHp: hpMed, shield: 0, coins: 0, difficulty: 'MEDIUM', bossType: 'NONE' },
           { ...data[2], maxHp: hpHard, currentHp: hpHard, shield: 0, coins: 0, difficulty: 'HARD', bossType: todayBossType },
         ];
      }
    }
    
    return fallbackEnemies;
  } catch (error) {
    console.error("Error generating enemies:", error);
    return fallbackEnemies;
  }
};
