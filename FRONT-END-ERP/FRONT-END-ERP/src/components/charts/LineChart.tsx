import { memo, useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export type LineDatum = {
  label: string;
  value: number;
};

type LineChartVariant = 'default' | 'ultraThin' | 'compact';

type LineChartProps = {
  data: LineDatum[];
  className?: string;
  getTooltip?: (datum: LineDatum, index: number) => string | undefined;
  variant?: LineChartVariant;
  yTicks?: number;
  formatYAxisLabel?: (value: number) => string;
  formatPointLabel?: (datum: LineDatum, index: number) => string | null;
  showXAxisLabels?: boolean;
  height?: number;
};

const compactFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const buildChartData = (data: LineDatum[]) =>
  data.map((item, index) => ({
    label: item.label,
    value: item.value,
    raw: item,
    index,
  }));

const VARIANT_CONFIG: Record<LineChartVariant, { height: number; strokeWidth: number; dotSize: number }> = {
  default: { height: 260, strokeWidth: 3, dotSize: 5 },
  ultraThin: { height: 220, strokeWidth: 2.6, dotSize: 4 },
  compact: { height: 180, strokeWidth: 2.2, dotSize: 3.6 },
};

const LineChartComponent = ({
  data,
  className,
  getTooltip,
  variant = 'ultraThin',
  yTicks = 6,
  formatYAxisLabel,
  formatPointLabel,
  showXAxisLabels = true,
  height,
}: LineChartProps) => {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Aucun point à afficher
      </div>
    );
  }

  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.ultraThin;
  const resolvedHeight = height ?? config.height;
  const chartData = useMemo(() => buildChartData(data), [data]);

  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || Math.max(Math.abs(maxValue), 1);
  const padding = range * 0.15;
  const domainMin = minValue >= 0 ? 0 : Math.floor(minValue - padding);
  const domainMax = Math.ceil(maxValue + padding);

  const yAxisFormatter = formatYAxisLabel ?? ((value: number) => compactFormatter.format(value));

  const CustomTooltip = (props: TooltipProps<ValueType, NameType>) => {
    const { active, payload } = props as TooltipProps<ValueType, NameType> & { payload?: any[] };
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const datumPayload = (payload[0] as any)?.payload as
      | (LineDatum & { label: string; index: number })
      | undefined;
    const label = datumPayload?.label ?? '';
    const content =
      datumPayload && typeof getTooltip === 'function'
        ? getTooltip(datumPayload, datumPayload.index ?? 0)
        : yAxisFormatter(Number((payload[0] as any)?.value ?? 0));

    return (
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-[11px] text-slate-300">{content}</p>
      </div>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={resolvedHeight}>
        <RechartsAreaChart data={chartData} margin={{ top: 16, right: 20, left: 8, bottom: 12 }}>
        <defs>
            <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.24} />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
          </linearGradient>
        </defs>
          <CartesianGrid strokeDasharray="3 8" stroke="rgba(var(--txt-muted-rgb) / 0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={showXAxisLabels ? { fontSize: 11, fill: 'rgba(var(--txt-muted-rgb) / 0.7)' } : { fill: 'transparent' }}
            tickMargin={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'rgba(var(--txt-muted-rgb) / 0.65)' }}
            tickFormatter={yAxisFormatter}
            domain={[domainMin, domainMax]}
            tickCount={yTicks}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeOpacity: 0.2 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#38bdf8"
            strokeWidth={config.strokeWidth}
            fill="url(#line-gradient)"
            dot={{ r: config.dotSize, strokeWidth: 1.8, fill: '#38bdf8', stroke: '#ffffff' }}
            activeDot={{ r: config.dotSize + 1, strokeWidth: 2, stroke: '#0ea5e9', fill: '#38bdf8' }}
            isAnimationActive
            animationDuration={520}
          >
            {formatPointLabel && (
              <LabelList
                dataKey="value"
                position="top"
                offset={10}
                content={(props) => {
                  if (!formatPointLabel) {
                    return null;
                  }
                  const { index, x, y } = props;
                  if (index == null || typeof x !== 'number' || typeof y !== 'number') {
                    return null;
                  }
                  const raw = chartData[index]?.raw;
                  if (!raw) {
                    return null;
                  }
                  const text = formatPointLabel(raw, index);
                  if (!text) {
                    return null;
                  }
          return (
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fill="rgba(var(--txt-primary-rgb) / 0.9)"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {text}
                    </text>
          );
                }}
              />
            )}
          </Area>
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const LineChart = memo(LineChartComponent);
