
import { GoogleGenAI, Type } from "@google/genai";
import { Entity } from "../types";

// Helper to generate a deterministic visual url based on name
const getImageUrl = (name: string) => {
  const encodedName = encodeURIComponent(`${name} portrait, darkest dungeon art style, black and white, pixel art, heavy shadows, low resolution`);
  return `https://image.pollinations.ai/prompt/${encodedName}?width=256&height=256&nologo=true&seed=42`;
};

export const generateDailyEnemy = async (dateString: string): Promise<Entity[]> => {
  // Fallback enemies if API fails
  const fallbackEnemies: Entity[] = [
    {
      name: "Rotting Rat",
      maxHp: 8,
      currentHp: 8,
      shield: 0,
      description: "It gnaws at the roots of the world.",
      imageUrl: getImageUrl("Rotting Rat"),
      coins: 0,
      difficulty: 'EASY'
    },
    {
      name: "Hollow Guard",
      maxHp: 12,
      currentHp: 12,
      shield: 0,
      description: "Armor rusting over nothing but dust.",
      imageUrl: getImageUrl("Hollow Guard"),
      coins: 0,
      difficulty: 'MEDIUM'
    },
    {
      name: "The Forgotten",
      maxHp: 20,
      currentHp: 20,
      shield: 0,
      description: "It remembers you, but you do not remember it.",
      imageUrl: getImageUrl("The Forgotten"),
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
                 The tone should be "Dark Fantasy" but the descriptions should be clear, concise, and descriptive (not overly poetic or cryptic).
                 Max 12 words per description.
                 
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
           { ...data[0], currentHp: data[0].maxHp, shield: 0, coins: 0, difficulty: 'EASY', imageUrl: getImageUrl(data[0].name) },
           { ...data[1], currentHp: data[1].maxHp, shield: 0, coins: 0, difficulty: 'MEDIUM', imageUrl: getImageUrl(data[1].name) },
           { ...data[2], currentHp: data[2].maxHp, shield: 0, coins: 0, difficulty: 'HARD', imageUrl: getImageUrl(data[2].name) },
         ];
      }
    }
    
    return fallbackEnemies;
  } catch (error) {
    console.error("Error generating enemies:", error);
    return fallbackEnemies;
  }
};
