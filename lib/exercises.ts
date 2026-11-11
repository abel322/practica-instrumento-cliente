// lib/exercises.ts
import { prisma } from './prisma';

export interface ExerciseNote {
  stepIndex: number;
  globalStep: number;
  midiNumber: number;
  fret?: number;
  string?: number;
  technique?: string;
  velocity?: number;
  noteName?: string;
  instrument?: string;
}

export interface ExerciseMeasure {
  measureIndex: number;
  measureNumber: number;
  notes: ExerciseNote[];
}

export interface NormalizedExercise {
  id: string;
  slug?: string;
  title: string;
  instrument: 'bass' | 'guitar' | 'piano' | 'drums';
  rawInstrument: string;
  tempo: number;
  category?: string;
  difficulty: string;
  totalSteps: number;
  stepsPerMeasure: number;
  timeSignature: string;
  measures: ExerciseMeasure[];
  createdAt: Date;
}

export function normalizeInstrument(raw: string = ''): 'bass' | 'guitar' | 'piano' | 'drums' {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('bass') || lower.includes('bajo')) return 'bass';
  if (lower.includes('guitar') || lower.includes('cuerda')) return 'guitar';
  if (lower.includes('piano') || lower.includes('teclado')) return 'piano';
  if (lower.includes('drum') || lower.includes('bater')) return 'drums';
  return 'guitar';
}

const BASS_STRING_MIDI: Record<number, number> = {
  1: 43, // G2
  2: 38, // D2
  3: 33, // A1
  4: 28, // E1
  5: 23, // B0 (opcional 5 cuerdas)
};

