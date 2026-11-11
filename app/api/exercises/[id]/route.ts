// app/api/exercises/[id]/route.ts
import { NextResponse } from 'next/server';
import { getExerciseById } from '@/lib/exercises';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const exercise = await getExerciseById(id);

    if (!exercise) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    return NextResponse.json({ exercise });
  } catch (error) {
    console.error('Error en API exercises/[id]:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

