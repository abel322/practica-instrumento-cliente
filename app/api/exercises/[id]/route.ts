// app/api/exercises/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getExerciseById } from '@/lib/exercises';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
    }

    let exercise: any = await getExerciseById(id);

    if (!exercise && typeof (prisma as any).exercise?.findUnique === 'function') {
      exercise = await (prisma as any).exercise.findUnique({
        where: { id },
      }).catch(() => null);
    }

    if (!exercise) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ exercise });
  } catch (error) {
    console.error('Error al obtener ejercicio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
