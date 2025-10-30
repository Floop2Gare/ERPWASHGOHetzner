import { memo, useId } from 'react';

export type LineDatum = {
  label: string;
  value: number;
};

type LineChartProps = {
  data: LineDatum[];
  className?: string;
  getTooltip?: (datum: LineDatum, index: number) => string | undefined;
};

const normalize = (value: number, min: number, max: number) => {
  if (max === min) {
    return 0.5;
  }
  return (value - min) / (max - min);
};

const LineChartComponent = ({ data, className, getTooltip }: LineChartProps) => {
  const gradientId = useId();
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Aucun point à afficher
      </div>
    );
  }

  const values = data.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const height = 160;
  const width = Math.max(1, data.length - 1) * 64;
  const verticalPadding = 12;
  const horizontalPadding = 16;
  const viewWidth = width + horizontalPadding * 2;
  const viewHeight = height + verticalPadding * 2;
  const step = width / Math.max(1, data.length - 1);

  const points = data.map((point, index) => {
    const x = horizontalPadding + index * step;
    const ratio = 1 - normalize(point.value, minValue, maxValue);
    const y = verticalPadding + ratio * height;
    return `${x},${y}`;
  });

  const path = points.map((point, index) => (index === 0 ? `M ${point}` : `L ${point}`)).join(' ');

  const areaPath = `M ${points[0]} ${points
    .map((point, index) => (index === 0 ? '' : `L ${point}`))
    .join(' ')} L ${horizontalPadding + width},${verticalPadding + height} L ${horizontalPadding},${verticalPadding + height} Z`;

  return (
    <div className={className}>
      <svg
        className="w-full"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label="Évolution des valeurs"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-point)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--chart-point)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x={horizontalPadding}
          y={verticalPadding}
          width={width}
          height={height}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth="1"
        />
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={path}
          fill="none"
          stroke="var(--chart-point)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {points.map((point, index) => {
          const [x, y] = point.split(',').map(Number);
          const tooltip = getTooltip?.(data[index], index);
          return (
            <circle key={data[index].label} cx={x} cy={y} r={3} fill="var(--chart-point)">
              {tooltip ? <title>{tooltip}</title> : null}
            </circle>
          );
        })}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-y-1 text-[11px] uppercase tracking-wide text-slate-400">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
};

export const LineChart = memo(LineChartComponent);
