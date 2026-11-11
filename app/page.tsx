// app/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { getAllExercises } from '@/lib/exercises';

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<{ instrument?: string; q?: string }> | { instrument?: string; q?: string };
}) {
  const resolvedParams = await searchParams;
  const selectedInstrument = resolvedParams?.instrument || 'all';
  const query = (resolvedParams?.q || '').toLowerCase().trim();

  // Obtener ejercicios directamente de Neon DB
  const allExercises = await getAllExercises(selectedInstrument);

  // Filtrado por buscador de texto si existe
  const exercises = query
    ? allExercises.filter(
        (ex) =>
          ex.title.toLowerCase().includes(query) ||
          (ex.category && ex.category.toLowerCase().includes(query))
      )
    : allExercises;

  const instruments = [
    { id: 'all', label: 'Todos' },
    { id: 'bass', label: 'Bajo' },
    { id: 'guitar', label: 'Guitarra' },
    { id: 'piano', label: 'Piano' },
    { id: 'drums', label: 'Batería' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest font-black text-cyan-400">Sonora Client Portal</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Portal de Práctica</h1>
          <p className="text-sm text-slate-400 mt-1">
            Selecciona un ejercicio y practica con el atril interactivo
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Formulario de Búsqueda */}
          <form method="GET" action="/" className="relative">
            {selectedInstrument !== 'all' && (
              <input type="hidden" name="instrument" value={selectedInstrument} />
            )}
            <input
              type="text"
              name="q"
              defaultValue={resolvedParams?.q || ''}
              placeholder="Buscar ejercicio..."
              className="w-full sm:w-56 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </form>

          {/* Filtros por Instrumento */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
            {instruments.map((inst) => {
              const href =
                inst.id === 'all'
                  ? query
                    ? `/?q=${encodeURIComponent(query)}`
                    : '/'
                  : query
                  ? `/?instrument=${inst.id}&q=${encodeURIComponent(query)}`
                  : `/?instrument=${inst.id}`;

              return (
                <Link
                  key={inst.id}
                  href={href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedInstrument === inst.id
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {inst.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Grid de Ejercicios */}
      <main className="max-w-6xl mx-auto">
        {exercises.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
            <p className="text-slate-400 text-sm">No hay ejercicios publicados para este filtro.</p>
            {(selectedInstrument !== 'all' || query) && (
              <Link
                href="/"
                className="inline-block mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 transition-colors"
              >
                Ver todos los ejercicios
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-cyan-950/20"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                      {item.instrument}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {item.tempo || 90} BPM
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-6">
                    <span>Compases: {item.measures?.length || 1}</span>
                    <span>•</span>
                    <span>Dificultad: {item.difficulty || 'Media'}</span>
                  </div>
                </div>

                <Link
                  href={`/practice/${item.id}`}
                  className="w-full text-center py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-2xl transition-all shadow-md active:scale-98"
                >
                  ▶ Estudiar / Practicar
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClientHomePage(props: {
  searchParams: Promise<{ instrument?: string; q?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center p-12">
          <div className="flex items-center gap-3 font-bold text-sm">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            Cargando catálogo de práctica...
          </div>
        </div>
      }
    >
      <CatalogContent searchParams={props.searchParams} />
    </Suspense>
  );
}
