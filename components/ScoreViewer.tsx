// components/ScoreViewer.tsx
'use client';

import React, { useRef, useEffect } from 'react';

interface ScoreViewerProps {
  measures: any[];
  activeMeasureIndex: number;
  currentStep: number;
  isPlaying: boolean;
  instrument: string;
}

const SYSTEM_HEIGHT = 280;
const SVG_WIDTH = 960;
const LEFT_MARGIN = 75;
const RIGHT_MARGIN = 25;
const MEASURES_PER_SYSTEM = 2;

export const ScoreViewer: React.FC<ScoreViewerProps> = ({
  measures,
  activeMeasureIndex,
  currentStep,
  isPlaying,
  instrument,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const safeMeasures = measures && measures.length > 0 ? measures : [{ measureNumber: 1, notes: [] }];
  const totalSystems = Math.max(1, Math.ceil(safeMeasures.length / MEASURES_PER_SYSTEM));
  const usableWidth = SVG_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
  const measureWidth = usableWidth / MEASURES_PER_SYSTEM;
  const totalSvgHeight = totalSystems * SYSTEM_HEIGHT + 30;

  // Auto-scroll durante reproducción
  useEffect(() => {
    if (isPlaying && containerRef.current) {
      const activeSystem = Math.floor(activeMeasureIndex / MEASURES_PER_SYSTEM);
      containerRef.current.scrollTo({
        top: Math.max(0, activeSystem * SYSTEM_HEIGHT - 40),
        behavior: 'smooth',
      });
    }
  }, [activeMeasureIndex, isPlaying]);

  const activeSystem = Math.floor(activeMeasureIndex / MEASURES_PER_SYSTEM);
  const measureInSystem = activeMeasureIndex % MEASURES_PER_SYSTEM;
  const systemBaseY = activeSystem * SYSTEM_HEIGHT;
  const currentMeasureStartX = LEFT_MARGIN + measureInSystem * measureWidth;
  const playheadX = currentMeasureStartX + (currentStep + 0.5) * (measureWidth / 16);

  return (
    <div
      ref={containerRef}
      className="w-full max-h-[600px] overflow-y-auto overflow-x-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl p-6 no-scrollbar"
    >
      <svg viewBox={`0 0 ${SVG_WIDTH} ${totalSvgHeight}`} className="w-full h-auto select-none font-sans">
        {Array.from({ length: totalSystems }).map((_, sysIdx) => {
          const sysY = sysIdx * SYSTEM_HEIGHT + 15;
          const lines = [50, 70, 90, 110, 130].map((y) => sysY + y);
          const startIdx = sysIdx * MEASURES_PER_SYSTEM;
          const sysMeasures = safeMeasures.slice(startIdx, startIdx + MEASURES_PER_SYSTEM);

          return (
            <g key={`sys-${sysIdx}`}>
              {/* Clave musical */}
              <text x={LEFT_MARGIN - 65} y={sysY + 115} fill="#94a3b8" fontSize="60" fontFamily="serif">
                {instrument === 'bass' ? '𝄢' : instrument === 'drums' ? '𝄡' : '𝄞'}
              </text>

              {/* 5 líneas */}
              {lines.map((y, i) => (
                <line key={`l-${i}`} x1={LEFT_MARGIN - 25} y1={y} x2={SVG_WIDTH - RIGHT_MARGIN} y2={y} stroke="#334155" strokeWidth="1.6" />
              ))}

              <line x1={LEFT_MARGIN} y1={sysY + 50} x2={LEFT_MARGIN} y2={sysY + 130} stroke="#475569" strokeWidth="2" />

              {/* Compases */}
              {sysMeasures.map((measure, mSubIdx) => {
                const globalIdx = startIdx + mSubIdx;
                const mStartX = LEFT_MARGIN + mSubIdx * measureWidth;
                const mEndX = mStartX + measureWidth;
                const isSelected = activeMeasureIndex === globalIdx;

                return (
                  <g key={`m-${globalIdx}`}>
                    <text x={mStartX + 6} y={sysY + 40} fill={isSelected ? '#38bdf8' : '#64748b'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                      Compás {globalIdx + 1}
                    </text>
                    <line x1={mEndX} y1={sysY + 50} x2={mEndX} y2={sysY + 130} stroke="#475569" strokeWidth="2" />

                    {/* Notas */}
                    {(measure.notes || []).map((note: any, nIdx: number) => {
                      const noteX = mStartX + (note.stepIndex + 0.5) * (measureWidth / 16);
                      const noteY = sysY + 90 - (note.fret ? note.fret * 3 : ((note.midiNumber || 60) - 60) * 3);

                      return (
                        <g key={`note-${nIdx}`}>
                          <ellipse cx={noteX} cy={noteY} rx="7.5" ry="5.5" transform={`rotate(-20 ${noteX} ${noteY})`} fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                          <line x1={noteX + 7} y1={noteY} x2={noteX + 7} y2={noteY - 26} stroke="#38bdf8" strokeWidth="1.8" />
                          {note.technique && note.technique !== 'normal' && (
                            <text x={noteX} y={noteY - 30} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
                              {note.technique.toUpperCase().slice(0, 3)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Cursor de Reproducción */}
        {isPlaying && (
          <line
            x1={playheadX}
            y1={systemBaseY + 45}
            x2={playheadX}
            y2={systemBaseY + 145}
            stroke="#22d3ee"
            strokeWidth="2.5"
            filter="drop-shadow(0 0 8px rgba(34, 211, 238, 0.95))"
            className="pointer-events-none transition-all duration-75"
          />
        )}
      </svg>
    </div>
  );
};

