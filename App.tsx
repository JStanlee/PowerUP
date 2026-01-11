
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { GoalType, UserProfile, WorkoutSession, AppState, SetLog, ExerciseLog } from './types';
import { generateWorkout } from './services/geminiService';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const STORAGE_KEY = 'powerup_app_state_v2';

// --- Komponenty ---

const ProgressChart: React.FC<{ history: WorkoutSession[] }> = ({ history }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || history.length < 2) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const recentHistory = history.slice(-10);
    const labels = recentHistory.map(s => new Date(s.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }));
    
    const avgWeights = recentHistory.map(s => {
      const strengthEx = s.exercises.filter(e => e.type !== 'CARDIO');
      if (strengthEx.length === 0) return 0;
      let totalWeight = 0;
      let totalSets = 0;
      strengthEx.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.completed) {
            totalWeight += set.weight;
            totalSets++;
          }
        });
      });
      return totalSets > 0 ? Math.round(totalWeight / totalSets) : 0;
    });

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Śr. Ciężar (kg)',
          data: avgWeights,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#6366f1',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1e293b',
            titleFont: { size: 10 },
            bodyFont: { size: 10, weight: 'bold' }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            ticks: { font: { size: 8 }, color: '#64748b' }
          },
          y: {
            display: true,
            grid: { color: 'rgba(100, 116, 139, 0.1)' },
            ticks: { font: { size: 8 }, color: '#64748b' }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [history]);

  if (history.length < 2) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 text-center">
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest leading-relaxed">
          Ukończ co najmniej 2 treningi,<br/>aby zobaczyć wykres postępów.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-48">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

