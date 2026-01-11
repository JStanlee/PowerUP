
import { GoogleGenAI, Type } from "@google/genai";
import { GoalType, WorkoutSession, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateWorkout = async (profile: UserProfile, history: WorkoutSession[]) => {
  const model = 'gemini-3-flash-preview';
  
  const historyContext = history.length > 0 
    ? history.slice(-3).map(w => {
        return `Data: ${w.date}, Cel: ${w.goal}, Ćwiczenia: ${w.exercises.map(e => `${e.name} (${e.sets.length} serii, trudność średnia: ${e.sets.reduce((acc, s) => acc + s.difficulty, 0) / e.sets.length})`).join(', ')}`;
      }).join('; ')
    : "Brak poprzednich treningów.";

  const prompt = `
    Jesteś światowej klasy trenerem personalnym. 
    Stwórz optymalny trening dla użytkownika o profilu:
    - Imię: ${profile.name}
    - Wiek: ${profile.age} lat
    - Waga: ${profile.weight} kg
    - Wzrost: ${profile.height} cm
    - Cel główny: ${profile.goal}
    - Dokładny cel: ${profile.goalDescription}
    - Kontuzje/Ograniczenia: ${profile.injuries || 'Brak'}
    - Poziom: ${profile.level}
    
    Miejsce: W pełni wyposażona siłownia.
    Kontekst poprzednich treningów: ${historyContext}
    
    Zasady generowania:
    1. Wygeneruj dokładnie 7-9 ćwiczeń siłowych.
    2. Dodaj na samym końcu 1 pozycję Cardio.
    3. WAŻNE: Jeśli użytkownik zgłosił kontuzje, dobierz ćwiczenia tak, aby nie obciążać chorych partii.
    4. Jeśli ostatnie treningi były ocenione jako łatwe (trudność 1-2), zwiększ lekko obciążenie lub objętość.
    5. Jeśli trudność była 5, zachowaj te same parametry lub lekko zmniejsz.
    6. Dobierz ćwiczenia pod cel (np. pod piłkę nożną - dynamika; pod masa mięśniowa - objętość).
    7. W przypadku Cardio, w polu 'repsTarget' podaj liczbę minut, a w 'setsCount' podaj 1.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["STRENGTH", "CARDIO"] },
                setsCount: { type: Type.NUMBER },
                repsTarget: { type: Type.NUMBER, description: "Liczba powtórzeń lub minut dla cardio" },
                suggestedWeight: { type: Type.NUMBER, description: "Sugerowany ciężar w kg (0 dla cardio)" }
              },
              required: ["name", "type", "setsCount", "repsTarget", "suggestedWeight"]
            }
          }
        },
        required: ["exercises"]
      }
    }
  });

  return JSON.parse(response.text);
};
