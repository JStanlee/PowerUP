
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutSession, PlanType } from "../types.ts";

// W PRODUKCJI: Nigdy nie używaj process.env.API_KEY na frontendzie. 
// Zamiast tego zrób fetch('https://twoj-serwer.pl/api/ai/workout')
// który po stronie serwera wywoła Gemini i zwróci wynik.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export const generateWorkout = async (profile: UserProfile, history: WorkoutSession[], selectedPlan: PlanType) => {
  const lastSessions = history.slice(-5).map(s => ({
    type: s.planType,
    title: s.workoutTitle,
    exercises: s.exercises.map(e => e.name)
  }));

  const prompt = `
    Jesteś elitarnym trenerem personalnym "Wykuci AI". Stwórz plan: ${selectedPlan}.
    Odpowiadaj po polsku. Użytkownik: ${profile.name}, Cel: ${profile.goal}.
    Pamiętaj o kontuzjach: ${profile.injuries || "Brak"}.
    Zwróć JSON: workoutTitle, warmup[name, duration, instructions], exercises[name, muscleGroup, isBodyweight, isTimed, setsCount, repsTarget, suggestedWeight, durationMinutes, restTime].
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          workoutTitle: { type: Type.STRING },
          warmup: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                duration: { type: Type.STRING },
                instructions: { type: Type.STRING }
              },
              required: ["name", "duration", "instructions"]
            }
          },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                muscleGroup: { type: Type.STRING },
                isBodyweight: { type: Type.BOOLEAN },
                isTimed: { type: Type.BOOLEAN },
                setsCount: { type: Type.NUMBER },
                repsTarget: { type: Type.NUMBER },
                suggestedWeight: { type: Type.NUMBER },
                durationMinutes: { type: Type.NUMBER },
                restTime: { type: Type.NUMBER }
              },
              required: ["name", "muscleGroup", "isBodyweight", "isTimed", "setsCount", "repsTarget", "suggestedWeight", "restTime"]
            }
          }
        },
        required: ["workoutTitle", "warmup", "exercises"]
      }
    }
  });
  return JSON.parse(response.text.trim());
};

export const swapExercise = async (profile: UserProfile, currentExerciseName: string, muscleGroup: string) => {
  const prompt = `Zaproponuj 1 alternatywę dla "${currentExerciseName}" na partię: ${muscleGroup}. Odpowiadaj po polsku. Zwróć JSON.`;
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim());
};

export const getCoachTip = async (profile: UserProfile, exerciseName: string) => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Krótka wskazówka techniczna dla: ${exerciseName}. Po polsku. Max 100 znaków.`,
  });
  return response.text || "";
};

export const generateExerciseImage = async (exerciseName: string) => {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: { parts: [{ text: `Fitness exercise illustration: ${exerciseName}. Dark background, gold glowing highlights.` }] },
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};