const Onboarding: React.FC<{ onComplete: (p: UserProfile) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    goal: GoalType.GYM,
    goalDescription: '',
    age: 25,
    weight: 75,
    height: 180,
    injuries: '',
    level: 'początkujący',
    onboarded: true
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen p-6 flex flex-col justify-center animate-fadeIn bg-slate-900 pb-20">
      <div className="mb-8 text-center sm:text-left">
        <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase mb-1 block">Krok {step} z 3</span>
        <h1 className="text-3xl font-extrabold text-white leading-tight">Poznajmy się</h1>
      </div>
      
      <div className="space-y-5">
        {step === 1 && (
          <div className="animate-fadeIn space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Twoje Imię</label>
              <input 
                type="text" 
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 text-sm text-white"
                placeholder="Jak się nazywasz?"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Wiek</label>
              <input 
                type="number" 
                value={profile.age}
                onChange={(e) => setProfile({...profile, age: Number(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 text-sm text-white"
              />
            </div>
            <button onClick={nextStep} disabled={!profile.name} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-wide disabled:opacity-50">Dalej</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Waga (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight}
                  onChange={(e) => setProfile({...profile, weight: Number(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Wzrost (cm)</label>
                <input 
                  type="number" 
                  value={profile.height}
                  onChange={(e) => setProfile({...profile, height: Number(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Poziom</label>
              <div className="grid grid-cols-3 gap-2">
                {(['początkujący', 'średniozaawansowany', 'zaawansowany'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setProfile({...profile, level: l})}
                    className={`text-[9px] font-bold py-2.5 rounded-lg border transition-all ${profile.level === l ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl text-xs uppercase tracking-wide">Wstecz</button>
              <button onClick={nextStep} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-wide">Dalej</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Cel Główny</label>
              <select 
                value={profile.goal}
                onChange={(e) => setProfile({...profile, goal: e.target.value as GoalType})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white appearance-none"
              >
                {Object.values(GoalType).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Opisz swój cel</label>
              <textarea 
                value={profile.goalDescription}
                onChange={(e) => setProfile({...profile, goalDescription: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 text-sm text-white h-20 resize-none"
                placeholder="np. chcę przebiec maraton w 4h"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Kontuzje / Ograniczenia</label>
              <input 
                type="text" 
                value={profile.injuries}
                onChange={(e) => setProfile({...profile, injuries: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 text-sm text-white"
                placeholder="np. ból w prawym kolanie"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl text-xs uppercase tracking-wide">Wstecz</button>
              <button onClick={() => onComplete(profile)} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-wide shadow-lg shadow-indigo-900/20">Zapisz i Start</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const lastWorkout = state.history[state.history.length - 1];
  
  return (
    <div className="p-5 space-y-6 animate-fadeIn pb-28">
      <header className="flex justify-between items-center pt-2">
        <div className="min-w-0">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Twoje PowerUP</h2>
          <h1 className="text-xl font-extrabold text-white truncate pr-2">{state.profile?.name}</h1>
        </div>
        <div className="w-10 h-10 shrink-0 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-indigo-400">
          <i className="fa-solid fa-user-gear text-md"></i>
        </div>
      </header>

      <section className="bg-gradient-to-br from-indigo-700 to-slate-800 rounded-3xl p-5 shadow-xl text-white">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Parametry</h3>
          <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded uppercase">{state.profile?.level}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center bg-white/5 py-2 rounded-xl">
            <span className="block text-[9px] text-indigo-200 uppercase">Wiek</span>
            <span className="font-bold text-sm">{state.profile?.age}</span>
          </div>
          <div className="text-center bg-white/5 py-2 rounded-xl">
            <span className="block text-[9px] text-indigo-200 uppercase">Waga</span>
            <span className="font-bold text-sm">{state.profile?.weight}kg</span>
          </div>
          <div className="text-center bg-white/5 py-2 rounded-xl">
            <span className="block text-[9px] text-indigo-200 uppercase">Wzrost</span>
            <span className="font-bold text-sm">{state.profile?.height}cm</span>
          </div>
        </div>
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Cel: {state.profile?.goal}</h3>
          <p className="text-[11px] text-indigo-100 line-clamp-2 italic">"{state.profile?.goalDescription}"</p>
        </div>
        <Link 
          to="/new-workout"
          className="flex items-center justify-center gap-2 bg-white text-indigo-700 px-5 py-3 rounded-lg font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-transform shadow-md w-full"
        >
          <i className="fa-solid fa-plus-circle"></i>
          Generuj Nowy Trening
        </Link>
      </section>

      {state.profile?.injuries && (
        <section className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-500">
            <i className="fa-solid fa-hand-dots"></i>
          </div>
          <div className="min-w-0">
            <h4 className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Uwaga na kontuzje</h4>
            <p className="text-[10px] text-rose-400 truncate">{state.profile?.injuries}</p>
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Twoje Postępy</h3>
        </div>
        <ProgressChart history={state.history} />
      </section>

      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Ostatni Trening</h3>
          <Link to="/history" className="text-indigo-400 text-[10px] font-bold uppercase">Historia</Link>
        </div>
        {lastWorkout ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-medium text-slate-500 uppercase">{new Date(lastWorkout.date).toLocaleDateString()}</span>
              <span className="bg-indigo-500/10 text-indigo-400 text-[8px] px-2 py-0.5 rounded uppercase font-bold border border-indigo-500/20">{lastWorkout.goal}</span>
            </div>
            <div className="space-y-1.5">
              {lastWorkout.exercises.slice(0, 4).map((e, idx) => (
                <div key={idx} className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-300 truncate pr-4">{e.name}</span>
                  <span className="text-slate-500 shrink-0">{e.sets.length} serie</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/30 border-2 border-dashed border-slate-700/50 rounded-2xl p-8 text-center">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Brak sesji treningowych</p>
          </div>
        )}
      </section>
    </div>
  );
};

// ... Rest of the components (NewWorkout, ActiveWorkout, History, TabBar, App) remain largely similar but use translated and cleaned up labels

const NewWorkout: React.FC<{ state: AppState, onStart: (w: WorkoutSession) => void }> = ({ state, onStart }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!state.profile) return;
    setLoading(true);
    try {
      const data = await generateWorkout(state.profile, state.history);
      const newSession: WorkoutSession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        goal: state.profile.goal,
        exercises: data.exercises.map((e: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: e.name,
          type: e.type,
          sets: Array.from({ length: e.setsCount }).map(() => ({
            reps: e.repsTarget,
            weight: e.suggestedWeight,
            difficulty: 3,
            completed: false
          }))
        }))
      };
      onStart(newSession);
      navigate('/active');
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center animate-fadeIn pb-32">
      <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
        <i className="fa-solid fa-bolt-lightning text-2xl"></i>
      </div>
      <h2 className="text-xl font-bold mb-2">Trening dopasowany do Ciebie</h2>
      <p className="text-slate-400 mb-8 text-[11px] leading-relaxed max-w-[240px] uppercase tracking-wide">
        Analizujemy Twoje parametry ({state.profile?.weight}kg) i kontuzje, by stworzyć bezpieczny plan.
      </p>
      
      {loading ? (
        <div className="space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest animate-pulse">Personalizuję plan...</p>
        </div>
      ) : (
        <button 
          onClick={handleGenerate}
          className="w-full max-w-[240px] bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-900/20 active:scale-95 transition-all uppercase text-[11px] tracking-wider"
        >
          Generuj Plan PowerUP
        </button>
      )}
    </div>
  );
};

const ActiveWorkout: React.FC<{ workout: WorkoutSession, onUpdate: (w: WorkoutSession) => void, onFinish: () => void }> = ({ workout, onUpdate, onFinish }) => {
  const [expandedId, setExpandedId] = useState<string | null>(workout.exercises[0]?.id || null);

  const updateSet = (exerciseId: string, setIndex: number, fields: Partial<SetLog>) => {
    const newExercises = workout.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], ...fields };
        return { ...ex, sets: newSets };
      }
      return ex;
    });
    onUpdate({ ...workout, exercises: newExercises });
  };

  const progress = useMemo(() => {
    const total = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const done = workout.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }, [workout]);

  return (
    <div className="p-4 pb-36 animate-slideUp">
      <div className="fixed top-0 left-0 right-0 h-1 z-[110] bg-slate-800">
        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="flex justify-between items-start mb-5 pt-3">
        <div className="min-w-0 pr-2">
          <h2 className="text-xl font-extrabold tracking-tight">Aktywna sesja</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{workout.goal}</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full shrink-0"></span>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider shrink-0">{progress}% Gotowe</span>
          </div>
        </div>
        <button 
          onClick={onFinish}
          className="shrink-0 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-[9px] font-bold border border-red-500/20 active:scale-95 transition-all uppercase tracking-widest"
        >
          Zakończ
        </button>
      </div>

      <div className="space-y-2.5">
        {workout.exercises.map((ex: any) => {
          const isExpanded = expandedId === ex.id;
          const isDone = ex.sets.every((s: any) => s.completed);
          
          return (
            <div 
              key={ex.id} 
              className={`bg-slate-800/80 border transition-all duration-300 rounded-2xl overflow-hidden ${isExpanded ? 'border-indigo-500/40 shadow-lg accordion-open' : 'border-slate-700/50 opacity-90'}`}
            >
              <div 
                onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                className="p-4 flex justify-between items-center cursor-pointer active:bg-slate-700/30"
              >
                <div className="min-w-0 flex-1 pr-3">
                   <div className="flex items-center gap-2 mb-0.5">
                    {ex.type === "CARDIO" && (
                      <span className="shrink-0 text-[7px] font-bold bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded uppercase border border-blue-500/20">Cardio</span>
                    )}
                    <h3 className={`text-[11px] font-bold truncate uppercase tracking-tight ${isDone ? 'text-slate-500 line-through' : 'text-indigo-300'}`}>
                      {ex.name}
                    </h3>
                  </div>
                  <div className="text-[9px] font-medium text-slate-500">
                    {ex.sets.filter((s:any) => s.completed).length} / {ex.sets.length} serii
                  </div>
                </div>
                <div className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-600'}`}>
                   <i className="fa-solid fa-chevron-down text-[10px]"></i>
                </div>
              </div>

              <div className="accordion-content">
                <div className="p-4 pt-0 space-y-2.5">
                  {ex.sets.map((s:any, idx:number) => (
                    <div key={idx} className={`p-3 rounded-xl border transition-all ${s.completed ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-900/50 border-slate-700'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {ex.type === "CARDIO" ? "Czas Trwania" : `Seria ${idx + 1}`}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSet(ex.id, idx, { completed: !s.completed });
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${s.completed ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500 active:scale-90'}`}
                        >
                          <i className="fa-solid fa-check text-xs"></i>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase truncate">
                            {ex.type === "CARDIO" ? "Intens." : "Kg"}
                          </span>
                          <input 
                            type="number"
                            value={s.weight}
                            onChange={(e) => updateSet(ex.id, idx, { weight: Number(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-center font-bold text-[11px] text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase truncate">
                             {ex.type === "CARDIO" ? "Minuty" : "Reps"}
                          </span>
                          <input 
                            type="number"
                            value={s.reps}
                            onChange={(e) => updateSet(ex.id, idx, { reps: Number(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-center font-bold text-[11px] text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase truncate">Ocena</span>
                          <select 
                            value={s.difficulty}
                            onChange={(e) => updateSet(ex.id, idx, { difficulty: Number(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1 py-1.5 text-center font-bold text-[11px] text-white outline-none focus:border-indigo-500 transition-colors appearance-none"
                          >
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const History: React.FC<{ history: WorkoutSession[] }> = ({ history }) => {
  return (
    <div className="p-5 animate-fadeIn pb-32">
      <h2 className="text-xl font-extrabold mb-6 tracking-tight">Historia</h2>
      <div className="space-y-5">
        {[...history].reverse().map((session) => (
          <div key={session.id} className="relative pl-5">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-800 rounded-full"></div>
            <div className="absolute left-[-3px] top-4 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-900"></div>
            
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="min-w-0">
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-tight break-words">{session.goal}</h4>
                  <span className="text-[9px] font-medium text-slate-500 uppercase mt-0.5 block">{new Date(session.date).toLocaleDateString()}</span>
                </div>
                <div className="shrink-0 text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 uppercase">
                  {session.exercises.length} ćw.
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {session.exercises.map((e: any, idx) => (
                  <div key={idx} className={`shrink-0 whitespace-nowrap px-2 py-1 rounded text-[8px] font-bold uppercase tracking-tight border ${e.type === 'CARDIO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                    {e.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-center text-slate-600 py-16 italic text-xs font-medium uppercase tracking-widest">Brak zapisanych sesji</div>
        )}
      </div>
    </div>
  );
};

const TabBar: React.FC = () => {
  const location = useLocation();
  const tabs = [
    { path: '/', icon: 'fa-house', label: 'Panel' },
    { path: '/new-workout', icon: 'fa-bolt', label: 'Trening' },
    { path: '/history', icon: 'fa-calendar-days', label: 'Historia' },
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-[100]">
      <div className="glass-panel rounded-2xl px-6 py-3.5 flex justify-between items-center shadow-2xl shadow-black/30">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <Link 
              key={tab.path} 
              to={tab.path} 
              className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${isActive ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
              <i className={`fa-solid ${tab.icon} text-md`}></i>
              <span className="text-[8px] font-bold uppercase tracking-widest">{tab.label}</span>
              {isActive && (
                 <div className="absolute -bottom-2 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.8)]"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { profile: null, history: [], activeWorkout: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleOnboarding = (profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  };

  const handleStartWorkout = (workout: WorkoutSession) => {
    setState(prev => ({ ...prev, activeWorkout: workout }));
  };

  const handleUpdateActive = (workout: WorkoutSession) => {
    setState(prev => ({ ...prev, activeWorkout: workout }));
  };

  const handleFinishWorkout = () => {
    if (state.activeWorkout) {
      setState(prev => ({
        ...prev,
        history: [...prev.history, state.activeWorkout!],
        activeWorkout: null
      }));
      window.location.hash = '#/';
    }
  };

  if (!state.profile?.onboarded) {
    return <Onboarding onComplete={handleOnboarding} />;
  }

  return (
    <Router>
      <div className="min-h-screen safe-area-pt pb-6">
        <Routes>
          <Route path="/" element={<Dashboard state={state} />} />
          <Route path="/new-workout" element={<NewWorkout state={state} onStart={handleStartWorkout} />} />
          <Route path="/active" element={
            state.activeWorkout 
              ? <ActiveWorkout workout={state.activeWorkout} onUpdate={handleUpdateActive} onFinish={handleFinishWorkout} />
              : <Dashboard state={state} />
          } />
          <Route path="/history" element={<History history={state.history} />} />
        </Routes>
        <TabBar />
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0, 0, 0.2, 1); }
      `}</style>
    </Router>
  );
};

export default App;
