import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export type PieDatum = {
  label: string;
  value: number;
  color?: string;
};

type PieChartProps = {
  data: PieDatum[];
  className?: string;
  height?: number;
  getTooltip?: (datum: PieDatum, index: number) => string;
  valueFormatter?: (value: number) => string;
  colors?: string[];
};

const compactFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const defaultColors = ['#38bdf8', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

const PieChartComponent = ({
  data,
  className,
  height = 300,
  getTooltip,
  valueFormatter = (value: number) => compactFormatter.format(value),
  colors = defaultColors,
}: PieChartProps) => {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: item.label,
      value: item.value,
      color: item.color || colors[index % colors.length],
      raw: item,
      index,
    }));
  }, [data, colors]);

  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Aucun point à afficher
      </div>
    );
  }

  const CustomTooltip = (props: TooltipProps<ValueType, NameType>) => {
    const { active, payload } = props as TooltipProps<ValueType, NameType> & { payload?: any[] };
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const datumPayload = (payload[0] as any)?.payload;
    const label = datumPayload?.name ?? '';
    const value = Number(datumPayload?.value ?? 0);
    const tooltipValue =
      datumPayload?.raw && typeof getTooltip === 'function'
        ? getTooltip(datumPayload.raw, datumPayload.index ?? 0)
        : valueFormatter(value);

    return (
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-[11px] text-slate-300">{tooltipValue}</p>
      </div>
    );
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={height * 0.35}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value, entry: any) => {
              const item = chartData.find((d) => d.name === value);
              const percent = item ? ((item.value / total) * 100).toFixed(1) : '0';
              return `${value} (${percent}%)`;
            }}
            wrapperStyle={{ fontSize: '12px', color: 'rgba(var(--txt-primary-rgb) / 0.8)' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PieChart = memo(PieChartComponent);