const GUITAR_STRING_MIDI: Record<number, number> = {
  1: 64, // E4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

const DRUM_MIDI: Record<string, number> = {
  kick: 36,
  bombo: 36,
  snare: 38,
  caja: 38,
  hihat: 42,
  hihat_closed: 42,
  hihat_open: 46,
  crash: 49,
  ride: 51,
  tom1: 48,
  tom2: 45,
  floor_tom: 41,
};

export function buildMeasures(
  rawNotes: any[] = [],
  totalSteps = 16,
  stepsPerMeasure = 16,
  instrumentType: 'bass' | 'guitar' | 'piano' | 'drums'
): ExerciseMeasure[] {
  const spm = stepsPerMeasure > 0 ? stepsPerMeasure : 16;
  const numMeasures = Math.max(1, Math.ceil(totalSteps / spm));
  const measures: ExerciseMeasure[] = Array.from({ length: numMeasures }, (_, idx) => ({
    measureIndex: idx,
    measureNumber: idx + 1,
    notes: [],
  }));

  for (const raw of rawNotes) {
    if (!raw) continue;
    const globalStep = typeof raw.step === 'number' ? raw.step : typeof raw.stepIndex === 'number' ? raw.stepIndex : 0;
    const mIdx = Math.floor(globalStep / spm);
    if (mIdx < 0 || mIdx >= measures.length) continue;

    const stepInMeasure = globalStep % spm;
    let midiNumber = typeof raw.midiNumber === 'number' ? raw.midiNumber : 60;

    if (instrumentType === 'bass') {
      const str = raw.string || 4;
      const base = BASS_STRING_MIDI[str] ?? 28;
      midiNumber = base + (raw.fret || 0);
    } else if (instrumentType === 'guitar') {
      const str = raw.string || 6;
      const base = GUITAR_STRING_MIDI[str] ?? 40;
      midiNumber = base + (raw.fret || 0);
    } else if (instrumentType === 'drums') {
      const hitInst = (raw.instrument || 'snare').toLowerCase();
      midiNumber = DRUM_MIDI[hitInst] ?? 38;
    }

    measures[mIdx].notes.push({
      stepIndex: stepInMeasure,
      globalStep,
      midiNumber,
      fret: raw.fret,
      string: raw.string,
      technique: raw.technique,
      velocity: raw.velocity,
      noteName: raw.noteName,
      instrument: raw.instrument,
    });
  }

  // Ordenar notas de cada compás por stepIndex
  for (const m of measures) {
    m.notes.sort((a, b) => a.stepIndex - b.stepIndex);
  }

  return measures;
}

export async function getAllExercises(instrumentFilter = 'all'): Promise<NormalizedExercise[]> {
  const result: NormalizedExercise[] = [];

  try {
    // 1. Obtener StringExercises (bajo, guitarra, piano)
    const strings = await prisma.stringExercise.findMany({
      orderBy: { createdAt: 'desc' },
    });

    for (const item of strings) {
      const normInst = normalizeInstrument(item.instrument);
      const totalSteps = item.totalSteps || 16;
      const stepsPerMeasure = item.stepsPerMeasure || 16;
      const rawNotes = Array.isArray(item.tabData) ? (item.tabData as any[]) : [];

      result.push({
        id: item.id,
        slug: item.slug,
        title: item.title,
        instrument: normInst,
        rawInstrument: item.instrument,
        tempo: item.bpmDefault || 90,
        category: item.category,
        difficulty: item.difficulty || 'Intermedio',
        totalSteps,
        stepsPerMeasure,
        timeSignature: item.timeSignature || '4/4',
        measures: buildMeasures(rawNotes, totalSteps, stepsPerMeasure, normInst),
        createdAt: item.createdAt,
      });
    }

    // 2. Obtener DrumExercises
    const drums = await prisma.drumExercise.findMany({
      orderBy: { createdAt: 'desc' },
    });

    for (const item of drums) {
      const totalSteps = item.totalSteps || 16;
      const stepsPerMeasure = item.stepsPerMeasure || 16;
      const rawHits = Array.isArray(item.hitsData) ? (item.hitsData as any[]) : [];

      result.push({
        id: item.id,
        slug: item.slug,
        title: item.title,
        instrument: 'drums',
        rawInstrument: 'drums',
        tempo: item.bpmDefault || 100,
        category: item.category,
        difficulty: item.difficulty || 'Intermedio',
        totalSteps,
        stepsPerMeasure,
        timeSignature: item.timeSignature || '4/4',
        measures: buildMeasures(rawHits, totalSteps, stepsPerMeasure, 'drums'),
        createdAt: item.createdAt,
      });
    }

    // 3. Chequeo de compatibilidad en caso de que exista una tabla 'exercise'
    if (typeof (prisma as any).exercise?.findMany === 'function') {
      const extra = await (prisma as any).exercise.findMany().catch(() => []);
      for (const item of extra) {
        if (!result.find((r) => r.id === item.id)) {
          const normInst = normalizeInstrument(item.instrument);
          result.push({
            id: item.id,
            slug: item.slug || item.id,
            title: item.title,
            instrument: normInst,
            rawInstrument: item.instrument,
            tempo: item.tempo || item.bpmDefault || 90,
            category: item.category,
            difficulty: item.difficulty || 'Intermedio',
            totalSteps: item.totalSteps || 16,
            stepsPerMeasure: item.stepsPerMeasure || 16,
            timeSignature: item.timeSignature || '4/4',
            measures: item.measures || buildMeasures(item.notes || [], 16, 16, normInst),
            createdAt: item.createdAt || new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error recuperando ejercicios de la base de datos:', error);
  }

  // Filtrar si se solicitó un instrumento específico
  if (instrumentFilter && instrumentFilter !== 'all') {
    return result.filter((ex) => ex.instrument === instrumentFilter);
  }

  return result;
}

export async function getExerciseById(id: string): Promise<NormalizedExercise | null> {
  try {
    // 1. Buscar en stringExercise
    const strItem = await prisma.stringExercise.findUnique({
      where: { id },
    });
    if (strItem) {
      const normInst = normalizeInstrument(strItem.instrument);
      const totalSteps = strItem.totalSteps || 16;
      const stepsPerMeasure = strItem.stepsPerMeasure || 16;
      const rawNotes = Array.isArray(strItem.tabData) ? (strItem.tabData as any[]) : [];

      return {
        id: strItem.id,
        slug: strItem.slug,
        title: strItem.title,
        instrument: normInst,
        rawInstrument: strItem.instrument,
        tempo: strItem.bpmDefault || 90,
        category: strItem.category,
        difficulty: strItem.difficulty || 'Intermedio',
        totalSteps,
        stepsPerMeasure,
        timeSignature: strItem.timeSignature || '4/4',
        measures: buildMeasures(rawNotes, totalSteps, stepsPerMeasure, normInst),
        createdAt: strItem.createdAt,
      };
    }

    // 2. Buscar en drumExercise
    const drumItem = await prisma.drumExercise.findUnique({
      where: { id },
    });
    if (drumItem) {
      const totalSteps = drumItem.totalSteps || 16;
      const stepsPerMeasure = drumItem.stepsPerMeasure || 16;
      const rawHits = Array.isArray(drumItem.hitsData) ? (drumItem.hitsData as any[]) : [];

      return {
        id: drumItem.id,
        slug: drumItem.slug,
        title: drumItem.title,
        instrument: 'drums',
        rawInstrument: 'drums',
        tempo: drumItem.bpmDefault || 100,
        category: drumItem.category,
        difficulty: drumItem.difficulty || 'Intermedio',
        totalSteps,
        stepsPerMeasure,
        timeSignature: drumItem.timeSignature || '4/4',
        measures: buildMeasures(rawHits, totalSteps, stepsPerMeasure, 'drums'),
        createdAt: drumItem.createdAt,
      };
    }

    // 3. Fallback a tabla general 'exercise' si existiese
    if (typeof (prisma as any).exercise?.findUnique === 'function') {
      const generic = await (prisma as any).exercise.findUnique({ where: { id } }).catch(() => null);
      if (generic) {
        const normInst = normalizeInstrument(generic.instrument);
        return {
          id: generic.id,
          slug: generic.slug || generic.id,
          title: generic.title,
          instrument: normInst,
          rawInstrument: generic.instrument,
          tempo: generic.tempo || generic.bpmDefault || 90,
          category: generic.category,
          difficulty: generic.difficulty || 'Intermedio',
          totalSteps: generic.totalSteps || 16,
          stepsPerMeasure: generic.stepsPerMeasure || 16,
          timeSignature: generic.timeSignature || '4/4',
          measures: generic.measures || buildMeasures(generic.notes || [], 16, 16, normInst),
          createdAt: generic.createdAt || new Date(),
        };
      }
    }
  } catch (error) {
    console.error(`Error buscando ejercicio ${id}:`, error);
  }

  return null;
}

