import { Card } from 'antd';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDate, formatNumber } from '@/utils/format';

interface Props {
  title: string;
  data: Array<{ period: string; count: number; [key: string]: unknown }>;
  dataKey?: string;
  color?: string;
  loading?: boolean;
  height?: number;
  valueFormatter?: (value: number) => string;
}

export default function TrendChart({
  title,
  data,
  dataKey = 'count',
  color = '#5F5DFF',
  loading = false,
  height = 300,
  valueFormatter = formatNumber,
}: Props) {
  const chartData = [...data].sort(
    (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime(),
  );

  return (
    <Card title={title} loading={loading}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={valueFormatter}
            tick={{ fontSize: 12 }}
            width={50}
          />
          <Tooltip
            labelFormatter={(v) => formatDate(String(v), 'MMM DD, YYYY')}
            formatter={(value: number) => [valueFormatter(value), title]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${dataKey})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
