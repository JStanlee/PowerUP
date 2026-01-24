
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoalType, UserProfile, WorkoutSession, AppState, ExerciseLog, PlanType, Gender } from './types.ts';
import { generateWorkout, getCoachTip, generateExerciseImage, swapExercise } from './services/geminiService.ts';

const STORAGE_KEY = 'wykuci_black_edition_v3';

const latinize = (str: string | undefined | null) => {
  if (!str) return '';
  const mapping: {[key: string]: string} = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return str.split('').map(char => mapping[char] || char).join('');
};

const triggerHaptic = (enabled: boolean, pattern: number | number[]) => {
  if (enabled && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(pattern);
  }
};

const PLAN_ICONS: Record<PlanType, string> = {
  [PlanType.AI_ADVISOR]: "fa-wand-magic-sparkles",
  [PlanType.FBW]: "fa-dumbbell",
  [PlanType.PPL]: "fa-arrows-split-up-and-left",
  [PlanType.SPLIT]: "fa-layer-group",
  [PlanType.HOME_BODYWEIGHT]: "fa-house-user",
  [PlanType.CARDIO]: "fa-person-running"
};

const COMMON_INJURIES = [
  "Brak ograniczeń",
  "Kręgosłup lędźwiowy",
  "Kręgosłup szyjny",
  "Kolana",
  "Barki / Stożek rotatorów",
  "Nadgarstki",
  "Stawy skokowe",
  "Łokieć (tenisisty/golfisty)",
  "Inne / Wiele obszarów"
];

