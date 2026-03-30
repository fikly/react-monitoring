import { useState } from 'react';
import { Col, Row, Typography, Segmented, Tag, Table, Card, Tooltip } from 'antd';
import TrendChart from '@/components/TrendChart';
import DateRangeFilter from '@/components/DateRangeFilter';
import { useErrors, useRawEvents } from '@/hooks/useAnalytics';
import { getDefaultDateRange, formatNumber, formatDateTime } from '@/utils/format';
import { useApp } from '@/contexts/AppContext';
import type { QueryFilters, MetricRow } from '@/types';
import type { RawEventRecord } from '@/api/client';
import type { ColumnsType } from 'antd/es/table';

const ERROR_TYPE_COLORS: Record<string, string> = {
  runtime: 'red',
  unhandled_rejection: 'volcano',
  react_boundary: 'magenta',
  api: 'orange',
};

const errorEventsColumns: ColumnsType<RawEventRecord> = [
  {
    title: 'Error Type',
    key: 'error_type',
    width: 140,
    render: (_: unknown, record: RawEventRecord) => {
      const errorType = String(record.properties?.error_type || 'unknown');
      return <Tag color={ERROR_TYPE_COLORS[errorType] || 'default'}>{errorType}</Tag>;
    },
  },
  {
    title: 'Message',
    key: 'message',
    ellipsis: true,
    render: (_: unknown, record: RawEventRecord) => {
      const msg = String(record.properties?.message || '-');
      return (
        <Tooltip title={msg}>
          <Typography.Text>{msg}</Typography.Text>
        </Tooltip>
      );
    },
  },
  {
    title: 'Stack Trace',
    key: 'stack',
    ellipsis: true,
    width: '20%',
    render: (_: unknown, record: RawEventRecord) => {
      const stack = record.properties?.stack as string | undefined;
      if (!stack) return <Typography.Text type="secondary">-</Typography.Text>;
      return (
        <Tooltip title={<pre style={{ fontSize: 10, margin: 0, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{stack}</pre>}>
          <Typography.Text style={{ fontSize: 12 }}>{stack.split('\n')[0]?.substring(0, 80)}</Typography.Text>
        </Tooltip>
      );
    },
  },
  {
    title: 'Page',
    dataIndex: 'path',
    key: 'path',
    ellipsis: true,
    width: 150,
  },
  {
    title: 'User',
    dataIndex: 'user_id',
    key: 'user_id',
    width: 100,
    render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
  },
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 140,
    render: (v: string) => formatDateTime(v),
  },
];

const errorByPageColumns: ColumnsType<MetricRow> = [
  { title: 'Page', dataIndex: 'period', key: 'period', ellipsis: true },
  {
    title: 'Errors',
    dataIndex: 'count',
    key: 'count',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.count - b.count,
    render: (v: number) => <Tag color={v > 100 ? 'red' : v > 10 ? 'orange' : 'default'}>{formatNumber(v)}</Tag>,
  },
  { title: 'Sessions', dataIndex: 'unique_sessions', key: 'unique_sessions', render: (v: number) => formatNumber(v) },
  { title: 'Users', dataIndex: 'unique_users', key: 'unique_users', render: (v: number) => formatNumber(v) },
];

export default function Errors() {
  const { selectedAppId } = useApp();
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [groupBy, setGroupBy] = useState<'day' | 'hour'>('day');

  const baseFilters: QueryFilters = {
    app_id: selectedAppId ?? '',
    from: dateRange.from,
    to: dateRange.to,
  };

  const trendData = useErrors({ ...baseFilters, group_by: groupBy });
  const byPath = useErrors({ ...baseFilters, group_by: 'path', limit: 50 });
  const rawErrors = useRawEvents({ ...baseFilters, event_type: 'error', limit: 50 });

  const totalErrors = trendData.data?.data.reduce((sum, r) => sum + r.count, 0) ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Errors</Typography.Title>
          <Typography.Text type="secondary">
            {totalErrors} total errors in period
            {totalErrors === 0 && ' — This page tracks JavaScript runtime errors, unhandled promise rejections, and React error boundary catches. API HTTP errors (4xx/5xx) are shown in the API Calls page.'}
          </Typography.Text>
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
        <Col span={24}>
          <TrendChart title="Error Trend" data={trendData.data?.data ?? []} color="#ff4d4f" loading={trendData.isLoading} height={350} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={`Error Events (${rawErrors.data?.total ?? 0} total)`}>
            <Table
              columns={errorEventsColumns}
              dataSource={(rawErrors.data?.data ?? []) as RawEventRecord[]}
              loading={rawErrors.isLoading}
              rowKey="id"
              size="small"
              scroll={{ x: 900 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              expandable={{
                expandedRowRender: (record: RawEventRecord) => (
                  <div style={{ padding: 12 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Typography.Text strong>Properties:</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.properties, null, 2)}
                        </pre>
                      </Col>
                      <Col span={12}>
                        <Typography.Text strong>Metadata:</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                        <div style={{ marginTop: 8 }}>
                          <Typography.Text type="secondary">URL:</Typography.Text> <span style={{ wordBreak: 'break-all' }}>{record.url}</span><br />
                          <Typography.Text type="secondary">User Agent:</Typography.Text> <span style={{ fontSize: 11 }}>{record.user_agent?.substring(0, 150)}</span><br />
                          <Typography.Text type="secondary">Session:</Typography.Text> <Typography.Text copyable>{record.session_id}</Typography.Text>
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
          <Card title="Errors by Page">
            <Table columns={errorByPageColumns} dataSource={byPath.data?.data ?? []} loading={byPath.isLoading} rowKey="period" size="small" pagination={{ pageSize: 15 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
