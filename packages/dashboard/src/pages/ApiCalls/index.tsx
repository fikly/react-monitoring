import { useState } from 'react';
import { Col, Row, Typography, Segmented, Tag, Table, Card, Tooltip } from 'antd';
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
import { useApiCalls, useRawEvents } from '@/hooks/useAnalytics';
import { getDefaultDateRange, formatNumber, formatMs, formatDateTime } from '@/utils/format';
import { useApp } from '@/contexts/AppContext';
import type { QueryFilters, MetricRow } from '@/types';
import type { RawEventRecord } from '@/api/client';
import type { ColumnsType } from 'antd/es/table';

const endpointColumns: ColumnsType<MetricRow> = [
  { title: 'Endpoint', dataIndex: 'period', key: 'period', ellipsis: true },
  {
    title: 'Calls',
    dataIndex: 'count',
    key: 'count',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.count - b.count,
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'Avg Response',
    dataIndex: 'avg_value',
    key: 'avg_value',
    sorter: (a, b) => (a.avg_value ?? 0) - (b.avg_value ?? 0),
    render: (v: number | undefined) => {
      if (!v) return '-';
      const color = v > 2000 ? 'red' : v > 1000 ? 'orange' : 'green';
      return <Tag color={color}>{formatMs(v)}</Tag>;
    },
  },
  {
    title: 'P95',
    dataIndex: 'p95_value',
    key: 'p95_value',
    render: (v: number | undefined) => (v ? formatMs(v) : '-'),
  },
  {
    title: 'Sessions',
    dataIndex: 'unique_sessions',
    key: 'unique_sessions',
    render: (v: number) => formatNumber(v),
  },
];

const rawApiColumns: ColumnsType<RawEventRecord> = [
  {
    title: 'Method',
    key: 'method',
    width: 80,
    render: (_: unknown, record: RawEventRecord) => {
      const method = String(record.properties?.method || 'GET');
      const colors: Record<string, string> = { GET: 'blue', POST: 'green', PUT: 'orange', DELETE: 'red', PATCH: 'purple' };
      return <Tag color={colors[method] || 'default'}>{method}</Tag>;
    },
  },
  {
    title: 'URL',
    key: 'url',
    ellipsis: true,
    render: (_: unknown, record: RawEventRecord) => (
      <Tooltip title={String(record.properties?.url || '')}>
        <span>{String(record.properties?.url || '-')}</span>
      </Tooltip>
    ),
  },
  {
    title: 'Status',
    key: 'status',
    width: 80,
    render: (_: unknown, record: RawEventRecord) => {
      const status = Number(record.properties?.status || 0);
      const color = status >= 500 ? 'red' : status >= 400 ? 'orange' : status >= 200 ? 'green' : 'default';
      return status ? <Tag color={color}>{status}</Tag> : '-';
    },
  },
  {
    title: 'Duration',
    key: 'duration',
    width: 100,
    render: (_: unknown, record: RawEventRecord) => {
      const dur = record.properties?.duration_ms as number | undefined;
      if (!dur) return '-';
      const color = dur > 2000 ? '#ff4d4f' : dur > 1000 ? '#faad14' : '#52c41a';
      return <span style={{ color }}>{formatMs(dur)}</span>;
    },
  },
  {
    title: 'Error',
    key: 'is_error',
    width: 70,
    render: (_: unknown, record: RawEventRecord) =>
      record.properties?.is_error ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>,
  },
  {
    title: 'Page',
    dataIndex: 'path',
    key: 'path',
    ellipsis: true,
    width: 150,
  },
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 140,
    render: (v: string) => formatDateTime(v),
  },
];

export default function ApiCalls() {
  const { selectedAppId } = useApp();
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [groupBy, setGroupBy] = useState<'day' | 'hour'>('day');

  const baseFilters: QueryFilters = {
    app_id: selectedAppId!,
    from: dateRange.from,
    to: dateRange.to,
  };

  const trendData = useApiCalls({ ...baseFilters, group_by: groupBy });
  const byPath = useApiCalls({ ...baseFilters, group_by: 'path', limit: 50 });
  const rawApis = useRawEvents({ ...baseFilters, event_type: 'api_call', limit: 50 });

  const totalCalls = trendData.data?.data.reduce((sum, r) => sum + r.count, 0) ?? 0;

  const slowestEndpoints = [...(byPath.data?.data ?? [])]
    .filter((r) => r.avg_value && r.avg_value > 0)
    .sort((a, b) => (b.avg_value ?? 0) - (a.avg_value ?? 0))
    .slice(0, 10)
    .map((r) => ({
      name: r.period.length > 50 ? '...' + r.period.slice(-47) : r.period,
      avg_ms: Math.round(r.avg_value ?? 0),
    }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>API Calls</Typography.Title>
          <Typography.Text type="secondary">{formatNumber(totalCalls)} calls in period</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Segmented options={[{ label: 'Daily', value: 'day' }, { label: 'Hourly', value: 'hour' }]} value={groupBy} onChange={(v) => setGroupBy(v as 'day' | 'hour')} />
          <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(from, to) => setDateRange({ from, to })} />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <TrendChart title="API Calls Trend" data={trendData.data?.data ?? []} color="#5F5DFF" loading={trendData.isLoading} height={350} />
        </Col>
      </Row>

      {slowestEndpoints.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Slowest Endpoints (Avg)" loading={byPath.isLoading}>
              <ResponsiveContainer width="100%" height={Math.max(250, slowestEndpoints.length * 40)}>
                <BarChart data={slowestEndpoints} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => formatMs(v)} />
                  <YAxis type="category" dataKey="name" width={250} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(value: number) => [formatMs(value), 'Avg Response']} />
                  <Bar dataKey="avg_ms" radius={[0, 4, 4, 0]} barSize={20}>
                    {slowestEndpoints.map((entry, i) => (
                      <Cell key={i} fill={entry.avg_ms > 2000 ? '#ff4d4f' : entry.avg_ms > 1000 ? '#faad14' : '#52c41a'} />
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
          <Card title={`API Call Events (${rawApis.data?.total ?? 0} total)`}>
            <Table
              columns={rawApiColumns}
              dataSource={(rawApis.data?.data ?? []) as RawEventRecord[]}
              loading={rawApis.isLoading}
              rowKey="id"
              size="small"
              scroll={{ x: 900 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              expandable={{
                expandedRowRender: (record: RawEventRecord) => (
                  <div style={{ padding: 12 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Typography.Text strong>Properties</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.properties, null, 2)}
                        </pre>
                      </Col>
                      <Col span={12}>
                        <Typography.Text strong>Metadata</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                        <div style={{ marginTop: 8 }}>
                          <Typography.Text type="secondary">Session:</Typography.Text> <Typography.Text copyable>{record.session_id}</Typography.Text><br />
                          <Typography.Text type="secondary">User:</Typography.Text> {record.user_id || 'anonymous'}
                        </div>
                      </Col>
                    </Row>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="All Endpoints">
            <Table columns={endpointColumns} dataSource={byPath.data?.data ?? []} loading={byPath.isLoading} rowKey="period" size="small" pagination={{ pageSize: 15 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
