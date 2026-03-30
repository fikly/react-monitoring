import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: ReactNode;
  change?: number;
  loading?: boolean;
}

export default function StatCard({ title, value, suffix, prefix, change, loading }: Props) {
  return (
    <Card>
      <Statistic
        title={title}
        value={value}
        suffix={suffix}
        prefix={prefix}
        loading={loading}
      />
      {change !== undefined && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          {change >= 0 ? (
            <span style={{ color: '#52c41a' }}>
              <ArrowUpOutlined /> {Math.abs(change).toFixed(1)}%
            </span>
          ) : (
            <span style={{ color: '#ff4d4f' }}>
              <ArrowDownOutlined /> {Math.abs(change).toFixed(1)}%
            </span>
          )}
          <span style={{ color: '#8c8c8c', marginLeft: 4 }}>vs previous period</span>
        </div>
      )}
    </Card>
  );
}
