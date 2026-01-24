import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutSession, PlanType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const getLangInstruction = (lang: string) => lang === 'en' ? "Respond in English." : "Odpowiadaj po polsku.";

export const generateWorkout = async (profile: UserProfile, history: WorkoutSession[], selectedPlan: PlanType) => {
  const lastSessions = history.slice(-5).map(s => ({
    type: s.planType,
    title: s.workoutTitle,
    exercises: s.exercises.map(e => e.name)
  }));

  const prompt = `
    Jesteś elitarnym trenerem personalnym silnika "Wykuci AI". Twoim zadaniem jest stworzenie planu: ${selectedPlan}.
    ${getLangInstruction(profile.language)}
    Użytkownik: ${profile.name}, Cel: ${profile.goal}, Poziom: ${profile.level}.
    Kontuzje i ograniczenia: ${profile.injuries || "Brak"}.
    
    HISTORIA OSTATNICH TRENINGÓW:
    ${JSON.stringify(lastSessions)}

    ZASADY ROZGRZEWKI (PROTOKÓŁ RAMP):
    Zaproponuj 4-5 ćwiczeń rozgrzewkowych:
    1. Raise: Podniesienie tętna.
    2. Mobilize: Dynamiczna mobilizacja.
    3. Activate: Aktywacja mięśni docelowych.
    4. Potentiate: Przygotowanie układu nerwowego.

    ZASADY MERYTORYCZNE:
    - PUSH: Klatka, Barki (przód/bok), Triceps.
    - PULL: Plecy, Barki (tył), Biceps.
    - LEGS: Nogi, Pośladki, Łydki.
    - FBW: Całe ciało.
    
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
  
  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text.trim());
};

export const swapExercise = async (profile: UserProfile, currentExerciseName: string, muscleGroup: string) => {
  const prompt = `Zaproponuj 1 alternatywę dla "${currentExerciseName}" na partię: ${muscleGroup}. Zwróć JSON.`;
  
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
  });
  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text.trim());
};

export const getCoachTip = async (profile: UserProfile, exerciseName: string) => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Krótka wskazówka techniczna dla: ${exerciseName}. Max 100 znaków.`,
  });
  return response.text || "";
};

export const generateExerciseImage = async (exerciseName: string) => {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: { parts: [{ text: `Fitness exercise illustration: ${exerciseName}. Anatomical focus, gold highlights.` }] },
  });
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};