const T = {
  dashboard: "Panel",
  history: "Historia",
  settings: "Profil",
  startWorkout: "ROZPOCZNIJ TRENING",
  newPlan: "Wybierz Styl",
  activeWorkout: "Sesja Treningowa",
  rest: "Odpoczynek",
  finish: "Zakończ",
  save: "Zapisz",
  kg: "kg",
  reps: "powt.",
  sets: "Serie",
  notes: "Notatki",
  onboardingTitle: "Wykuci AI",
  next: "Dalej",
  back: "Wróć",
  aiTip: "Wskazówka AI",
  swap: "Zmień ćwiczenie",
  visual: "Obraz AI",
  congrats: "Trening Ukończony!",
  xp: "XP Zdobyte",
  level: "Poziom",
  proTitle: "Wykuj Moc PRO",
  proDesc: "Brak reklam, nielimitowane AI.",
  getPro: "AKTYWUJ PRO (30 DNI)",
  isPro: "JESTEŚ PRO",
  exportPdf: "EKSPORTUJ PDF",
  workoutDetails: "Szczegóły Treningu",
  adLabel: "REKLAMA",
  proUpsell: "Darmowy limit wymian wyczerpany. Chcesz odblokować nielimitowane funkcje AI?",
  watchAd: "OBEJRZYJ REKLAMĘ (+1 wymiana)",
  watchAdProgress: "Trwa odtwarzanie reklamy...",
  language: "Język",
  gender: "Płeć",
  male: "Mężczyzna",
  female: "Kobieta",
  other: "Nie chcę podawać",
  goal: "Twój Cel",
  suggested: "SUGEROWANE",
  deleteEx: "Usuń ćwiczenie",
  confirmDelete: "Czy na pewno chcesz usunąć to ćwiczenie z obecnego treningu?",
  warmupTitle: "Rozgrzewka AI",
  startMain: "ROZPOCZNIJ TRENING GŁÓWNY",
  experienceLevel: "Twój Poziom",
  age: "Wiek",
  weight: "Waga (kg)",
  height: "Wzrost (cm)",
  powerScore: "Power Score",
  injuriesLabel: "Kontuzje i ograniczenia",
  injuriesPlaceholder: "Wybierz obszar...",
  defaultPlanLabel: "Domyślny Styl Treningu",
  pdfLocked: "Eksport do PDF dostępny tylko dla użytkowników PRO.",
  hapticsLabel: "Sygnały Haptyczne (Wibracje)",
  levels: {
    początkujący: "Początkujący",
    średniozaawansowany: "Średniozaawansowany",
    zaawansowany: "Zaawansowany"
  },
  planTypes: {
    [PlanType.AI_ADVISOR]: "Doradca AI",
    [PlanType.FBW]: "Full Body Workout",
    [PlanType.PPL]: "Push Pull Legs",
    [PlanType.SPLIT]: "Split",
    [PlanType.HOME_BODYWEIGHT]: "Trening Domowy",
    [PlanType.CARDIO]: "Cardio / Kondycja"
  }
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const BannerAd = () => (
  <div className="w-full glass h-10 flex items-center justify-center border-t border-white/5 relative overflow-hidden shrink-0">
    <span className="absolute top-1 left-2 text-[6px] font-black text-slate-400 uppercase tracking-tighter">{T.adLabel}</span>
    <div className="flex items-center gap-3 opacity-20">
      <i className="fa-solid fa-rectangle-ad text-lg text-gold"></i>
      <div className="w-24 h-1 bg-slate-800 rounded-full animate-pulse"></div>
    </div>
  </div>
);

const FullscreenAd = ({ onClose }: { onClose: () => void }) => {
  const [timer, setTimer] = useState(3);
  
  useEffect(() => {
    const i = setInterval(() => setTimer(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (timer === 0) {
      const timeout = setTimeout(onClose, 300);
      return () => clearTimeout(timeout);
    }
  }, [timer, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 animate-fadeIn">
      <div className="w-full max-sm aspect-[9/16] bg-slate-900 rounded-3xl flex flex-col items-center justify-center gap-6 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] glass-card overflow-hidden p-6 relative">
        <div className="absolute top-4 right-4 text-xs font-black text-slate-500 bg-black/40 px-2 py-1 rounded-lg">
          Zamykanie za {timer}s
        </div>
        <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 shadow-inner">
           <i className="fa-solid fa-bolt text-5xl text-gold animate-bounce"></i>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">{T.adLabel}</p>
          <h3 className="text-2xl font-black uppercase text-gold tracking-tight">WYKUCI PRO</h3>
          <p className="text-sm text-slate-300 font-medium opacity-80 px-4">Twoja transformacja nie zna granic.</p>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4">
           <div className="h-full bg-gold animate-shimmer gold-shimmer" style={{ width: `${100 - (timer * 33.3)}%` }}></div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ state: AppState, setState: any }> = ({ state, setState }) => {
  const isWorkoutActive = !!state.activeWorkout;
  const isPro = state.profile?.isPro;

  const performanceData = useMemo(() => {
    return state.history.slice(-7).map(s => {
      const totalVolume = s.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sacc, set) => sacc + (set.weight * set.reps), 0), 0
      );
      const intensityBonus = s.exercises.length * 10;
      const userWeightFactor = state.profile?.weight || 80;
      const score = Math.round((totalVolume / userWeightFactor) + intensityBonus);
      
      return {
        date: new Date(s.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
        value: score
      };
    });
  }, [state.history, state.profile?.weight]);

  const streakDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const hasWorkout = state.history.some(s => new Date(s.date).toDateString() === d.toDateString());
      days.push({ day: d.toLocaleDateString('pl-PL', { weekday: 'narrow' }), active: hasWorkout });
    }
    return days;
  }, [state.history]);

  return (
    <div className="flex-1 px-5 pt-4 overflow-y-auto no-scrollbar space-y-4 animate-fadeIn safe-pt">
      <header className="flex justify-between items-end mb-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
             <i className="fa-solid fa-user-shield text-gold text-xl shrink-0"></i>
             <h1 className="text-xl font-black tracking-tighter text-white truncate max-w-[180px]">Hej, {state.profile?.name}</h1>
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-slate-100 text-[9px] font-black uppercase tracking-wider">Gotowy do akcji</p>
          </div>
        </div>
        <div className="glass px-2.5 py-1 rounded-lg border border-gold/30 flex items-center gap-1.5 shadow-inner shrink-0">
           <span className="text-[9px] font-black text-gold">LVL {state.profile?.gymRat.level}</span>
        </div>
      </header>

      {!isPro && (
        <div className="glass-card border border-gold/30 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">Wykuj Wersję PRO</h4>
            <p className="text-[9px] text-slate-400 font-medium">Brak reklam i nielimitowane AI.</p>
          </div>
          <Link to="/settings" className="gold-shimmer px-3 py-2 rounded-lg text-white font-black text-[9px] uppercase tracking-tighter tap-scale">ODBLOKUJ</Link>
        </div>
      )}

      <div className="glass p-3.5 rounded-2xl border border-white/5 flex justify-between items-center shadow-xl">
        {streakDays.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{d.day}</span>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 ${d.active ? 'bg-gold/20 border-gold shadow-[0_0_8px_rgba(212,175,55,0.3)]' : 'bg-slate-900 border-white/5'}`}>
              <i className={`fa-solid fa-fire text-[10px] ${d.active ? 'text-gold' : 'text-slate-700'}`}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4 border border-white/5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 opacity-90">
              <i className="fa-solid fa-bolt-lightning text-gold text-[10px]"></i>
              <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{T.powerScore}</h3>
           </div>
           <div className="text-[7px] font-black text-gold bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20 uppercase">Trend</div>
        </div>
        
        <div className="h-36 w-full">
          {performanceData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#4b5563', fontSize: 7, fontWeight: 800 }} 
                  dy={8}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ background: '#0a0a0a', border: '1px solid #D4AF37', borderRadius: '12px', fontSize: '9px', color: '#fff' }}
                  itemStyle={{ color: '#D4AF37', fontWeight: '900' }}
                  cursor={{ stroke: '#D4AF37', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#D4AF37" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={2} 
                  dot={{ fill: '#D4AF37', stroke: '#000', strokeWidth: 2, r: 3 }} 
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
               <i className="fa-solid fa-chart-line text-2xl"></i>
               <p className="text-[9px] font-black uppercase tracking-widest">Wykuj pierwszy trening!</p>
            </div>
          )}
        </div>
      </div>

      <Link 
        to={isWorkoutActive ? "/active" : "/new-plan"} 
        className="block w-full gold-shimmer p-4 rounded-xl text-center shadow-[0_12px_24px_rgba(212,175,55,0.25)] tap-scale transition-all"
      >
        <span className="text-white font-black text-sm tracking-widest uppercase">
          {isWorkoutActive ? "KONTYNUUJ SESJĘ" : T.startWorkout}
        </span>
      </Link>
      
      <div className="h-2"></div>
    </div>
  );
};

const ActiveWorkout: React.FC<{ state: AppState, onUpdate: (w: WorkoutSession) => void, onSetPrefRest: (t: number) => void, onFinish: (n: string, d: number) => void, onTogglePro: () => void }> = ({ state, onUpdate, onSetPrefRest, onFinish, onTogglePro }) => {
  const workout = state.activeWorkout;
  const isPro = state.profile?.isPro;
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(workout?.durationSeconds || 0);
  const [restTime, setRestTime] = useState<number | null>(null);
  const [restFinishedFlash, setRestFinishedFlash] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [notes, setNotes] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiModal, setAiModal] = useState<{title: string, content: string | null, img: string | null} | null>(null);
  const [currentActionEx, setCurrentActionEx] = useState<ExerciseLog | null>(null);

  const timerRef = useRef<number | null>(null);
  const restRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (workout && !expandedEx && workout.warmupCompleted) {
      const first = workout.exercises.find(e => !e.sets.every(s => s.completed));
      if (first) setExpandedEx(first.id);
    }
  }, [workout]);

  if (!workout) return <Navigate to="/" />;

  if (!workout.warmupCompleted) {
    return (
      <div className="flex-1 flex flex-col h-full bg-black relative overflow-hidden safe-pt">
        <header className="px-5 py-4 glass border-b border-white/5 flex items-center gap-3">
          <i className="fa-solid fa-fire text-gold"></i>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white">{T.warmupTitle}</h2>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
           {workout.warmup.map((ex, idx) => (
             <div key={idx} className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-black text-white uppercase tracking-tight">{ex.name}</h3>
                  <span className="bg-gold/20 text-gold text-[10px] font-black px-2 py-1 rounded-lg border border-gold/30">{ex.duration}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium italic opacity-80">"{ex.instructions}"</p>
             </div>
           ))}
        </div>
        <div className="p-5 safe-area-pb">
          <button onClick={() => onUpdate({ ...workout, warmupCompleted: true })} className="w-full gold-shimmer py-4 rounded-xl text-white font-black uppercase tracking-widest tap-scale shadow-2xl">
            {T.startMain}
          </button>
        </div>
      </div>
    );
  }

  const startRest = (time: number) => {
    setRestTime(time);
    setRestFinishedFlash(false);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = window.setInterval(() => {
      setRestTime(prev => {
        if (prev && prev > 1) return prev - 1;
        if (restRef.current) clearInterval(restRef.current);
        triggerHaptic(state.profile?.hapticsEnabled || false, [100, 50, 100]);
        setRestFinishedFlash(true);
        setTimeout(() => setRestFinishedFlash(false), 2000);
        return null;
      });
    }, 1000);
  };

  const handleToggleSet = (exId: string, setIdx: number) => {
    const updated = {...workout};
    const ex = updated.exercises.find(e => e.id === exId);
    if (!ex) return;
    const isNowCompleted = !ex.sets[setIdx].completed;
    ex.sets[setIdx].completed = isNowCompleted;
    if (isNowCompleted) {
      triggerHaptic(state.profile?.hapticsEnabled || false, 20);
      startRest(state.profile?.preferredRestTime || 60);
    }
    if (ex.sets.every(s => s.completed)) {
      const nextEx = updated.exercises.find(e => !e.sets.every(s => s.completed));
      if (nextEx) setExpandedEx(nextEx.id);
    }
    onUpdate({...updated, durationSeconds: seconds});
  };

  const executeSwap = async (ex: ExerciseLog) => {
    setLoadingAI(true);
    try {
      const res = await swapExercise(state.profile!, ex.name, ex.muscleGroup);
      const newEx: ExerciseLog = {
        id: `ex-${Date.now()}`,
        name: res.name,
        muscleGroup: res.muscleGroup,
        isBodyweight: res.isBodyweight,
        isTimed: res.isTimed,
        sets: Array(res.setsCount).fill(0).map(() => ({ 
          reps: res.repsTarget, 
          weight: res.suggestedWeight, 
          completed: false, 
          difficulty: 3,
          durationMinutes: res.durationMinutes 
        }))
      };
      onUpdate({...workout, exercises: workout.exercises.map(e => e.id === ex.id ? newEx : e), swapsUsed: workout.swapsUsed + 1});
    } finally { setLoadingAI(false); }
  };

  const handleAISwap = async (ex: ExerciseLog) => {
    if (!isPro && workout.swapsUsed >= 1) { 
      setCurrentActionEx(ex);
      setShowUpsell(true); 
      return; 
    }
    await executeSwap(ex);
  };

  const handleWatchAd = () => {
    setIsWatchingAd(true);
    setTimeout(() => {
      setIsWatchingAd(false);
      setShowUpsell(false);
      if (currentActionEx) executeSwap(currentActionEx);
    }, 4000);
  };

  const handleAIGuide = async (ex: ExerciseLog) => {
    if (!isPro && workout.visualsUsed >= 1) { 
      setCurrentActionEx(ex);
      setShowUpsell(true); 
      return; 
    }
    setLoadingAI(true);
    setAiModal({ title: ex.name, content: "Generowanie...", img: null });
    try {
      const tip = await getCoachTip(state.profile!, ex.name);
      const img = await generateExerciseImage(ex.name);
      setAiModal({ title: ex.name, content: tip, img: img });
      onUpdate({...workout, visualsUsed: workout.visualsUsed + 1});
    } finally { setLoadingAI(false); }
  };

  const weightRange = Array.from({length: 501}, (_, i) => i * 0.5);
  const repsRange = Array.from({length: 51}, (_, i) => i);
  const timeRange = Array.from({length: 121}, (_, i) => i);

  return (
    <div className={`flex-1 flex flex-col h-full bg-black relative overflow-hidden safe-pt transition-colors duration-500 ${restFinishedFlash ? 'bg-gold/10' : ''}`}>
      <header className="px-5 py-2.5 glass border-b border-white/5 flex flex-col gap-2 z-20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">{workout.workoutTitle}</h2>
            <span className="text-white text-sm font-black tabular-nums">{formatTime(seconds)}</span>
          </div>
          <div className="flex-1 flex justify-center">
            {restTime !== null && (
              <div className="bg-gold/10 px-3 py-1 rounded-lg border border-gold/30 glass animate-pulse text-[10px] font-black text-gold tabular-nums">
                 {restTime}s
              </div>
            )}
            {restFinishedFlash && restTime === null && (
              <div className="bg-gold text-black px-3 py-1 rounded-lg border border-white/30 font-black text-[10px] uppercase animate-bounce">
                 KONIEC PRZERWY!
              </div>
            )}
          </div>
          <button onClick={() => setShowFinish(true)} className="px-3 py-1.5 bg-white text-black rounded-lg font-black text-[9px] uppercase tracking-tighter shadow-lg tap-scale">ZAKOŃCZ</button>
        </div>
        
        <div className="flex items-center gap-2">
           <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Przerwa:</span>
           {[45, 60, 90].map(time => (
             <button 
                key={time} 
                onClick={() => onSetPrefRest(time)}
                className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${state.profile?.preferredRestTime === time ? 'bg-gold text-black' : 'bg-slate-800 text-slate-400 border border-white/5'}`}
              >
               {time}s
             </button>
           ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5">
        {workout.exercises.map(ex => {
          const isDone = ex.sets.every(s => s.completed);
          const isExp = expandedEx === ex.id;
          return (
            <div key={ex.id} className={`rounded-2xl border transition-all duration-500 glass shadow-2xl ${isDone ? 'border-gold/10 opacity-50' : 'border-white/5'} overflow-hidden`}>
              <div onClick={() => { setExpandedEx(isExp ? null : ex.id); triggerHaptic(state.profile?.hapticsEnabled || false, 5); }} className="p-3.5 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className={`text-xs font-black uppercase tracking-tight leading-tight line-clamp-2 ${isDone ? 'text-gold line-through' : 'text-white'}`}>{ex.name}</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{ex.muscleGroup} • {ex.sets.length} {T.sets}</p>
                </div>
                <div className="flex gap-1.5 shrink-0 ml-1">
                  <button onClick={(e) => { e.stopPropagation(); handleAIGuide(ex); }} className="w-7 h-7 rounded-lg glass border border-white/10 flex items-center justify-center text-[9px] text-white tap-scale"><i className="fa-solid fa-wand-magic-sparkles"></i></button>
                  <button onClick={(e) => { e.stopPropagation(); handleAISwap(ex); }} className="w-7 h-7 rounded-lg glass border border-white/10 flex items-center justify-center text-[9px] text-white tap-scale"><i className="fa-solid fa-arrows-rotate"></i></button>
                </div>
              </div>
              
              <div className={`expandable-grid ${isExp ? 'expanded' : ''}`}>
                <div className="expandable-content">
                  <div className="px-3.5 pb-3.5 space-y-2.5">
                    {ex.sets.map((set, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${set.completed ? 'bg-gold/5 border-gold/20' : 'bg-black/40 border-white/5'}`}>
                        <span className="text-[9px] font-black text-slate-500 w-2.5">{idx + 1}</span>
                        <div className="flex-1 flex justify-start items-center gap-5 px-1">
                          <div className="flex flex-col items-start w-16">
                            {ex.isTimed ? (
                               <>
                                 <select 
                                   value={set.durationMinutes} 
                                   onChange={e => {
                                      const up = {...workout};
                                      const t_ = up.exercises.find(e_ => e_.id === ex.id);
                                      if (t_) t_.sets[idx].durationMinutes = Number(e.target.value);
                                      onUpdate(up);
                                   }} 
                                   className="bg-transparent text-white font-black text-xs outline-none w-full text-left py-0.5 appearance-none cursor-pointer"
                                 >
                                   {timeRange.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                 </select>
                                 <span className="text-[6px] text-slate-500 font-black uppercase mt-0.5 tracking-tighter">MIN</span>
                               </>
                            ) : (
                              <>
                                {ex.isBodyweight ? (
                                  <div className="text-gold font-black text-xs py-0.5">BW</div>
                                ) : (
                                  <select 
                                    value={set.weight} 
                                    onChange={e => {
                                       const up = {...workout};
                                       const t_ = up.exercises.find(e_ => e_.id === ex.id);
                                       if (t_) t_.sets[idx].weight = Number(e.target.value);
                                       onUpdate(up);
                                    }} 
                                    className="bg-transparent text-white font-black text-xs outline-none w-full text-left py-0.5 appearance-none cursor-pointer"
                                  >
                                    {weightRange.map(w => <option key={w} value={w} className="bg-slate-900">{w} kg</option>)}
                                  </select>
                                )}
                                <span className="text-[6px] text-slate-500 font-black uppercase mt-0.5 tracking-tighter">{ex.isBodyweight ? 'MASA CIAŁA' : 'CIĘŻAR'}</span>
                              </>
                            )}
                          </div>
                          {!ex.isTimed && (
                            <div className="flex flex-col items-start w-14">
                              <select 
                                value={set.reps} 
                                onChange={e => {
                                   const up = {...workout};
                                   const t_ = up.exercises.find(e_ => e_.id === ex.id);
                                   if (t_) t_.sets[idx].reps = Number(e.target.value);
                                   onUpdate(up);
                                }} 
                                className="bg-transparent text-white font-black text-xs outline-none w-full text-left py-0.5 appearance-none cursor-pointer"
                              >
                                {repsRange.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                              </select>
                              <span className="text-[6px] text-slate-500 font-black uppercase mt-0.5 tracking-tighter">POWT</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleToggleSet(ex.id, idx)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${set.completed ? 'bg-gold text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
                          <i className="fa-solid fa-check text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loadingAI && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-10 text-center gap-6 animate-fadeIn">
           <div className="w-10 h-10 gold-shimmer rounded-lg animate-pulse-slow shadow-2xl"></div>
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gold animate-pulse">Analiza Wykuci AI...</p>
        </div>
      )}

      {aiModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[200] p-5 flex flex-col items-center justify-center text-center animate-fadeIn" onClick={() => setAiModal(null)}>
          <div className="glass-card border border-gold/30 rounded-3xl p-5 w-full max-w-sm space-y-5 shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative z-10 flex flex-col gap-4">
              <h3 className="text-lg font-black uppercase text-gold leading-tight tracking-tight">{aiModal.title}</h3>
              {aiModal.img && (
                <div className="relative">
                  <div className="absolute -inset-2 bg-gold/10 rounded-2xl blur-xl opacity-20"></div>
                  <img src={aiModal.img} className="relative w-full aspect-square object-cover rounded-2xl border border-white/10 shadow-2xl" />
                </div>
              )}
              <div className="bg-black/50 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                <p className="text-[11px] font-medium text-slate-100 italic leading-relaxed">
                  <i className="fa-solid fa-quote-left text-gold/20 mr-1.5"></i>
                  {aiModal.content}
                  <i className="fa-solid fa-quote-right text-gold/20 ml-1.5"></i>
                </p>
              </div>
              <button onClick={() => setAiModal(null)} className="gold-shimmer w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-white shadow-xl tap-scale text-[10px]">ROZUMIEM</button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
          </div>
        </div>
      )}

      {showUpsell && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-[400] p-6 flex flex-col items-center justify-center text-center animate-fadeIn">
           {isWatchingAd ? (
             <div className="flex flex-col items-center gap-5 animate-pulse">
                <i className="fa-solid fa-clapperboard text-5xl text-gold"></i>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{T.watchAdProgress}</p>
                <div className="w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-gold animate-shimmer gold-shimmer" style={{ width: '100%' }}></div>
                </div>
             </div>
           ) : (
             <div className="glass-card border border-gold/40 rounded-3xl p-7 w-full max-sm space-y-7 shadow-[0_0_100px_rgba(0,0,0,1)]">
                <div className="w-16 h-16 gold-shimmer rounded-2xl flex items-center justify-center text-white text-3xl mx-auto shadow-2xl"><i className="fa-solid fa-crown"></i></div>
                <div className="space-y-2.5">
                  <h3 className="text-xl font-black uppercase text-gold leading-none tracking-tighter">LIMIT AI WYCZERPANY</h3>
                  <p className="text-slate-400 text-[10px] font-medium italic opacity-90 leading-relaxed px-4">"{T.proUpsell}"</p>
                </div>
                
                <div className="space-y-2.5">
                  <button onClick={() => { onTogglePro(); setShowUpsell(false); }} className="gold-shimmer w-full py-4 rounded-xl font-black uppercase tracking-widest text-white shadow-xl tap-scale flex items-center justify-center gap-2.5 text-[11px]">
                     <i className="fa-solid fa-bolt"></i>
                     ODBLOKUJ PRO
                  </button>
                  <button onClick={handleWatchAd} className="w-full py-3.5 bg-slate-800/80 border border-white/5 rounded-xl text-slate-100 font-black uppercase text-[9px] tracking-widest tap-scale flex items-center justify-center gap-2.5">
                     <i className="fa-solid fa-video text-gold"></i>
                     {T.watchAd}
                  </button>
                </div>
                
                <button onClick={() => setShowUpsell(false)} className="text-slate-500 font-black uppercase text-[7px] tracking-[0.5em] hover:text-white transition-all">WRÓĆ DO TRENINGU</button>
             </div>
           )}
        </div>
      )}

      {showFinish && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-[300] p-7 flex flex-col items-center justify-center animate-fadeIn">
          <div className="glass-card border border-gold/40 rounded-3xl p-7 w-full max-sm space-y-5 text-center shadow-2xl">
            <div className="w-12 h-12 gold-shimmer rounded-xl flex items-center justify-center text-white mx-auto shadow-2xl animate-bounce"><i className="fa-solid fa-trophy text-xl"></i></div>
            <h2 className="text-xl font-black uppercase text-white tracking-tight">{T.congrats}</h2>
            <textarea placeholder={T.notes} value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-black/60 rounded-xl p-3.5 border border-white/10 text-[10px] text-white h-24 focus:border-gold outline-none resize-none shadow-inner" />
            <div className="flex gap-3">
              <button onClick={() => setShowFinish(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-lg font-black text-[9px] uppercase tracking-wider">ODRZUĆ</button>
              <button onClick={() => onFinish(notes, seconds)} className="flex-1 gold-shimmer text-white py-3 rounded-lg font-black text-[9px] uppercase shadow-lg tracking-widest">ZAPISZ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryView: React.FC<{ history: WorkoutSession[], profile: UserProfile, onTogglePro: () => void }> = ({ history, profile, onTogglePro }) => {
  const navigate = useNavigate();
  // Fixed incorrect destructuring of useState: changed from [showUpsell, useState] to [showUpsell, setShowUpsell]
  const [showUpsell, setShowUpsell] = React.useState(false);

  const generatePDF = () => {
    if (!profile.isPro) {
      setShowUpsell(true);
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55);
    doc.text(`RAPORT WYKUCI AI: ${latinize(profile.name)}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Status: PRO ACCOUNT`, 14, 27);
    doc.text(`Data generowania: ${new Date().toLocaleDateString()}`, 14, 32);

    const tableData: any[] = [];
    [...history].reverse().forEach((s, sessionIdx) => {
      if (sessionIdx > 0) tableData.push(['', '', '', '', '', '']);
      tableData.push([{ content: latinize(s.workoutTitle || 'Trening'), colSpan: 6, styles: { fillColor: [30, 30, 30], textColor: [212, 175, 55], fontStyle: 'bold' } }]);
      s.exercises.forEach((ex, idx) => {
        ex.sets.forEach((set, setIdx) => {
          tableData.push([
            idx === 0 && setIdx === 0 ? new Date(s.date).toLocaleDateString() : '',
            setIdx === 0 ? latinize(ex.name) : '',
            `S${setIdx + 1}`,
            ex.isBodyweight ? 'BW' : `${set.weight} kg`,
            ex.isTimed ? `${set.durationMinutes} min` : `${set.reps}`,
            formatTime(s.durationSeconds || 0)
          ]);
        });
      });
      if (s.note) tableData.push([{ content: `Notatka: ${latinize(s.note)}`, colSpan: 6, styles: { fontStyle: 'italic', textColor: [150, 150, 150] } }]);
    });

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Cwiczenie', 'Serie', 'Obciazenie', 'Powt/Czas', 'Czas Sesji']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    doc.save(`Raport_Wykuci_${latinize(profile.name)}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto no-scrollbar pt-8 space-y-5 animate-fadeIn safe-pt">
       <header className="flex justify-between items-center">
         <div className="flex items-center gap-3">
            <i className="fa-solid fa-list-check text-gold text-xl"></i>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Historia</h2>
         </div>
         <button onClick={generatePDF} className="w-9 h-9 glass border border-gold/30 rounded-lg text-gold flex items-center justify-center shrink-0 tap-scale">
           <i className={`fa-solid ${profile.isPro ? 'fa-file-pdf' : 'fa-lock'} text-lg`}></i>
         </button>
       </header>
       {history.length === 0 ? (
         <div className="py-20 text-center opacity-10">
           <i className="fa-solid fa-dumbbell text-7xl"></i>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-6">Pusta Historia</p>
         </div>
       ) : (
         <div className="space-y-3.5">
           {[...history].reverse().map(s => (
             <div key={s.id} onClick={() => navigate(`/history/${s.id}`)} className="glass border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl active:bg-gold/5 transition-all tap-scale">
               <div className="flex-1 min-w-0 pr-3">
                 <h4 className="text-sm font-black uppercase text-white truncate tracking-tight">{s.workoutTitle || 'Trening'}</h4>
                 <p className="text-[9px] text-slate-500 font-black uppercase mt-1 tracking-widest">{new Date(s.date).toLocaleDateString()} • {formatTime(s.durationSeconds || 0)}</p>
               </div>
               <i className="fa-solid fa-chevron-right text-gold text-[10px] opacity-40"></i>
             </div>
           ))}
         </div>
       )}
       <div className="h-16"></div>

       {showUpsell && (
         <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[1000] p-7 flex flex-col items-center justify-center text-center animate-fadeIn">
            <div className="glass-card border border-gold/40 rounded-3xl p-7 w-full max-sm space-y-6 shadow-2xl">
               <div className="w-16 h-16 gold-shimmer rounded-2xl flex items-center justify-center text-white text-3xl mx-auto shadow-2xl"><i className="fa-solid fa-crown"></i></div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black uppercase text-gold">WYBIERZ PRO</h3>
                 <p className="text-slate-400 text-xs font-medium italic opacity-90 leading-relaxed px-4">{T.pdfLocked}</p>
               </div>
               <button onClick={() => { onTogglePro(); setShowUpsell(false); }} className="gold-shimmer w-full py-4 rounded-xl font-black uppercase tracking-widest text-white shadow-xl tap-scale text-[11px]">ODBLOKUJ EKSPORT</button>
               <button onClick={() => setShowUpsell(false)} className="text-slate-500 font-black uppercase text-[8px] tracking-[0.4em] hover:text-white">MOŻE PÓŹNIEJ</button>
            </div>
         </div>
       )}
    </div>
  );
};

const WorkoutDetail = ({ history }: { history: WorkoutSession[] }) => {
  const { id } = useParams();
  const workout = history.find(h => h.id === id);
  const navigate = useNavigate();
  if (!workout) return <Navigate to="/history" />;

  return (
    <div className="flex-1 p-5 overflow-y-auto pt-8 space-y-5 no-scrollbar animate-fadeIn safe-pt">
       <header className="flex items-center gap-4">
          <button onClick={() => navigate('/history')} className="w-9 h-9 rounded-lg glass border border-white/10 flex items-center justify-center text-gold shrink-0 tap-scale"><i className="fa-solid fa-chevron-left"></i></button>
          <div className="min-w-0">
            <h2 className="text-lg font-black uppercase text-white truncate tracking-tight">{workout.workoutTitle}</h2>
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{new Date(workout.date).toLocaleDateString()}</p>
          </div>
       </header>
       <div className="grid grid-cols-2 gap-3.5">
          <div className="glass p-3.5 rounded-xl border border-white/5">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Czas trwania</span>
            <p className="text-base font-black text-white mt-0.5 tabular-nums">{formatTime(workout.durationSeconds || 0)}</p>
          </div>
          <div className="glass p-3.5 rounded-xl border border-white/5">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Objętość</span>
            <p className="text-base font-black text-gold mt-0.5 tabular-nums">{workout.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sacc, s) => sacc + (s.weight * s.reps), 0), 0)} kg</p>
          </div>
       </div>
       <div className="space-y-3.5">
          {workout.exercises.map(ex => (
            <div key={ex.id} className="glass-card border border-white/5 rounded-2xl p-4 shadow-xl">
               <h4 className="text-[10px] font-black uppercase text-gold mb-3 tracking-wider">{ex.name}</h4>
               <div className="space-y-1.5">
                 {ex.sets.map((s, idx) => (
                   <div key={idx} className="flex justify-between items-center text-[9px] font-bold py-1.5 border-b border-white/5 last:border-0 opacity-80">
                      <span className="text-slate-400">SERIA {idx + 1}</span>
                      <span className="text-white font-black tabular-nums">
                        {ex.isTimed ? `${s.durationMinutes} MIN` : (ex.isBodyweight ? 'BW' : `${s.weight} KG`) + (ex.isTimed ? '' : ` x ${s.reps} POWT`)}
                      </span>
                   </div>
                 ))}
               </div>
            </div>
          ))}
       </div>
       <div className="h-10"></div>
    </div>
  );
};

const Onboarding: React.FC<{ onComplete: (p: UserProfile) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<any>({ 
    name: '', 
    gender: 'mężczyzna', 
    language: 'pl',
    age: 25, 
    weight: 80, 
    height: 180, 
    goal: GoalType.GYM, 
    injuries: 'Brak ograniczeń', 
    level: 'średniozaawansowany', 
    hapticsEnabled: true
  });
  
  const finish = () => onComplete({ 
    ...profile, 
    onboarded: true, 
    isPro: false, 
    goalDescription: "",
    trainingFrequency: 3,
    preferredDays: [1, 3, 5],
    weightHistory: [{ date: new Date().toISOString(), weight: profile.weight }], 
    gymRat: { name: profile.name, energy: 100, level: 1, xp: 0, lastUpdate: new Date().toISOString() } 
  });

  const ageOptions = Array.from({ length: 86 }, (_, i) => i + 14);
  const weightOptions = Array.from({ length: 171 }, (_, i) => i + 30);
  const heightOptions = Array.from({ length: 111 }, (_, i) => i + 120);

  return (
    <div className="flex-1 flex flex-col p-7 bg-black safe-pt safe-pb justify-center space-y-8 overflow-y-auto no-scrollbar">
      <header className="text-center space-y-2 animate-fadeIn">
        <div className="w-14 h-14 gold-shimmer rounded-2xl flex items-center justify-center text-white text-2xl mx-auto shadow-2xl mb-3"><i className="fa-solid fa-fire"></i></div>
        <h1 className="text-3xl font-black uppercase text-white tracking-tighter">WYKUCI <span className="text-gold">AI</span></h1>
      </header>
      <div className="space-y-5">
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">Tożsamość</label>
              <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full glass border border-white/10 p-4 rounded-xl font-black text-white text-center text-base outline-none focus:border-gold transition-colors" placeholder="WPISZ IMIĘ..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">{T.gender}</label>
              <select 
                value={profile.gender} 
                onChange={e => setProfile({...profile, gender: e.target.value as Gender})}
                className="w-full glass border border-white/10 p-4 rounded-xl font-black text-white outline-none focus:border-gold transition-colors appearance-none bg-black/40 text-sm text-center"
              >
                <option value="mężczyzna">{T.male}</option>
                <option value="kobieta">{T.female}</option>
                <option value="nie chcę podawać">{T.other}</option>
              </select>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
             <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">{T.age}</label>
                <select value={profile.age} onChange={e => setProfile({...profile, age: Number(e.target.value)})} className="glass border border-white/10 w-full p-4 rounded-xl text-center text-white font-black text-base outline-none focus:border-gold appearance-none bg-black/40">
                  {ageOptions.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">{T.weight}</label>
                <select value={profile.weight} onChange={e => setProfile({...profile, weight: Number(e.target.value)})} className="glass border border-white/10 w-full p-4 rounded-xl text-center text-white font-black text-base outline-none focus:border-gold appearance-none bg-black/40">
                  {weightOptions.map(w => <option key={w} value={w} className="bg-slate-900">{w} kg</option>)}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">{T.height}</label>
                <select value={profile.height} onChange={e => setProfile({...profile, height: Number(e.target.value)})} className="glass border border-white/10 w-full p-4 rounded-xl text-center text-white font-black text-base outline-none focus:border-gold appearance-none bg-black/40">
                  {heightOptions.map(h => <option key={h} value={h} className="bg-slate-900">{h} cm</option>)}
                </select>
             </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2.5 animate-fadeIn h-72 overflow-y-auto no-scrollbar pr-1">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1 mb-2">Twój priorytet treningowy</label>
            {Object.values(GoalType).map(g => (
              <button key={g} onClick={() => setProfile({...profile, goal: g})} className={`w-full p-3.5 rounded-xl border font-black text-[9px] uppercase glass tracking-wider text-left pl-5 transition-all ${profile.goal === g ? 'border-gold text-white bg-gold/10 shadow-lg' : 'border-white/5 text-slate-500'}`}>{g}</button>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-5 animate-fadeIn text-center">
            <div className="space-y-3">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">{T.injuriesLabel}</label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto no-scrollbar p-1">
                {COMMON_INJURIES.map(inj => (
                  <button key={inj} onClick={() => setProfile({...profile, injuries: inj})} className={`p-4 rounded-xl border font-black text-[10px] uppercase glass tracking-wider transition-all ${profile.injuries === inj ? 'border-gold text-white bg-gold/10' : 'border-white/5 text-slate-500'}`}>{inj}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-4 bg-slate-900 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest border border-white/5 tap-scale">Wstecz</button>}
        <button onClick={() => step < 4 ? setStep(step + 1) : finish()} className="flex-[2] gold-shimmer text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-2xl tracking-[0.2em] tap-scale">
          {step === 4 ? "WYKUCI PRZEZNACZENIE" : "Dalej"}
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { profile: null, history: [], activeWorkout: null };
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullAd, setShowFullAd] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const togglePro = () => setState(prev => ({ ...prev, profile: prev.profile ? { ...prev.profile, isPro: !prev.profile.isPro } : null }));
  
  const updateProfile = (updates: Partial<UserProfile>) => {
    setState(prev => {
      if (!prev.profile) return prev;
      const newProfile = { ...prev.profile, ...updates };
      if (updates.weight && updates.weight !== prev.profile.weight) {
        newProfile.weightHistory = [...(newProfile.weightHistory || []), { date: new Date().toISOString(), weight: updates.weight }];
      }
      return { ...prev, profile: newProfile };
    });
  };

  const finalizeWorkout = (notes: string, duration: number) => {
    const session = {...state.activeWorkout!, note: notes, durationSeconds: duration};
    const newXp = (state.profile?.gymRat.xp || 0) + 150;
    const newLevel = Math.floor(newXp / 1000) + 1;
    setState({ ...state, history: [...state.history, session], activeWorkout: null, profile: {...state.profile!, gymRat: {...state.profile!.gymRat, xp: newXp, level: newLevel}} });
    if (!state.profile?.isPro) setShowFullAd(true);
    else window.location.hash = '#/';
  };

  if (!state.profile?.onboarded) return <Onboarding onComplete={p => setState({...state, profile: p})} />;

  const ageOptions = Array.from({ length: 86 }, (_, i) => i + 14);
  const weightOptions = Array.from({ length: 171 }, (_, i) => i + 30);
  const heightOptions = Array.from({ length: 111 }, (_, i) => i + 120);

  return (
    <Router>
      <div className="flex-1 flex flex-col h-full bg-black overflow-hidden select-none">
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {isGenerating && (
            <div className="absolute inset-0 z-[1000] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-10 text-center gap-7 animate-fadeIn">
              <div className="w-14 h-14 gold-shimmer rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)] animate-pulse-slow"><i className="fa-solid fa-fire text-white text-2xl"></i></div>
              <h3 className="text-lg font-black uppercase text-white tracking-[0.2em] animate-pulse">PROJEKTOWANIE AI...</h3>
            </div>
          )}
          {showFullAd && <FullscreenAd onClose={() => { setShowFullAd(false); window.location.hash = '#/'; }} />}
          <Routes>
            <Route path="/" element={<Dashboard state={state} setState={setState} />} />
            <Route path="/new-plan" element={
              <div className="flex-1 p-6 space-y-4 overflow-y-auto no-scrollbar pt-10 animate-fadeIn safe-pt">
                <h2 className="text-2xl font-black uppercase text-white text-center mb-5 tracking-tighter">Wybierz Architekturę</h2>
                <div className="grid grid-cols-1 gap-3.5">
                  {Object.values(PlanType).map(p => (
                    <button key={p} onClick={async () => {
                      setIsGenerating(true);
                      try {
                        const res = await generateWorkout(state.profile!, state.history, p);
                        updateProfile({ defaultPlan: p });
                        setState(prev => ({ ...prev, activeWorkout: { id: Date.now().toString(), date: new Date().toISOString(), goal: state.profile!.goal, planType: p, workoutTitle: res.workoutTitle, warmup: res.warmup || [], exercises: res.exercises.map((e: any, i: number) => ({ 
                          id: `ex-${i}-${Date.now()}`, 
                          name: e.name, 
                          muscleGroup: e.muscleGroup, 
                          isBodyweight: e.isBodyweight,
                          isTimed: e.isTimed,
                          sets: Array(e.setsCount).fill(0).map(() => ({ 
                            reps: e.repsTarget, 
                            weight: e.suggestedWeight, 
                            completed: false, 
                            difficulty: 3,
                            durationMinutes: e.durationMinutes
                          })) 
                        })), warmupCompleted: false, swapsUsed: 0, visualsUsed: 0, tipsUsed: 0, durationSeconds: 0 }, profile: { ...prev.profile!, lastPlanType: p, defaultPlan: p } }));
                        window.location.hash = '#/active';
                      } finally { setIsGenerating(false); }
                    }} className="glass border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-gold/30 transition-all active:scale-95 shadow-xl tap-scale group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-gold group-active:scale-110 transition-transform"><i className={`fa-solid ${PLAN_ICONS[p]} text-lg`}></i></div>
                        <h4 className="text-sm font-black uppercase text-white tracking-tight">{T.planTypes[p]}</h4>
                      </div>
                      <i className="fa-solid fa-chevron-right text-gold text-[10px] opacity-40"></i>
                    </button>
                  ))}
                  <button onClick={() => window.location.hash = '#/'} className="text-slate-500 font-black uppercase text-[9px] py-6 tracking-[0.5em] text-center tap-scale">ANULUJ</button>
                </div>
              </div>
            } />
            <Route path="/active" element={<ActiveWorkout state={state} onUpdate={w => setState({...state, activeWorkout: w})} onSetPrefRest={(rest) => updateProfile({ preferredRestTime: rest })} onFinish={finalizeWorkout} onTogglePro={togglePro} />} />
            <Route path="/history" element={<HistoryView history={state.history} profile={state.profile!} onTogglePro={togglePro} />} />
            <Route path="/history/:id" element={<WorkoutDetail history={state.history} />} />
            <Route path="/settings" element={
              <div className="flex-1 p-6 overflow-y-auto no-scrollbar pt-8 space-y-5 animate-fadeIn safe-pt">
                 <h2 className="text-2xl font-black uppercase text-white text-center mb-2 tracking-tighter">Profil Operatora</h2>
                 <div className={`glass-card border rounded-3xl p-5 shadow-2xl relative overflow-hidden transition-all ${state.profile?.isPro ? 'border-gold/30 bg-gold/5' : 'border-white/5'}`}>
                    <div className="relative z-10 flex flex-col gap-3.5">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg ${state.profile?.isPro ? 'gold-shimmer shadow-lg' : 'bg-slate-800'}`}>
                                <i className="fa-solid fa-crown"></i>
                             </div>
                             <h3 className={`text-lg font-black uppercase tracking-tight ${state.profile?.isPro ? 'text-gold' : 'text-white'}`}>{T.proTitle}</h3>
                          </div>
                       </div>
                       <p className="text-[10px] text-slate-400 font-medium italic">"{T.proDesc}"</p>
                       {!state.profile?.isPro && (
                          <button onClick={togglePro} className="gold-shimmer w-full py-3.5 rounded-xl text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl tap-scale">
                             {T.getPro}
                          </button>
                       )}
                       {state.profile?.isPro && (
                          <button onClick={togglePro} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 font-black uppercase text-[8px] tracking-widest tap-scale">
                             DEZAKTYWUJ PRO
                          </button>
                       )}
                    </div>
                 </div>
                 <div className="glass-card border border-white/5 p-5 rounded-3xl space-y-5 shadow-2xl">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 gold-shimmer rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg">{state.profile?.name.charAt(0)}</div>
                       <div className="flex-1">
                         <input type="text" value={state.profile?.name} onChange={e => updateProfile({ name: e.target.value })} className="bg-transparent text-xl font-black text-white outline-none w-full border-b border-white/10 py-1" />
                         <p className="text-[9px] font-black text-gold uppercase mt-1 tracking-widest">{state.profile?.goal}</p>
                       </div>
                    </div>
                    <div className="space-y-4 pt-2">
                       <div className="flex items-center justify-between">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{T.hapticsLabel}</label>
                          <button onClick={() => updateProfile({ hapticsEnabled: !state.profile?.hapticsEnabled })} className={`w-10 h-5 rounded-full transition-all relative ${state.profile?.hapticsEnabled ? 'bg-gold' : 'bg-slate-800'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${state.profile?.hapticsEnabled ? 'left-6' : 'left-1'}`}></div>
                          </button>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block ml-1">{T.language}</label>
                       <select value={state.profile?.language} onChange={e => updateProfile({ language: e.target.value as 'pl' | 'en' })} className="w-full glass bg-slate-900 text-white font-black p-3.5 rounded-xl outline-none border border-white/5 text-xs">
                          <option value="pl">Polski</option>
                          <option value="en">English</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block ml-1">{T.gender}</label>
                       <select value={state.profile?.gender} onChange={e => updateProfile({ gender: e.target.value as Gender })} className="w-full glass bg-slate-900 text-white font-black p-3.5 rounded-xl outline-none border border-white/5 text-xs">
                          <option value="mężczyzna">{T.male}</option>
                          <option value="kobieta">{T.female}</option>
                          <option value="nie chcę podawać">{T.other}</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block ml-1">{T.injuriesLabel}</label>
                       <select value={state.profile?.injuries} onChange={e => updateProfile({ injuries: e.target.value })} className="w-full glass bg-slate-900 text-white font-black p-3.5 rounded-xl outline-none border border-white/5 text-xs">
                          {COMMON_INJURIES.map(inj => <option key={inj} value={inj}>{inj}</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1 shadow-inner">
                         <span className="text-[7px] font-black text-slate-500 uppercase">WIEK</span>
                         <select value={state.profile?.age} onChange={e => updateProfile({ age: Number(e.target.value) })} className="bg-transparent text-sm font-black text-white outline-none w-full appearance-none">
                           {ageOptions.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
                         </select>
                       </div>
                       <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1 shadow-inner">
                         <span className="text-[7px] font-black text-slate-500 uppercase">WAGA</span>
                         <select value={state.profile?.weight} onChange={e => updateProfile({ weight: Number(e.target.value) })} className="bg-transparent text-sm font-black text-white outline-none w-full appearance-none">
                           {weightOptions.map(w => <option key={w} value={w} className="bg-slate-900">{w} kg</option>)}
                         </select>
                       </div>
                       <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1 shadow-inner">
                         <span className="text-[7px] font-black text-slate-500 uppercase">WZROST</span>
                         <select value={state.profile?.height} onChange={e => updateProfile({ height: Number(e.target.value) })} className="bg-transparent text-sm font-black text-white outline-none w-full appearance-none">
                           {heightOptions.map(h => <option key={h} value={h} className="bg-slate-900">{h} cm</option>)}
                         </select>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => { if(confirm("Zresetować wszystkie dane sesji?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } }} className="w-full py-4 bg-red-950/10 text-red-500/60 rounded-xl border border-red-500/10 font-black uppercase text-[8px] tracking-[0.4em] tap-scale">USUŃ KONTO</button>
              </div>
            } />
          </Routes>
        </main>
        {!state.profile?.isPro && <BannerAd />}
        <nav className="glass px-2 py-3 flex justify-around items-center border-t border-white/10 z-[500] safe-area-pb">
          <NavBtn to="/" icon="fa-house" label={T.dashboard} />
          <NavBtn to="/history" icon="fa-clock-rotate-left" label={T.history} />
          <NavBtn to="/settings" icon="fa-circle-user" label={T.settings} />
        </nav>
      </div>
    </Router>
  );
};

const NavBtn: React.FC<{ to: string, icon: string, label: string }> = ({ to, icon, label }) => {
  const loc = useLocation();
  const active = loc.pathname === to || (to === '/history' && loc.pathname.startsWith('/history'));
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 transition-all duration-300 px-3.5 ${active ? 'text-gold scale-105' : 'text-slate-500'}`}>
      <div className="w-5 h-5 flex items-center justify-center"><i className={`fa-solid ${icon} text-base shrink-0 transition-transform ${active ? 'scale-110' : ''}`} /></div>
      <span className={`text-[6px] font-black uppercase tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
    </Link>
  );
};

export default App;
