import { memo } from 'react';

export type BarDatum = {
  label: string;
  value: number;
};

type BarChartProps = {
  data: BarDatum[];
  className?: string;
  getTooltip?: (datum: BarDatum, index: number) => string | undefined;
};

const BarChartComponent = ({ data, className, getTooltip }: BarChartProps) => {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Aucun point à afficher
      </div>
    );
  }

  const values = data.map((point) => point.value);
  const maxValue = Math.max(...values);
  const chartHeight = 160;
  const barWidth = 36;
  const gap = 24;
  const width = data.length * barWidth + (data.length - 1) * gap;
  const horizontalPadding = 16;
  const verticalPadding = 12;
  const viewWidth = width + horizontalPadding * 2;
  const viewHeight = chartHeight + verticalPadding * 2;

  return (
    <div className={className}>
      <svg className="w-full" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label="Répartition des volumes">
        <rect
          x={horizontalPadding}
          y={verticalPadding}
          width={width}
          height={chartHeight}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth="1"
        />
        {data.map((point, index) => {
          const heightRatio = maxValue === 0 ? 0 : point.value / maxValue;
          const barHeight = heightRatio * chartHeight;
          const x = horizontalPadding + index * (barWidth + gap);
          const y = verticalPadding + (chartHeight - barHeight);
          const opacity = Math.max(0.25, 0.85 - index * 0.1);
          const tooltip = getTooltip?.(point, index);
          return (
            <rect
              key={point.label}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill="var(--chart-point)"
              opacity={opacity}
            >
              {tooltip ? <title>{tooltip}</title> : null}
            </rect>
          );
        })}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-y-1 text-[11px] uppercase tracking-wide text-slate-400">
        {data.map((point) => (
          <div key={point.label} className="flex items-center justify-between text-slate-500">
            <span className="font-medium text-slate-600">{point.label}</span>
            <span>{point.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BarChart = memo(BarChartComponent);
