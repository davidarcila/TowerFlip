
import { GoogleGenAI, Type } from "@google/genai";
import { Entity } from "../types";

export const generateDailyEnemy = async (dateString: string): Promise<Entity[]> => {
  // Fallback enemies if API fails
  const fallbackEnemies: Entity[] = [
    {
      name: "Rat Swarm",
      maxHp: 8,
      currentHp: 8,
      shield: 0,
      description: "A chittering mass of rodents.",
      coins: 0,
      difficulty: 'EASY'
    },
    {
      name: "Goblin Guard",
      maxHp: 12,
      currentHp: 12,
      shield: 0,
      description: "Armed with a dull spear and bad attitude.",
      coins: 0,
      difficulty: 'MEDIUM'
    },
    {
      name: "Dungeon Ogre",
      maxHp: 20,
      currentHp: 20,
      shield: 0,
      description: "A hulking brute blocking the exit.",
      coins: 0,
      difficulty: 'HARD'
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
      contents: `Generate 3 fantasy enemies for a roguelike card game Daily Run (Date: ${dateString}). 
                 1. First enemy: Difficulty Easy (Weak, ~8 HP).
                 2. Second enemy: Difficulty Medium (Average, ~12 HP).
                 3. Third enemy: Difficulty Hard (Boss, ~20 HP).
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
            },
            required: ["name", "maxHp", "description"],
          }
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as any[];
      if (Array.isArray(data) && data.length >= 3) {
         return [
           { ...data[0], currentHp: data[0].maxHp, shield: 0, coins: 0, difficulty: 'EASY' },
           { ...data[1], currentHp: data[1].maxHp, shield: 0, coins: 0, difficulty: 'MEDIUM' },
           { ...data[2], currentHp: data[2].maxHp, shield: 0, coins: 0, difficulty: 'HARD' },
         ];
      }
    }
    
    return fallbackEnemies;
  } catch (error) {
    console.error("Error generating enemies:", error);
    return fallbackEnemies;
  }
};
