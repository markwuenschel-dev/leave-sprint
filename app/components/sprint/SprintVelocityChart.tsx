"use client";

import { useSprintStore } from "@/lib/store";
import { TOTAL_STAGES } from "@/data/stages";

export function SprintVelocityChart() {
  const { stages } = useSprintStore();

  const totalStages = TOTAL_STAGES;
  const sprintDays = 29;

  // Calculate cumulative completed stages by day
  const completedByDay = Array.from({ length: sprintDays + 1 }, () => 0);

  Object.values(stages).forEach((stage) => {
    if (stage.done && stage.doneAt) {
      const doneDate = new Date(stage.doneAt);
      const startDate = new Date(2026, 5, 17);
      const dayNumber = Math.floor((doneDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
      
      if (dayNumber >= 1 && dayNumber <= sprintDays) {
        completedByDay[dayNumber] += 1;
      }
    }
  });

  // Cumulative sum
  const cumulative: number[] = [];
  let runningTotal = 0;
  for (let i = 1; i <= sprintDays; i++) {
    runningTotal += completedByDay[i];
    cumulative[i] = runningTotal;
  }

  const currentDay = Math.min(
    Math.max(
      Math.floor((new Date().getTime() - new Date(2026, 5, 17).getTime()) / (1000 * 3600 * 24)) + 1,
      1
    ),
    sprintDays
  );

  const currentCompleted = cumulative[currentDay] || 0;
  const velocity = currentDay > 1 ? (currentCompleted / currentDay).toFixed(1) : "0.0";
  const projectedFinish = currentCompleted > 0 
    ? Math.ceil((totalStages / currentCompleted) * currentDay) 
    : 29;

  // Chart dimensions
  const width = 620;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxY = totalStages;

  const xScale = (day: number) => padding.left + ((day - 1) / (sprintDays - 1)) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - (value / maxY) * chartHeight;

  // Actual progress line points
  const actualPoints = cumulative
    .slice(1)
    .map((val, i) => `${xScale(i + 1)},${yScale(val)}`)
    .join(" ");

  // Ideal pace line
  const idealPoints = Array.from({ length: sprintDays }, (_, i) => {
    const day = i + 1;
    const idealValue = Math.min((day / sprintDays) * totalStages, totalStages);
    return `${xScale(day)},${yScale(idealValue)}`;
  }).join(" ");

  return (
    <div className="card-glass">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-title">SPRINT VELOCITY</div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {velocity} <span className="text-base text-[var(--text-dim)]">stages/day</span>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-[var(--text-dim)]">Projected finish</div>
          <div className="font-mono text-lg text-[var(--cyan)]">Day {projectedFinish}</div>
        </div>
      </div>

      <svg width={width} height={height} className="w-full max-w-[620px]">
        {/* Grid lines */}
        {[0, 5, 10, 15, 20].map((val) => (
          <g key={val}>
            <line
              x1={padding.left}
              y1={yScale(val)}
              x2={width - padding.right}
              y2={yScale(val)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={padding.left - 8}
              y={yScale(val) + 4}
              textAnchor="end"
              className="text-[10px] fill-[var(--text-dim)] font-mono"
            >
              {val}
            </text>
          </g>
        ))}

        {/* Ideal pace line (dashed) */}
        <polyline
          points={idealPoints}
          fill="none"
          stroke="var(--text-dim)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {/* Actual progress line */}
        <polyline
          points={actualPoints}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Current day marker */}
        <line
          x1={xScale(currentDay)}
          y1={padding.top}
          x2={xScale(currentDay)}
          y2={height - padding.bottom}
          stroke="var(--magenta)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />

        {/* Current progress dot */}
        <circle
          cx={xScale(currentDay)}
          cy={yScale(currentCompleted)}
          r="5"
          fill="var(--cyan)"
          stroke="#0a0c10"
          strokeWidth="2"
        />
      </svg>

      <div className="flex justify-between text-[10px] text-[var(--text-dim)] mt-1 px-1 font-mono">
        <div>Day 1</div>
        <div>Day {sprintDays}</div>
      </div>
    </div>
  );
}