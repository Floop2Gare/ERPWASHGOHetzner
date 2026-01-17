import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export type BarDatum = {
  label: string;
  value: number;
};

type BarChartProps = {
  data: BarDatum[];
  className?: string;
  height?: number;
  barColors?: string[];
  getTooltip?: (datum: BarDatum, index: number) => string;
  valueFormatter?: (value: number) => string;
};

const compactFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const buildChartData = (data: BarDatum[]) =>
  data.map((item, index) => ({
    category: item.label,
    value: item.value,
    raw: item,
    index,
  }));

const BarChartComponent = ({
  data,
  className,
  height = 260,
  barColors = ['#38bdf8'],
  getTooltip,
  valueFormatter = (value: number) => compactFormatter.format(value),
}: BarChartProps) => {
  const maxValue = useMemo(() => Math.max(...data.map((item) => item.value), 0), [data]);
  const chartData = useMemo(() => buildChartData(data), [data]);
  const yDomain = [0, maxValue * 1.12 || 1];
  const [primaryColor] = barColors;

  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Aucun point à afficher
      </div>
    );
  }

  const axisFormatter = (value: number) => compactFormatter.format(value);

  const CustomTooltip = (props: TooltipProps<ValueType, NameType>) => {
    const { active, payload } = props as TooltipProps<ValueType, NameType> & { payload?: any[] };
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const datumPayload = (payload[0] as any)?.payload as
      | (BarDatum & { category: string; index: number })
      | undefined;
    const label = datumPayload?.label ?? datumPayload?.category ?? '';
    const tooltipValue =
      datumPayload && typeof getTooltip === 'function'
        ? getTooltip(datumPayload, datumPayload.index ?? 0)
        : valueFormatter(Number((payload[0] as any)?.value ?? 0));

    return (
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-[11px] text-slate-300">{tooltipValue}</p>
      </div>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={chartData}
          margin={{ top: 24, right: 8, left: 0, bottom: 12 }}
          barCategoryGap="24%"
          barGap={12}
        >
          <defs>
            <linearGradient id="column-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity={0.95} />
              <stop offset="60%" stopColor={primaryColor} stopOpacity={0.45} />
              <stop offset="100%" stopColor={primaryColor} stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 8" stroke="rgba(var(--txt-muted-rgb) / 0.12)" vertical={false} />
          <XAxis
            dataKey="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', fill: 'rgba(var(--txt-muted-rgb) / 0.65)' }}
            tickMargin={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={36}
            tick={{ fontSize: 10, fill: 'rgba(var(--txt-muted-rgb) / 0.62)' }}
            tickFormatter={axisFormatter}
            domain={yDomain}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }} />
          <Bar
            dataKey="value"
            fill="url(#column-fill)"
            radius={[12, 12, 10, 10]}
            maxBarSize={42}
            animationDuration={480}
          >
            <LabelList
              dataKey="value"
              position="top"
              formatter={valueFormatter}
              fill="rgba(var(--txt-primary-rgb) / 0.9)"
              fontSize={11}
              fontWeight={600}
              offset={8}
            />
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BarChart = memo(BarChartComponent);
