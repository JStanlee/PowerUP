
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutSession, PlanType } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const getLangInstruction = (lang: string) => lang === 'en' ? "Respond in English." : "Odpowiadaj po polsku.";

export const generateWorkout = async (profile: UserProfile, history: WorkoutSession[], selectedPlan: PlanType) => {
  // Przygotowanie kontekstu historycznego dla AI
  const lastSessions = history.slice(-5).map(s => ({
    type: s.planType,
    title: s.workoutTitle,
    exercises: s.exercises.map(e => e.name)
  }));

  const prompt = `
    Jesteś elitarnym trenerem personalnym silnika "Wykuci AI". Twoim zadaniem jest stworzenie planu: ${selectedPlan}.
    ${getLangInstruction(profile.language)}
    Użytkownik: ${profile.name}, Cel: ${profile.goal}, Poziom: ${profile.level}.
    Kontuzje i ograniczenia (OMUJAJ TE STREFY LUB ZAPROPONUJ REHABILITACYJNĄ ROZGRZEWKĘ): ${profile.injuries || "Brak"}.
    
    HISTORIA OSTATNICH TRENINGÓW:
    ${JSON.stringify(lastSessions)}

    ZASADY ROZGRZEWKI (PROTOKÓŁ RAMP):
    Zaproponuj 4-5 ćwiczeń rozgrzewkowych dostosowanych do typu treningu:
    1. Raise: Podniesienie tętna (np. pajacyki, bieg w miejscu).
    2. Mobilize: Dynamiczna mobilizacja stawów, które będą najbardziej obciążone (np. krążenia ramion dla Push, "cat-cow" dla pleców, mobilizacja stawu skokowego dla Legs).
    3. Activate: Lekka aktywacja mięśni docelowych (np. gumy oporowe, plank, mostki biodrowe).
    4. Potentiate: Przygotowanie układu nerwowego (np. eksplozywne ruchy o niskiej intensywności).

    ZASADY LOGIKI SEKWENCYJNEJ DLA PPL:
    1. Przeanalizuj ostatni trening PPL w historii. 
    2. Jeśli ostatni był "Push" -> zrób "Pull". 
    3. Jeśli ostatni był "Pull" -> zrób "Legs". 
    4. Jeśli ostatni był "Legs" -> zrób "Push".
    5. Jeśli brak historii PPL -> zacznij od "Push".
    6. UNIKANIE POWTÓRZEŃ: Nie proponuj ćwiczeń z 2 ostatnich sesji.

    ZASADY MERYTORYCZNE (DODAJ PARTIE AKCESORYJNE):
    - PUSH: Klatka, Barki (przód/bok) ORAZ TRICEPS (minimum 1-2 ćwiczenia na triceps).
    - PULL: Plecy (lats/traps), Barki (tył) ORAZ BICEPS (minimum 1-2 ćwiczenia na biceps).
    - LEGS: Czworogłowe, dwugłowe, pośladki ORAZ ŁYDKI.
    - FBW: Zawsze 1x Dół, 1x Plecy, 1x Klatka, 1x Barki + 1x Ramiona (Biceps/Triceps).
    - CARDIO: Skup się na wytrzymałości, podawaj czas w minutach.
    - BODYWEIGHT (BW): Jeśli ćwiczenie jest bez sprzętu, ustaw 'isBodyweight' na true i 'suggestedWeight' na 0.
    
    Zwróć JSON: workoutTitle (np. "Push - Klatka, Barki i Triceps"), warmup[name, duration, instructions], exercises[name, muscleGroup, isBodyweight, isTimed, setsCount, repsTarget, suggestedWeight, durationMinutes, restTime].
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
  const prompt = `Jesteś silnikiem "Wykuci AI". Zaproponuj 1 merytorycznie identyczną alternatywę dla "${currentExerciseName}" na partię: ${muscleGroup}. 
  Omijaj: ${profile.injuries || "nic"}. ${getLangInstruction(profile.language)} Zwróć JSON.`;
  
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
  return JSON.parse(response.text.trim());
};

export const getCoachTip = async (profile: UserProfile, exerciseName: string) => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Jesteś silnikiem "Wykuci AI". Podaj krótką, merytoryczną wskazówkę techniczną dla: ${exerciseName}. ${getLangInstruction(profile.language)} Max 100 znaków.`,
  });
  return response.text || "";
};

export const generateExerciseImage = async (exerciseName: string) => {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: { parts: [{ text: `Fitness exercise illustration: ${exerciseName}. Anatomical focus, dark background, gold glowing highlights.` }] },
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};
