
import { AppState, UserProfile, WorkoutSession } from "../types.ts";

// W wersji produkcyjnej zamień localStorage na wywołania API Twojego backendu lub Firebase
const STORAGE_KEY = 'wykuci_db_v1';

export const saveStateToCloud = async (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // Tu dodasz: await fetch('https://twoj-backend.pl/api/sync', { method: 'POST', body: JSON.stringify(state) })
};

export const loadStateFromCloud = async (): Promise<AppState> => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  return { user: null, profile: null, history: [], activeWorkout: null };
};

export const deleteAccountFromCloud = async (uid: string) => {
  localStorage.removeItem(STORAGE_KEY);
  // Tu dodasz wywołanie usuwające dane z bazy na serwerze
};
