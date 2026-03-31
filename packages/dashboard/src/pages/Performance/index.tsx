import { useState } from 'react';
import { Col, Row, Typography, Segmented, Tag, Table, Card } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import TrendChart from '@/components/TrendChart';
import DateRangeFilter from '@/components/DateRangeFilter';
import { usePerformance, useApiCalls, useRawEvents } from '@/hooks/useAnalytics';
import { getDefaultDateRange, formatMs, formatDateTime, getVitalRating, VITAL_COLORS } from '@/utils/format';
import { useApp } from '@/contexts/AppContext';
import type { QueryFilters } from '@/types';
import type { RawEventRecord } from '@/api/client';
import type { ColumnsType } from 'antd/es/table';

const VITALS = ['FCP', 'LCP', 'CLS', 'FID', 'TTFB', 'INP'] as const;

function formatVitalValue(name: string, value: number): string {
  if (name === 'CLS') return value.toFixed(3);
  return formatMs(value);
}

const RATING_COLORS: Record<string, string> = {
  good: 'green',
  'needs-improvement': 'orange',
  poor: 'red',
};

const rawPerfColumns: ColumnsType<RawEventRecord> = [
  {
    title: 'Metric',
    key: 'metric_name',
    render: (_: unknown, record: RawEventRecord) => {
      const name = String(record.properties?.metric_name || record.properties?.name || '-');
      return <Tag color="purple">{name}</Tag>;
    },
  },
  {
    title: 'Value',
    key: 'metric_value',
    render: (_: unknown, record: RawEventRecord) => {
      const name = String(record.properties?.metric_name || record.properties?.name || '');
      const value = Number(record.properties?.metric_value ?? record.properties?.value ?? 0);
      if (!value) return '-';
      const rating = getVitalRating(name, value);
      const color = VITAL_COLORS[rating];
      return <span style={{ color, fontWeight: 600 }}>{formatVitalValue(name, value)}</span>;
    },
  },
  {
    title: 'Rating',
    key: 'rating',
    render: (_: unknown, record: RawEventRecord) => {
      const rating = String(record.properties?.rating || '');
      if (!rating) {
        const name = String(record.properties?.metric_name || record.properties?.name || '');
        const value = Number(record.properties?.metric_value ?? record.properties?.value ?? 0);
        if (name && value) {
          const computed = getVitalRating(name, value);
          return <Tag color={RATING_COLORS[computed] || 'default'}>{computed.replace('-', ' ')}</Tag>;
        }
        return '-';
      }
      return <Tag color={RATING_COLORS[rating] || 'default'}>{rating.replace('-', ' ')}</Tag>;
    },
  },
  {
    title: 'Page',
    dataIndex: 'path',
    key: 'path',
    ellipsis: true,
  },
  {
    title: 'User',
    dataIndex: 'user_id',
    key: 'user_id',
    render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
  },
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    render: (v: string) => formatDateTime(v),
  },
];

export default function Performance() {
  const { selectedAppId } = useApp();
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [groupBy, setGroupBy] = useState<'day' | 'hour'>('day');

  const baseFilters: QueryFilters = {
    app_id: selectedAppId ?? '',
    from: dateRange.from,
    to: dateRange.to,
  };

  const perfData = usePerformance({ ...baseFilters, group_by: groupBy });
  const apiData = useApiCalls({ ...baseFilters, group_by: groupBy });
  const rawPerf = useRawEvents({ ...baseFilters, event_type: 'performance', limit: 50 });

  const vitalAverages = VITALS.reduce(
    (acc, vital) => {
      const rows = perfData.data?.data ?? [];
      const total = rows.reduce((s, r) => s + (r.avg_value ?? 0), 0);
      acc[vital] = rows.length > 0 ? total / rows.length : 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  const vitalsBarData = VITALS.filter((v) => vitalAverages[v] > 0).map((name) => ({
    name,
    value: vitalAverages[name],
    fill: VITAL_COLORS[getVitalRating(name, vitalAverages[name])],
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Performance</Typography.Title>
          <Typography.Text type="secondary">{rawPerf.data?.total ?? 0} performance events in period</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Segmented
            options={[{ label: 'Daily', value: 'day' }, { label: 'Hourly', value: 'hour' }]}
            value={groupBy}
            onChange={(v) => setGroupBy(v as 'day' | 'hour')}
          />
          <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(from, to) => setDateRange({ from, to })} />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {VITALS.map((vital) => {
          const value = vitalAverages[vital];
          if (!value) return null;
          const rating = getVitalRating(vital, value);
          return (
            <Col xs={24} sm={12} lg={4} key={vital}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{vital}</Typography.Text>
                  <div style={{ fontSize: 24, fontWeight: 600, color: VITAL_COLORS[rating], marginTop: 4 }}>
                    {formatVitalValue(vital, value)}
                  </div>
                  <Typography.Text style={{ fontSize: 12, color: VITAL_COLORS[rating], textTransform: 'capitalize' }}>
                    {rating.replace('-', ' ')}
                  </Typography.Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TrendChart
            title="Performance Trend (Avg)"
            data={(perfData.data?.data ?? []).map((r) => ({ ...r, avg_value: r.avg_value ?? 0 }))}
            dataKey="avg_value"
            color="#5F5DFF"
            loading={perfData.isLoading}
            valueFormatter={formatMs}
          />
        </Col>
      </Row>

      {vitalsBarData.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Web Vitals Overview" loading={perfData.isLoading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vitalsBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => formatMs(v)} />
                  <YAxis type="category" dataKey="name" width={60} />
                  <RechartsTooltip formatter={(value: number) => [formatMs(value), 'Value']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {vitalsBarData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TrendChart
            title="API Response Time (Avg)"
            data={(apiData.data?.data ?? []).map((r) => ({ ...r, avg_value: r.avg_value ?? 0 }))}
            dataKey="avg_value"
            color="#faad14"
            loading={apiData.isLoading}
            valueFormatter={formatMs}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={`Performance Events (${rawPerf.data?.total ?? 0} total)`}>
            <Table
              columns={rawPerfColumns}
              dataSource={(rawPerf.data?.data ?? []) as RawEventRecord[]}
              loading={rawPerf.isLoading}
              rowKey="id"
              size="small"
              scroll={{ x: 'fit-content' }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              expandable={{
                expandedRowRender: (record: RawEventRecord) => (
                  <div style={{ padding: 12 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Typography.Text strong>Properties</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.properties, null, 2)}
                        </pre>
                      </Col>
                      <Col span={8}>
                        <Typography.Text strong>Metadata</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                      </Col>
                      <Col span={8}>
                        <Typography.Text type="secondary">URL:</Typography.Text> <span style={{ wordBreak: 'break-all' }}>{record.url}</span><br />
                        <Typography.Text type="secondary">User Agent:</Typography.Text> <span style={{ fontSize: 11 }}>{record.user_agent?.substring(0, 150)}</span><br />
                        <Typography.Text type="secondary">Screen:</Typography.Text> {record.screen_resolution}<br />
                        <Typography.Text type="secondary">Viewport:</Typography.Text> {record.viewport_size}<br />
                        <Typography.Text type="secondary">Session:</Typography.Text> <Typography.Text copyable>{record.session_id}</Typography.Text>
                      </Col>
                    </Row>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
