// app/practice/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScoreViewer } from '@/components/ScoreViewer';
import { clientPianoEngine, clientStringsEngine, clientDrumEngine } from '@/lib/audio/clientAudioEngines';

function PracticeContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exercise, setExercise] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeMeasureIndex, setActiveMeasureIndex] = useState(0);
  const [speedPct, setSpeedPct] = useState(100);
  const [isLoop, setIsLoop] = useState(true);
  const [metronome, setMetronome] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reproducir un click de metrónomo simple
  const playClick = (isDownbeat = false) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Ignorar error de audio metrónomo si está bloqueado por el navegador
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exercises/${id}`);
        const data = await res.json();
        if (data.exercise) {
          setExercise(data.exercise);
        }
      } catch (e) {
        console.error('Error cargando ejercicio:', e);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const effectiveBpm = exercise ? Math.round((exercise.tempo * speedPct) / 100) : 90;

  // Manejador para iniciar práctica con opción de cuenta atrás
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setCountdown(null);
      return;
    }

    // Inicializar motores de audio
    clientPianoEngine.init();

    // Cuenta atrás de 3 pulsos si no está corriendo
    let count = 3;
    setCountdown(count);
    playClick(true);

    const countIntervalMs = (60 / effectiveBpm) * 1000;
    const countTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playClick(false);
      } else {
        clearInterval(countTimer);
        setCountdown(null);
        setCurrentStep(0);
        setActiveMeasureIndex(0);
        setIsPlaying(true);
      }
    }, countIntervalMs);
  };

  // Secuenciador de práctica
  useEffect(() => {
    if (!isPlaying || !exercise || !exercise.measures) return;

    const stepMs = (60 / effectiveBpm / 4) * 1000;
    const timer = setInterval(() => {
      const curMeasure = exercise.measures[activeMeasureIndex];
      const stepNotes = (curMeasure?.notes || []).filter((n: any) => n.stepIndex === currentStep);

      // Metrónomo en cada pulso de negra (cada 4 semicorcheas)
      if (metronome && currentStep % 4 === 0) {
        playClick(currentStep === 0);
      }

      if (stepNotes.length > 0) {
        if (exercise.instrument === 'piano') {
          const midis = stepNotes.map((n: any) => n.midiNumber || 60);
          clientPianoEngine.playChord(midis, 1.2);
        } else if (exercise.instrument === 'drums') {
          stepNotes.forEach((n: any) => {
            clientDrumEngine.playHit(n.instrument || 'snare', n.velocity || 0.8);
          });
        } else {
          stepNotes.forEach((n: any) => {
            clientStringsEngine.playNote(n.midiNumber || 40, exercise.instrument === 'bass');
          });
        }
      }

      if (currentStep + 1 < 16) {
        setCurrentStep((s) => s + 1);
      } else {
        if (activeMeasureIndex + 1 < exercise.measures.length) {
          setActiveMeasureIndex((m) => m + 1);
          setCurrentStep(0);
        } else {
          if (isLoop) {
            setActiveMeasureIndex(0);
            setCurrentStep(0);
          } else {
            setIsPlaying(false);
            setCurrentStep(0);
            setActiveMeasureIndex(0);
          }
        }
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, activeMeasureIndex, exercise, effectiveBpm, isLoop, metronome]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex flex-col items-center justify-center gap-3 font-bold">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm">Cargando atril de práctica...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-sm">Ejercicio no encontrado o enlace incorrecto.</p>
        <Link href="/" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors">
          ← Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col relative">
      {/* Overlay de cuenta atrás */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-none">
          <div className="text-8xl md:text-9xl font-black text-cyan-400 animate-ping">
            {countdown}
          </div>
        </div>
      )}

      {/* Barra Superior de Control de Práctica */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-base md:text-lg font-black text-white line-clamp-1">{exercise.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                {exercise.instrument}
              </span>
              <span className="text-xs text-slate-400">
                {exercise.measures?.length || 1} {exercise.measures?.length === 1 ? 'compás' : 'compases'}
              </span>
            </div>
          </div>
        </div>

        {/* Controles de Estudio */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de velocidad */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setSpeedPct(pct)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  speedPct === pct ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          <span className="text-xs font-mono font-bold text-slate-300 px-2">
            {effectiveBpm} BPM
          </span>

          {/* Botón Metrónomo */}
          <button
            onClick={() => setMetronome(!metronome)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              metronome
                ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            ⏱ Metrónomo {metronome ? 'ON' : 'OFF'}
          </button>

          {/* Botón Loop */}
          <button
            onClick={() => setIsLoop(!isLoop)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isLoop
                ? 'bg-indigo-600/80 text-white border-indigo-400'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            🔁 Loop {isLoop ? 'ON' : 'OFF'}
          </button>

          {/* Botón Play / Pausa */}
          <button
            onClick={handleTogglePlay}
            className={`px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-transform active:scale-95 ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 shadow-amber-950/60 hover:bg-amber-300'
                : 'bg-emerald-500 text-slate-950 shadow-emerald-950/60 hover:bg-emerald-400'
            }`}
          >
            {isPlaying ? '⏸ Pausar' : '▶ Practicar'}
          </button>
        </div>
      </div>

      {/* Partitura / Tablatura Continua */}
      <div className="flex-1 flex flex-col justify-center">
        <ScoreViewer
          measures={exercise.measures || []}
          activeMeasureIndex={activeMeasureIndex}
          currentStep={currentStep}
          isPlaying={isPlaying}
          instrument={exercise.instrument}
        />
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center font-bold">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            Cargando atril de práctica...
          </div>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
